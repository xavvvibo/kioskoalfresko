create extension if not exists pgcrypto;

-- Activacion idempotente de stock real desde compras historicas revisadas.
-- Ejecutar despues de:
--   1. supabase/admin_kiosko_accounting.sql
--   2. supabase/admin_kiosko_operations.sql
--   3. supabase/admin_kiosko_inventory_lots.sql
--   4. supabase/admin_kiosko_purchase_core.sql
--   5. supabase/seeds/generated/admin_kiosko_initial_purchases_generated.sql

alter table if exists public.admin_accounting_document_items
  add column if not exists purchase_document_id uuid,
  add column if not exists purchase_line_id uuid,
  add column if not exists normalized_product_id uuid,
  add column if not exists inventory_product_id uuid,
  add column if not exists gtin text,
  add column if not exists ean text,
  add column if not exists manufacturer_lot text,
  add column if not exists origin_country text,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default false,
  add column if not exists generates_inventory_lot boolean default false,
  add column if not exists accounting_category text,
  add column if not exists product_family text,
  add column if not exists storage_temperature text,
  add column if not exists default_location text;

alter table if exists public.admin_inventory_products
  add column if not exists normalized_product_id uuid,
  add column if not exists gtin text,
  add column if not exists ean text,
  add column if not exists product_family text,
  add column if not exists accounting_category text,
  add column if not exists storage_temperature text,
  add column if not exists default_location text,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default false,
  add column if not exists generates_inventory_lot boolean default false;

alter table if exists public.admin_inventory_lots
  add column if not exists purchase_document_id uuid,
  add column if not exists purchase_line_id uuid,
  add column if not exists normalized_supplier_id uuid,
  add column if not exists normalized_product_id uuid,
  add column if not exists gtin text,
  add column if not exists ean text,
  add column if not exists manufacturer_lot text,
  add column if not exists origin_country text,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default false,
  add column if not exists generates_inventory_lot boolean default true,
  add column if not exists accounting_category text,
  add column if not exists product_family text,
  add column if not exists storage_temperature text,
  add column if not exists default_location text;

alter table if exists public.admin_inventory_lot_movements
  add column if not exists purchase_document_id uuid,
  add column if not exists purchase_line_id uuid,
  add column if not exists source_document_id uuid;

alter table if exists public.admin_goods_reception_records
  add column if not exists purchase_document_id uuid,
  add column if not exists purchase_line_id uuid,
  add column if not exists normalized_supplier_id uuid,
  add column if not exists normalized_product_id uuid,
  add column if not exists gtin text,
  add column if not exists ean text,
  add column if not exists manufacturer_lot text,
  add column if not exists origin_country text,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default true,
  add column if not exists generates_inventory_lot boolean default false,
  add column if not exists storage_temperature text,
  add column if not exists default_location text;

do $$
begin
  if to_regclass('public.admin_accounting_document_items') is not null then
    create index if not exists admin_accounting_items_activation_idx
      on public.admin_accounting_document_items (purchase_document_id, purchase_line_id, generates_inventory_lot);
  end if;

  if to_regclass('public.admin_inventory_lots') is not null then
    create index if not exists admin_inventory_lots_activation_line_idx
      on public.admin_inventory_lots (purchase_document_id, purchase_line_id);
    create index if not exists admin_inventory_lots_activation_ready_idx
      on public.admin_inventory_lots (status, current_quantity, expiry_date, product_id);
  end if;

  if to_regclass('public.admin_inventory_lot_movements') is not null then
    create index if not exists admin_inventory_lot_movements_activation_idx
      on public.admin_inventory_lot_movements (lot_id, purchase_document_id, purchase_line_id, movement_type);
  end if;
end $$;

create or replace function public.admin_rebuild_inventory_cache()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_products_rebuilt integer := 0;
begin
  if to_regclass('public.admin_inventory_products') is null
     or to_regclass('public.admin_inventory_lots') is null then
    return jsonb_build_object('products_rebuilt', 0, 'warning', 'inventory tables not found');
  end if;

  with lot_summary as (
    select
      p.id as product_id,
      coalesce(sum(case when l.status = 'activo' then coalesce(l.current_quantity, 0) else 0 end), 0) as current_stock,
      (
        array_agg(l.batch_number order by l.expiry_date asc nulls last, l.received_date asc nulls last, l.created_at asc)
        filter (where l.status = 'activo' and coalesce(l.current_quantity, 0) > 0)
      )[1] as fefo_batch,
      (
        array_agg(l.expiry_date order by l.expiry_date asc nulls last, l.received_date asc nulls last, l.created_at asc)
        filter (where l.status = 'activo' and coalesce(l.current_quantity, 0) > 0)
      )[1] as fefo_expiry,
      (
        array_agg(l.location order by l.expiry_date asc nulls last, l.received_date asc nulls last, l.created_at asc)
        filter (where l.status = 'activo' and coalesce(l.current_quantity, 0) > 0)
      )[1] as fefo_location,
      max(l.received_date) as last_entry_date,
      (
        array_agg(l.supplier_name order by l.received_date desc nulls last, l.created_at desc)
        filter (where l.supplier_name is not null)
      )[1] as usual_supplier,
      (
        array_agg(l.purchase_price order by l.received_date desc nulls last, l.created_at desc)
        filter (where l.purchase_price is not null)
      )[1] as last_purchase_price,
      avg(l.average_unit_cost) filter (where l.average_unit_cost is not null) as average_purchase_price
    from public.admin_inventory_products p
    left join public.admin_inventory_lots l on l.product_id = p.id
    group by p.id
  )
  update public.admin_inventory_products p
  set
    updated_at = now(),
    current_stock = lot_summary.current_stock,
    current_batch = lot_summary.fefo_batch,
    expiry_date = lot_summary.fefo_expiry,
    location = coalesce(lot_summary.fefo_location, p.location),
    last_entry_date = coalesce(lot_summary.last_entry_date, p.last_entry_date),
    usual_supplier = coalesce(lot_summary.usual_supplier, p.usual_supplier),
    last_purchase_price = coalesce(lot_summary.last_purchase_price, p.last_purchase_price),
    average_purchase_price = coalesce(lot_summary.average_purchase_price, p.average_purchase_price),
    active = true
  from lot_summary
  where p.id = lot_summary.product_id;

  get diagnostics v_products_rebuilt = row_count;

  return jsonb_build_object('products_rebuilt', v_products_rebuilt);
end $$;

create or replace function public.admin_activate_historical_stock()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_products_created integer := 0;
  v_lines_linked integer := 0;
  v_lots_created integer := 0;
  v_movements_created integer := 0;
  v_receptions_created integer := 0;
  v_cache jsonb;
begin
  if to_regclass('public.admin_accounting_documents') is null
     or to_regclass('public.admin_accounting_document_items') is null
     or to_regclass('public.admin_inventory_products') is null
     or to_regclass('public.admin_inventory_lots') is null
     or to_regclass('public.admin_inventory_lot_movements') is null then
    return jsonb_build_object('error', 'required tables not found');
  end if;

  update public.admin_accounting_document_items
  set purchase_line_id = gen_random_uuid()
  where purchase_line_id is null
    and product_name is not null;

  with source_lines as (
    select distinct on (
      coalesce(nullif(regexp_replace(coalesce(adi.gtin, ''), '\D', '', 'g'), ''),
               nullif(regexp_replace(coalesce(adi.ean, ''), '\D', '', 'g'), ''),
               regexp_replace(lower(coalesce(adi.product_name, '')), '[^a-z0-9]+', ' ', 'g'))
    )
      adi.*
    from public.admin_accounting_document_items adi
    where adi.product_name is not null
      and coalesce(adi.quantity, 0) > 0
      and coalesce(adi.generates_inventory_lot, false) is true
  )
  insert into public.admin_inventory_products (
    name,
    category,
    usual_supplier,
    unit,
    current_stock,
    minimum_stock,
    recommended_stock,
    average_purchase_price,
    last_purchase_price,
    location,
    gtin,
    ean,
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
  select
    sl.product_name,
    coalesce(sl.product_family, 'other'),
    ad.supplier_name,
    coalesce(sl.unit, 'ud'),
    0,
    0,
    0,
    case when coalesce(sl.quantity, 0) <> 0 then sl.total_amount / sl.quantity else sl.unit_price end,
    case when coalesce(sl.quantity, 0) <> 0 then sl.total_amount / sl.quantity else sl.unit_price end,
    coalesce(sl.default_location, 'Almacén'),
    nullif(regexp_replace(coalesce(sl.gtin, ''), '\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(sl.ean, ''), '\D', '', 'g'), ''),
    coalesce(sl.product_family, 'other'),
    coalesce(sl.accounting_category, 'compras explotación'),
    sl.storage_temperature,
    sl.default_location,
    coalesce(sl.requires_traceability, false),
    coalesce(sl.requires_appcc_reception, false),
    coalesce(sl.generates_inventory_lot, false),
    'Producto activado desde compras históricas revisadas.',
    true
  from source_lines sl
  left join public.admin_accounting_documents ad
    on ad.id = coalesce(sl.purchase_document_id, sl.accounting_document_id)
  where not exists (
    select 1
    from public.admin_inventory_products p
    where (
      nullif(regexp_replace(coalesce(sl.gtin, ''), '\D', '', 'g'), '') is not null
      and p.gtin = regexp_replace(coalesce(sl.gtin, ''), '\D', '', 'g')
    )
    or (
      nullif(regexp_replace(coalesce(sl.ean, ''), '\D', '', 'g'), '') is not null
      and p.ean = regexp_replace(coalesce(sl.ean, ''), '\D', '', 'g')
    )
    or regexp_replace(lower(p.name), '[^a-z0-9]+', ' ', 'g') = regexp_replace(lower(sl.product_name), '[^a-z0-9]+', ' ', 'g')
  );

  get diagnostics v_products_created = row_count;

  update public.admin_accounting_document_items adi
  set
    normalized_product_id = p.id,
    inventory_product_id = p.id
  from public.admin_inventory_products p
  where adi.product_name is not null
    and (adi.normalized_product_id is null or adi.inventory_product_id is null)
    and (
      (
        nullif(regexp_replace(coalesce(adi.gtin, ''), '\D', '', 'g'), '') is not null
        and p.gtin = regexp_replace(coalesce(adi.gtin, ''), '\D', '', 'g')
      )
      or (
        nullif(regexp_replace(coalesce(adi.ean, ''), '\D', '', 'g'), '') is not null
        and p.ean = regexp_replace(coalesce(adi.ean, ''), '\D', '', 'g')
      )
      or regexp_replace(lower(p.name), '[^a-z0-9]+', ' ', 'g') = regexp_replace(lower(adi.product_name), '[^a-z0-9]+', ' ', 'g')
    );

  get diagnostics v_lines_linked = row_count;

  with eligible_lines as (
    select
      ad.id as purchase_document_id,
      ad.supplier_id,
      coalesce(ad.normalized_supplier_id, ad.supplier_id) as normalized_supplier_id,
      ad.supplier_name,
      ad.document_type,
      ad.document_number,
      ad.document_date,
      adi.purchase_line_id,
      coalesce(adi.normalized_product_id, adi.inventory_product_id) as product_id,
      adi.product_name,
      adi.quantity,
      adi.unit,
      adi.total_amount,
      adi.unit_price,
      adi.gtin,
      adi.ean,
      coalesce(nullif(adi.manufacturer_lot, ''), nullif(adi.batch_number, '')) as manufacturer_lot,
      adi.origin_country,
      adi.expiry_date,
      adi.requires_traceability,
      adi.requires_appcc_reception,
      adi.generates_inventory_lot,
      adi.accounting_category,
      adi.product_family,
      adi.storage_temperature,
      adi.default_location
    from public.admin_accounting_document_items adi
    join public.admin_accounting_documents ad
      on ad.id = coalesce(adi.purchase_document_id, adi.accounting_document_id)
    where coalesce(adi.generates_inventory_lot, false) is true
      and coalesce(adi.quantity, 0) > 0
      and coalesce(ad.total_amount, 0) >= 0
      and coalesce(ad.document_type, '') not in ('credit_note', 'refund', 'return', 'rectifying_invoice')
      and coalesce(adi.normalized_product_id, adi.inventory_product_id) is not null
  ),
  normalized_lines as (
    select
      el.*,
      coalesce(
        el.manufacturer_lot,
        'INIT-' || to_char(el.document_date, 'YYYYMMDD') || '-' ||
        upper(regexp_replace(left(coalesce(el.supplier_name, 'SUPPLIER'), 12), '[^A-Za-z0-9]+', '', 'g')) || '-' ||
        upper(regexp_replace(left(coalesce(el.product_name, 'PRODUCT'), 12), '[^A-Za-z0-9]+', '', 'g'))
      ) as lot_code,
      case when coalesce(el.quantity, 0) <> 0 then el.total_amount / el.quantity else el.unit_price end as unit_cost
    from eligible_lines el
  )
  insert into public.admin_inventory_lots (
    product_id,
    normalized_product_id,
    product_name,
    supplier_id,
    normalized_supplier_id,
    supplier_name,
    purchase_document_id,
    purchase_line_id,
    batch_number,
    manufacturer_lot,
    origin_country,
    expiry_date,
    received_date,
    initial_quantity,
    current_quantity,
    unit,
    location,
    purchase_price,
    average_unit_cost,
    status,
    requires_traceability,
    requires_appcc_reception,
    generates_inventory_lot,
    accounting_category,
    product_family,
    storage_temperature,
    default_location,
    observations,
    source
  )
  select
    nl.product_id,
    nl.product_id,
    nl.product_name,
    nl.supplier_id,
    nl.normalized_supplier_id,
    nl.supplier_name,
    nl.purchase_document_id,
    nl.purchase_line_id,
    nl.lot_code,
    nl.manufacturer_lot,
    nl.origin_country,
    nl.expiry_date,
    nl.document_date,
    nl.quantity,
    nl.quantity,
    coalesce(nl.unit, 'ud'),
    coalesce(nl.default_location, 'Almacén'),
    nl.unit_cost,
    nl.unit_cost,
    'activo',
    coalesce(nl.requires_traceability, false),
    coalesce(nl.requires_appcc_reception, false),
    true,
    coalesce(nl.accounting_category, 'compras explotación'),
    coalesce(nl.product_family, 'other'),
    nl.storage_temperature,
    nl.default_location,
    'Stock inicial activado desde compra histórica revisada.',
    'admin-kiosko-historical-activation'
  from normalized_lines nl
  where not exists (
    select 1
    from public.admin_inventory_lots lot
    where lot.purchase_document_id = nl.purchase_document_id
      and lot.purchase_line_id = nl.purchase_line_id
  )
  and not exists (
    select 1
    from public.admin_inventory_lots lot
    where lot.product_id = nl.product_id
      and lot.batch_number = nl.lot_code
      and lot.purchase_document_id = nl.purchase_document_id
  );

  get diagnostics v_lots_created = row_count;

  insert into public.admin_inventory_lot_movements (
    lot_id,
    product_id,
    purchase_document_id,
    purchase_line_id,
    movement_type,
    movement_date,
    quantity,
    unit,
    to_location,
    reason,
    responsible,
    related_record_type,
    related_record_id,
    observations
  )
  select
    lot.id,
    lot.product_id,
    lot.purchase_document_id,
    lot.purchase_line_id,
    'entrada',
    lot.received_date,
    lot.initial_quantity,
    lot.unit,
    lot.location,
    'Activación de stock histórico revisado',
    'Sistema',
    'admin_accounting_documents',
    lot.purchase_document_id,
    'Entrada inicial creada desde compras históricas revisadas.'
  from public.admin_inventory_lots lot
  where lot.source = 'admin-kiosko-historical-activation'
    and coalesce(lot.initial_quantity, 0) > 0
    and not exists (
      select 1
      from public.admin_inventory_lot_movements m
      where m.lot_id = lot.id
        and m.purchase_document_id = lot.purchase_document_id
        and m.purchase_line_id = lot.purchase_line_id
        and m.movement_type = 'entrada'
    );

  get diagnostics v_movements_created = row_count;

  if to_regclass('public.admin_goods_reception_records') is not null then
    insert into public.admin_goods_reception_records (
      record_date,
      supplier,
      product,
      batch_number,
      expiry_date,
      accepted,
      status,
      observations,
      purchase_document_id,
      purchase_line_id,
      normalized_supplier_id,
      normalized_product_id,
      manufacturer_lot,
      origin_country,
      requires_traceability,
      requires_appcc_reception,
      generates_inventory_lot,
      storage_temperature,
      default_location,
      source
    )
    select
      lot.received_date,
      lot.supplier_name,
      lot.product_name,
      lot.batch_number,
      lot.expiry_date,
      true,
      'correcto',
      'Recepción APPCC creada desde activación de stock histórico revisado.',
      lot.purchase_document_id,
      lot.purchase_line_id,
      lot.normalized_supplier_id,
      lot.product_id,
      lot.manufacturer_lot,
      lot.origin_country,
      lot.requires_traceability,
      true,
      lot.generates_inventory_lot,
      lot.storage_temperature,
      lot.default_location,
      'admin-kiosko-historical-activation'
    from public.admin_inventory_lots lot
    where lot.source = 'admin-kiosko-historical-activation'
      and lot.requires_appcc_reception is true
      and not exists (
        select 1
        from public.admin_goods_reception_records gr
        where gr.purchase_document_id = lot.purchase_document_id
          and gr.purchase_line_id = lot.purchase_line_id
      );

    get diagnostics v_receptions_created = row_count;
  end if;

  v_cache := public.admin_rebuild_inventory_cache();

  return jsonb_build_object(
    'products_created', v_products_created,
    'lines_linked', v_lines_linked,
    'lots_created', v_lots_created,
    'movements_created', v_movements_created,
    'receptions_created', v_receptions_created,
    'products_rebuilt', coalesce((v_cache->>'products_rebuilt')::integer, 0)
  );
end $$;

do $$
begin
  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_inventory_products') is not null then
    execute $view$
      create or replace view public.admin_inventory_ready_view as
      with ranked_lots as (
        select
          lot.id as inventory_lot_id,
          lot.product_id,
          coalesce(lot.product_name, product.name) as producto,
          lot.batch_number as lote,
          lot.current_quantity as stock,
          lot.unit as unidad,
          lot.expiry_date as caducidad,
          lot.supplier_name as proveedor,
          doc.document_number as factura,
          doc.document_date as fecha_compra,
          lot.location as ubicacion,
          lot.status as estado,
          lot.purchase_document_id,
          lot.purchase_line_id,
          lot.requires_traceability,
          lot.requires_appcc_reception,
          lot.generates_inventory_lot,
          lot.gtin,
          lot.ean,
          lot.manufacturer_lot,
          lot.origin_country,
          row_number() over (
            partition by lot.product_id
            order by lot.expiry_date asc nulls last, lot.received_date asc nulls last, lot.created_at asc
          ) as fefo_rank
        from public.admin_inventory_lots lot
        left join public.admin_inventory_products product on product.id = lot.product_id
        left join public.admin_accounting_documents doc on doc.id = lot.purchase_document_id
        where lot.status = 'activo'
          and coalesce(lot.current_quantity, 0) > 0
      )
      select
        inventory_lot_id,
        product_id,
        producto,
        lote,
        stock,
        unidad,
        caducidad,
        proveedor,
        factura,
        fecha_compra,
        ubicacion,
        estado,
        purchase_document_id,
        purchase_line_id,
        requires_traceability,
        requires_appcc_reception,
        generates_inventory_lot,
        gtin,
        ean,
        manufacturer_lot,
        origin_country,
        fefo_rank,
        fefo_rank = 1 as fefo,
        coalesce(generates_inventory_lot, false) is true
          and coalesce(stock, 0) > 0
          and estado = 'activo' as listo_para_produccion,
        coalesce(stock, 0) > 0
          and estado = 'activo'
          and (
            coalesce(requires_traceability, false) is true
            or lote is not null
            or caducidad is not null
          ) as listo_para_etiqueta,
        (
          coalesce(requires_traceability, false) is true
          and (lote is null or caducidad is null)
        ) as requiere_revision,
        case
          when coalesce(requires_traceability, false) is true and lote is null then 'missing_lot'
          when coalesce(requires_traceability, false) is true and caducidad is null then 'missing_expiry'
          else null
        end as motivo_revision
      from ranked_lots
    $view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_inventory_ready_view') is not null then
    revoke all on public.admin_inventory_ready_view from anon, authenticated;
    grant select on public.admin_inventory_ready_view to service_role;
  end if;

  grant execute on function public.admin_activate_historical_stock() to service_role;
  grant execute on function public.admin_rebuild_inventory_cache() to service_role;
end $$;

comment on function public.admin_activate_historical_stock() is 'Activa stock inicial real desde líneas de compras históricas revisadas sin duplicar productos, lotes ni movimientos.';
comment on function public.admin_rebuild_inventory_cache() is 'Reconstruye admin_inventory_products como cache derivada desde admin_inventory_lots.';
comment on view public.admin_inventory_ready_view is 'Vista FEFO de lotes activos listos para producción, etiquetas y revisión APPCC.';
