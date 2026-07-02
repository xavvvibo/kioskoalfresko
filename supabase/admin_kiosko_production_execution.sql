create extension if not exists pgcrypto;

-- Ejecucion transaccional de produccion interna APPCC.
-- No borra datos. La funcion RPC valida stock FEFO completo antes de consumir.

alter table if exists public.admin_production_batches
  add column if not exists recipe_id uuid,
  add column if not exists ingredients_json jsonb default '[]'::jsonb,
  add column if not exists allergens_json jsonb default '[]'::jsonb,
  add column if not exists consumed_lots_json jsonb default '[]'::jsonb,
  add column if not exists output_inventory_lot_id uuid,
  add column if not exists label_preview_json jsonb default '{}'::jsonb;

alter table if exists public.admin_inventory_lots
  add column if not exists production_batch_id uuid,
  add column if not exists is_internal_production boolean default false,
  add column if not exists source_inventory_lot_ids uuid[] default '{}'::uuid[];

alter table if exists public.admin_inventory_products
  add column if not exists recommended_stock numeric default 0,
  add column if not exists product_family text,
  add column if not exists accounting_category text,
  add column if not exists storage_temperature text,
  add column if not exists default_location text,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default false,
  add column if not exists generates_inventory_lot boolean default false;

alter table if exists public.admin_inventory_lots
  add column if not exists normalized_product_id uuid,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default false,
  add column if not exists generates_inventory_lot boolean default false,
  add column if not exists product_family text,
  add column if not exists accounting_category text,
  add column if not exists storage_temperature text,
  add column if not exists default_location text;

create table if not exists public.admin_traceability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_date date,
  event_type text not null,
  product_id uuid,
  product_name text,
  inventory_lot_id uuid,
  production_batch_id uuid,
  batch_code text,
  source_table text,
  source_record_id uuid,
  related_record_type text,
  related_record_id uuid,
  quantity numeric,
  unit text,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  source text default 'admin-kiosko-production'
);

alter table if exists public.admin_traceability_events enable row level security;
revoke all on public.admin_traceability_events from anon, authenticated;
grant all on public.admin_traceability_events to service_role;

drop policy if exists "admin_traceability_events_service_role_all" on public.admin_traceability_events;
create policy "admin_traceability_events_service_role_all"
  on public.admin_traceability_events
  for all
  to service_role
  using (true)
  with check (true);

do $$
begin
  if to_regclass('public.admin_production_batches') is not null then
    create index if not exists admin_production_batches_recipe_idx on public.admin_production_batches (recipe_id);
    create index if not exists admin_production_batches_output_lot_idx on public.admin_production_batches (output_inventory_lot_id);
  end if;

  if to_regclass('public.admin_inventory_lots') is not null then
    create index if not exists admin_inventory_lots_production_batch_idx on public.admin_inventory_lots (production_batch_id);
    create index if not exists admin_inventory_lots_internal_production_idx on public.admin_inventory_lots (is_internal_production, status);
  end if;

  if to_regclass('public.admin_traceability_events') is not null then
    create index if not exists admin_traceability_events_date_idx on public.admin_traceability_events (event_date desc, created_at desc);
    create index if not exists admin_traceability_events_lot_idx on public.admin_traceability_events (inventory_lot_id);
    create index if not exists admin_traceability_events_batch_idx on public.admin_traceability_events (production_batch_id);
    create index if not exists admin_traceability_events_product_idx on public.admin_traceability_events (product_id);
    create index if not exists admin_traceability_events_type_idx on public.admin_traceability_events (event_type);
    create index if not exists admin_traceability_events_payload_idx on public.admin_traceability_events using gin (payload);
  end if;
end $$;

create or replace function public.admin_make_production_batch_code(p_output_product text, p_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_compact_date text := to_char(p_date, 'YYYYMMDD');
  v_sequence integer;
begin
  select string_agg(upper(left(word, 1)), '')
  into v_prefix
  from regexp_split_to_table(coalesce(p_output_product, 'KA'), '[^A-Za-z0-9]+') as word
  where length(word) > 0;

  v_prefix := nullif(left(regexp_replace(coalesce(v_prefix, ''), '[^A-Z0-9]', '', 'g'), 4), '');
  if v_prefix is null then
    v_prefix := left(upper(regexp_replace(coalesce(p_output_product, 'KA'), '[^A-Za-z0-9]', '', 'g')), 3);
  end if;
  if v_prefix is null or v_prefix = '' then
    v_prefix := 'KA';
  end if;

  select count(*) + 1
  into v_sequence
  from public.admin_production_batches
  where batch_code ilike v_prefix || '-' || v_compact_date || '-%';

  return v_prefix || '-' || v_compact_date || '-' || lpad(v_sequence::text, 3, '0');
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_rebuild_inventory_cache'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute $fn$
      create function public.admin_rebuild_inventory_cache()
      returns jsonb
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        return jsonb_build_object('products_rebuilt', 0, 'warning', 'admin_kiosko_inventory_activation.sql not applied');
      end
      $body$
    $fn$;
  end if;
end $$;

create or replace function public.admin_execute_production_batch(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe_id uuid := nullif(p_payload->>'recipe_id', '')::uuid;
  v_production_date date := coalesce(nullif(p_payload->>'production_date', '')::date, current_date);
  v_production_time time := nullif(p_payload->>'production_time', '')::time;
  v_responsible text := nullif(p_payload->>'responsible', '');
  v_output_product text := nullif(p_payload->>'output_product', '');
  v_output_quantity numeric := coalesce(nullif(p_payload->>'output_quantity', '')::numeric, 0);
  v_output_unit text := coalesce(nullif(p_payload->>'output_unit', ''), 'ud');
  v_unit_weight numeric := nullif(p_payload->>'unit_weight', '')::numeric;
  v_storage_state text := coalesce(nullif(p_payload->>'storage_state', ''), 'refrigerado');
  v_expiry_date date := nullif(p_payload->>'expiry_date', '')::date;
  v_observations text := nullif(p_payload->>'observations', '');
  v_ingredients jsonb := coalesce(p_payload->'ingredients', '[]'::jsonb);
  v_allergens jsonb := coalesce(p_payload->'allergens', '[]'::jsonb);
  v_label_preview jsonb := coalesce(p_payload->'label_preview', '{}'::jsonb);
  v_batch_code text;
  v_batch_id uuid;
  v_output_product_id uuid;
  v_output_lot_id uuid;
  v_ingredient jsonb;
  v_lot record;
  v_required numeric;
  v_remaining numeric;
  v_consume numeric;
  v_total_available numeric;
  v_consumed_lots jsonb := '[]'::jsonb;
  v_source_product_name text;
  v_source_batch text;
begin
  if v_output_product is null or v_output_quantity <= 0 then
    raise exception 'Producción no válida: falta producto resultante o cantidad.';
  end if;

  if jsonb_array_length(v_ingredients) = 0 then
    raise exception 'Producción no válida: no hay ingredientes planificados.';
  end if;

  for v_ingredient in select * from jsonb_array_elements(v_ingredients)
  loop
    v_required := coalesce(nullif(v_ingredient->>'required_quantity', '')::numeric, 0);
    if nullif(v_ingredient->>'product_id', '') is null then
      raise exception 'Ingrediente % sin producto de inventario vinculado.', coalesce(v_ingredient->>'product_name', 'sin nombre');
    end if;
    if v_required <= 0 then
      raise exception 'Ingrediente % sin cantidad requerida válida.', coalesce(v_ingredient->>'product_name', 'sin nombre');
    end if;

    select coalesce(sum(current_quantity), 0)
    into v_total_available
    from public.admin_inventory_lots
    where product_id = nullif(v_ingredient->>'product_id', '')::uuid
      and status = 'activo'
      and coalesce(current_quantity, 0) > 0;

    if v_total_available < v_required then
      raise exception 'Stock insuficiente para %. Disponible %, requerido %.',
        coalesce(v_ingredient->>'product_name', 'ingrediente'), v_total_available, v_required;
    end if;
  end loop;

  v_batch_code := public.admin_make_production_batch_code(v_output_product, v_production_date);

  select id into v_output_product_id
  from public.admin_inventory_products
  where regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g') = regexp_replace(lower(v_output_product), '[^a-z0-9]+', ' ', 'g')
  order by created_at asc
  limit 1;

  if v_output_product_id is null then
    insert into public.admin_inventory_products (
      name,
      category,
      usual_supplier,
      unit,
      current_stock,
      minimum_stock,
      recommended_stock,
      location,
      current_batch,
      expiry_date,
      product_family,
      accounting_category,
      storage_temperature,
      default_location,
      requires_traceability,
      requires_appcc_reception,
      generates_inventory_lot,
      observations,
      active
    )
    values (
      v_output_product,
      'Elaboración interna',
      'Producción interna',
      v_output_unit,
      0,
      0,
      v_output_quantity,
      case when v_storage_state = 'congelado' then 'Congelador' else 'Cocina' end,
      v_batch_code,
      v_expiry_date,
      'production',
      'elaboración interna',
      v_storage_state,
      case when v_storage_state = 'congelado' then 'Congelador' else 'Cocina' end,
      true,
      true,
      true,
      'Producto creado desde producción interna transaccional.',
      true
    )
    returning id into v_output_product_id;
  end if;

  insert into public.admin_production_batches (
    recipe_id,
    production_date,
    production_time,
    responsible,
    batch_code,
    source_supplier,
    source_product,
    source_batch_number,
    input_quantity,
    input_unit,
    output_product,
    output_quantity,
    output_unit,
    unit_weight,
    storage_state,
    expiry_date,
    observations,
    source,
    ingredients_json,
    allergens_json,
    label_preview_json
  )
  values (
    v_recipe_id,
    v_production_date,
    v_production_time,
    v_responsible,
    v_batch_code,
    'Producción interna',
    (v_ingredients->0)->>'product_name',
    null,
    nullif((v_ingredients->0)->>'required_quantity', '')::numeric,
    (v_ingredients->0)->>'unit',
    v_output_product,
    v_output_quantity,
    v_output_unit,
    v_unit_weight,
    v_storage_state,
    v_expiry_date,
    v_observations,
    'admin-kiosko-production-transaction',
    v_ingredients,
    v_allergens,
    v_label_preview
  )
  returning id into v_batch_id;

  for v_ingredient in select * from jsonb_array_elements(v_ingredients)
  loop
    v_remaining := coalesce(nullif(v_ingredient->>'required_quantity', '')::numeric, 0);

    for v_lot in
      select *
      from public.admin_inventory_lots
      where product_id = nullif(v_ingredient->>'product_id', '')::uuid
        and status = 'activo'
        and coalesce(current_quantity, 0) > 0
      order by expiry_date asc nulls last, received_date asc nulls last, created_at asc
      for update
    loop
      exit when v_remaining <= 0;
      v_consume := least(v_remaining, coalesce(v_lot.current_quantity, 0));

      update public.admin_inventory_lots
      set
        updated_at = now(),
        current_quantity = current_quantity - v_consume,
        status = case when current_quantity - v_consume <= 0 then 'agotado' else status end
      where id = v_lot.id;

      insert into public.admin_inventory_lot_movements (
        lot_id,
        product_id,
        movement_type,
        movement_date,
        movement_time,
        quantity,
        unit,
        from_location,
        reason,
        responsible,
        related_record_type,
        related_record_id,
        observations
      )
      values (
        v_lot.id,
        v_lot.product_id,
        'consumo',
        v_production_date,
        v_production_time,
        v_consume,
        coalesce(v_ingredient->>'unit', v_lot.unit),
        v_lot.location,
        'Consumo FEFO por producción interna',
        v_responsible,
        'admin_production_batches',
        v_batch_id,
        'Consumo FEFO para lote interno ' || v_batch_code
      );

      insert into public.admin_traceability_events (
        event_date,
        event_type,
        product_id,
        product_name,
        inventory_lot_id,
        production_batch_id,
        batch_code,
        source_table,
        source_record_id,
        related_record_type,
        related_record_id,
        quantity,
        unit,
        detail,
        payload
      )
      values (
        v_production_date,
        'production_input_consumed',
        v_lot.product_id,
        coalesce(v_lot.product_name, v_ingredient->>'product_name'),
        v_lot.id,
        v_batch_id,
        v_batch_code,
        'admin_inventory_lots',
        v_lot.id,
        'admin_production_batches',
        v_batch_id,
        v_consume,
        coalesce(v_ingredient->>'unit', v_lot.unit),
        'Ingrediente consumido por FEFO',
        jsonb_build_object('ingredient', v_ingredient, 'source_lot', v_lot.batch_number)
      );

      v_consumed_lots := v_consumed_lots || jsonb_build_array(jsonb_build_object(
        'lot_id', v_lot.id,
        'product_id', v_lot.product_id,
        'product_name', coalesce(v_lot.product_name, v_ingredient->>'product_name'),
        'batch_number', v_lot.batch_number,
        'quantity', v_consume,
        'unit', coalesce(v_ingredient->>'unit', v_lot.unit),
        'supplier', v_lot.supplier_name,
        'expiry_date', v_lot.expiry_date
      ));

      v_remaining := v_remaining - v_consume;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stock FEFO inconsistente para %. Falta % tras bloquear lotes.',
        coalesce(v_ingredient->>'product_name', 'ingrediente'), v_remaining;
    end if;
  end loop;

  select product_name, batch_number
  into v_source_product_name, v_source_batch
  from jsonb_to_recordset(v_consumed_lots) as x(product_name text, batch_number text, quantity numeric)
  order by quantity desc
  limit 1;

  insert into public.admin_inventory_lots (
    product_id,
    normalized_product_id,
    product_name,
    supplier_name,
    batch_number,
    expiry_date,
    received_date,
    initial_quantity,
    current_quantity,
    unit,
    location,
    status,
    requires_traceability,
    requires_appcc_reception,
    generates_inventory_lot,
    product_family,
    accounting_category,
    storage_temperature,
    default_location,
    production_batch_id,
    is_internal_production,
    source_inventory_lot_ids,
    observations,
    source
  )
  values (
    v_output_product_id,
    v_output_product_id,
    v_output_product,
    'Producción interna',
    v_batch_code,
    v_expiry_date,
    v_production_date,
    v_output_quantity,
    v_output_quantity,
    v_output_unit,
    case when v_storage_state = 'congelado' then 'Congelador' else 'Cocina' end,
    'activo',
    true,
    true,
    true,
    'production',
    'elaboración interna',
    v_storage_state,
    case when v_storage_state = 'congelado' then 'Congelador' else 'Cocina' end,
    v_batch_id,
    true,
    coalesce((select array_agg((item->>'lot_id')::uuid) from jsonb_array_elements(v_consumed_lots) item), '{}'::uuid[]),
    'Lote interno generado por producción transaccional.',
    'admin-kiosko-production-transaction'
  )
  returning id into v_output_lot_id;

  insert into public.admin_inventory_lot_movements (
    lot_id,
    product_id,
    movement_type,
    movement_date,
    movement_time,
    quantity,
    unit,
    to_location,
    reason,
    responsible,
    related_record_type,
    related_record_id,
    observations
  )
  values (
    v_output_lot_id,
    v_output_product_id,
    'entrada',
    v_production_date,
    v_production_time,
    v_output_quantity,
    v_output_unit,
    case when v_storage_state = 'congelado' then 'Congelador' else 'Cocina' end,
    'Entrada de lote interno producido',
    v_responsible,
    'admin_production_batches',
    v_batch_id,
    'Entrada de producto elaborado ' || v_batch_code
  );

  insert into public.admin_production_movements (
    batch_id,
    movement_date,
    movement_time,
    movement_type,
    quantity,
    unit,
    from_state,
    to_state,
    reason,
    responsible,
    observations
  )
  values (
    v_batch_id,
    v_production_date,
    v_production_time,
    'produccion',
    v_output_quantity,
    v_output_unit,
    'materia prima FEFO',
    v_storage_state,
    'Producción interna transaccional',
    v_responsible,
    v_observations
  );

  update public.admin_production_batches
  set
    output_inventory_lot_id = v_output_lot_id,
    consumed_lots_json = v_consumed_lots,
    source_product = coalesce(v_source_product_name, source_product),
    source_batch_number = coalesce(v_source_batch, source_batch_number)
  where id = v_batch_id;

  insert into public.admin_traceability_events (
    event_date,
    event_type,
    product_id,
    product_name,
    inventory_lot_id,
    production_batch_id,
    batch_code,
    source_table,
    source_record_id,
    quantity,
    unit,
    detail,
    payload
  )
  values (
    v_production_date,
    'finished_product_lot_created',
    v_output_product_id,
    v_output_product,
    v_output_lot_id,
    v_batch_id,
    v_batch_code,
    'admin_production_batches',
    v_batch_id,
    v_output_quantity,
    v_output_unit,
    'Lote interno generado desde producción',
    jsonb_build_object('ingredients', v_ingredients, 'consumed_lots', v_consumed_lots, 'label_preview', v_label_preview)
  );

  perform public.admin_rebuild_inventory_cache();

  return jsonb_build_object(
    'production_batch_id', v_batch_id,
    'batch_code', v_batch_code,
    'output_inventory_lot_id', v_output_lot_id,
    'output_product_id', v_output_product_id,
    'output_product', v_output_product,
    'output_quantity', v_output_quantity,
    'output_unit', v_output_unit,
    'expiry_date', v_expiry_date,
    'consumed_lots', v_consumed_lots,
    'label_preview', v_label_preview || jsonb_build_object(
      'product', v_output_product,
      'batch', v_batch_code,
      'expiry_date', v_expiry_date,
      'production_date', v_production_date,
      'inventory_lot_id', v_output_lot_id
    )
  );
end $$;

grant execute on function public.admin_make_production_batch_code(text, date) to service_role;
grant execute on function public.admin_execute_production_batch(jsonb) to service_role;

comment on function public.admin_execute_production_batch(jsonb) is 'Ejecuta produccion interna de forma transaccional: valida FEFO, consume lotes, crea lote interno, movimientos y trazabilidad.';
