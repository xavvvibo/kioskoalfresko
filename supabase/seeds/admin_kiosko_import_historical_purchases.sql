-- Importador idempotente de compras históricas revisadas.
-- Ejecutar despues de:
--   1. supabase/admin_kiosko_accounting.sql
--   2. supabase/admin_kiosko_operations.sql
--   3. supabase/admin_kiosko_inventory_lots.sql
--   4. supabase/admin_kiosko_purchase_core.sql
--
-- Este archivo base no incluye datos reales. El generador TypeScript sustituye
-- purchase_data por el contenido revisado de:
--   supabase/seeds/historical-purchases/kiosko_initial_purchases.json

create extension if not exists pgcrypto;

do $$
declare
  purchase_data jsonb := '[]'::jsonb;
  v_supplier jsonb;
  v_purchase jsonb;
  v_line jsonb;
  v_supplier_id uuid;
  v_product_id uuid;
  v_document_id uuid;
  v_item_id uuid;
  v_lot_id uuid;
  v_line_id uuid;
  v_supplier_name text;
  v_supplier_tax_id text;
  v_supplier_key text;
  v_document_type text;
  v_document_number text;
  v_document_date date;
  v_product_name text;
  v_product_key text;
  v_manufacturer_lot text;
  v_lot_code text;
  v_category text;
  v_quantity numeric;
  v_unit text;
  v_price numeric;
  v_requires_traceability boolean;
  v_requires_appcc boolean;
  v_generates_lot boolean;
begin
  for v_supplier in select * from jsonb_array_elements(purchase_data)
  loop
    v_supplier_name := nullif(trim(v_supplier->>'supplier'), '');
    v_supplier_tax_id := nullif(regexp_replace(upper(coalesce(v_supplier->>'tax_id', '')), '[^A-Z0-9]', '', 'g'), '');
    v_supplier_key := regexp_replace(lower(coalesce(v_supplier_name, '')), '[^a-z0-9]+', ' ', 'g');

    if v_supplier_name is null then
      continue;
    end if;

    select id into v_supplier_id
    from public.admin_supplier_records sr
    where (v_supplier_tax_id is not null and regexp_replace(upper(coalesce(sr.cif, '')), '[^A-Z0-9]', '', 'g') = v_supplier_tax_id)
       or regexp_replace(lower(sr.supplier), '[^a-z0-9]+', ' ', 'g') = v_supplier_key
    order by sr.created_at asc
    limit 1;

    if v_supplier_id is null then
      insert into public.admin_supplier_records (supplier, cif, status, category, observations)
      values (
        v_supplier_name,
        v_supplier_tax_id,
        'pendiente_datos_administrativos',
        'Proveedor histórico',
        coalesce(v_supplier->>'notes', 'Proveedor creado desde importación histórica.')
      )
      returning id into v_supplier_id;
    else
      update public.admin_supplier_records
      set cif = coalesce(cif, v_supplier_tax_id),
          observations = coalesce(observations, v_supplier->>'notes')
      where id = v_supplier_id;
    end if;

    for v_purchase in select * from jsonb_array_elements(coalesce(v_supplier->'purchases', '[]'::jsonb))
    loop
      v_document_type := coalesce(v_purchase#>>'{document,type}', 'invoice');
      v_document_number := nullif(trim(coalesce(v_purchase#>>'{document,number}', '')), '');
      v_document_date := nullif(v_purchase#>>'{document,date}', '')::date;

      if v_document_number is null or v_document_date is null then
        raise notice 'Compra omitida para proveedor %: falta document.number o document.date', v_supplier_name;
        continue;
      end if;

      select id into v_document_id
      from public.admin_accounting_documents ad
      where ad.normalized_supplier_id = v_supplier_id
        and ad.document_number = v_document_number
        and ad.document_date = v_document_date
      limit 1;

      if v_document_id is null then
        insert into public.admin_accounting_documents (
          uploaded_document_id,
          supplier_id,
          normalized_supplier_id,
          supplier_name,
          supplier_tax_id,
          document_type,
          document_number,
          document_date,
          taxable_base,
          vat_amount,
          total_amount,
          purchase_status,
          accounting_category,
          observations,
          source
        )
        values (
          nullif(v_purchase#>>'{document,uploaded_document_id}', '')::uuid,
          v_supplier_id,
          v_supplier_id,
          v_supplier_name,
          v_supplier_tax_id,
          v_document_type,
          v_document_number,
          v_document_date,
          nullif(v_purchase#>>'{accounting,taxable_base}', '')::numeric,
          nullif(v_purchase#>>'{accounting,iva}', '')::numeric,
          nullif(v_purchase#>>'{accounting,total}', '')::numeric,
          'reviewed',
          nullif(v_purchase#>>'{accounting,accounting_category}', ''),
          coalesce(v_purchase#>>'{document,notes}', 'Importación histórica revisada.'),
          'admin-kiosko-historical-import'
        )
        returning id into v_document_id;
      else
        update public.admin_accounting_documents
        set normalized_supplier_id = v_supplier_id,
            supplier_id = coalesce(public.admin_accounting_documents.supplier_id, v_supplier_id),
            purchase_status = 'reviewed'
        where id = v_document_id;
      end if;

      for v_line in select * from jsonb_array_elements(coalesce(v_purchase->'lines', '[]'::jsonb))
      loop
        v_product_name := nullif(trim(coalesce(v_line->>'product', '')), '');
        if v_product_name is null then
          continue;
        end if;

        v_category := coalesce(nullif(v_line->>'category', ''), 'other');
        v_product_key := regexp_replace(lower(v_product_name), '[^a-z0-9]+', ' ', 'g');
        v_manufacturer_lot := nullif(trim(coalesce(v_line->>'manufacturer_lot', '')), '');
        v_quantity := nullif(v_line->>'quantity', '')::numeric;
        v_unit := coalesce(nullif(v_line->>'unit', ''), 'ud');
        v_price := nullif(v_line->>'price', '')::numeric;
        v_requires_traceability := coalesce((nullif(v_line->>'requires_traceability', ''))::boolean, false);
        v_requires_appcc := coalesce((nullif(v_line->>'requires_appcc_reception', ''))::boolean, false);
        v_generates_lot := coalesce((nullif(v_line->>'generates_inventory_lot', ''))::boolean, false);

        select id into v_product_id
        from public.admin_inventory_products ip
        where (nullif(regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'), '') is not null and ip.gtin = regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'))
           or (nullif(regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'), '') is not null and ip.ean = regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'))
           or regexp_replace(lower(ip.name), '[^a-z0-9]+', ' ', 'g') = v_product_key
        order by ip.created_at asc
        limit 1;

        if v_product_id is null then
          insert into public.admin_inventory_products (
            name,
            category,
            usual_supplier,
            unit,
            current_stock,
            minimum_stock,
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
          values (
            v_product_name,
            v_category,
            v_supplier_name,
            v_unit,
            0,
            0,
            coalesce(nullif(v_line->>'default_location', ''), 'Almacén'),
            nullif(regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'), ''),
            nullif(regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'), ''),
            v_category,
            case when v_category = 'service' then 'servicios exteriores' when v_category = 'equipment' then 'equipamiento' else 'compras explotación' end,
            nullif(v_line->>'storage_temperature', ''),
            nullif(v_line->>'default_location', ''),
            v_requires_traceability,
            v_requires_appcc,
            v_generates_lot,
            coalesce(v_line->>'notes', 'Producto creado desde importación histórica.'),
            true
          )
          returning id into v_product_id;
        end if;

        select id, purchase_line_id into v_item_id, v_line_id
        from public.admin_accounting_document_items item
        where item.purchase_document_id = v_document_id
          and regexp_replace(lower(item.product_name), '[^a-z0-9]+', ' ', 'g') = v_product_key
          and coalesce(item.manufacturer_lot, item.batch_number, '') = coalesce(v_manufacturer_lot, '')
        limit 1;

        if v_item_id is null then
          v_line_id := gen_random_uuid();

          insert into public.admin_accounting_document_items (
            accounting_document_id,
            purchase_document_id,
            purchase_line_id,
            product_name,
            normalized_product_id,
            inventory_product_id,
            quantity,
            unit,
            unit_price,
            vat_rate,
            total_amount,
            gtin,
            ean,
            batch_number,
            manufacturer_lot,
            origin_country,
            expiry_date,
            requires_traceability,
            requires_appcc_reception,
            generates_inventory_lot,
            accounting_category,
            product_family,
            storage_temperature,
            default_location
          )
          values (
            v_document_id,
            v_document_id,
            v_line_id,
            v_product_name,
            v_product_id,
            v_product_id,
            v_quantity,
            v_unit,
            v_price,
            nullif(v_line->>'iva', '')::numeric,
            case when v_quantity is not null and v_price is not null then v_quantity * v_price else null end,
            nullif(regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'), ''),
            nullif(regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'), ''),
            v_manufacturer_lot,
            v_manufacturer_lot,
            nullif(v_line->>'origin_country', ''),
            nullif(v_line->>'expiry_date', '')::date,
            v_requires_traceability,
            v_requires_appcc,
            v_generates_lot,
            case when v_category = 'service' then 'servicios exteriores' when v_category = 'equipment' then 'equipamiento' else 'compras explotación' end,
            v_category,
            nullif(v_line->>'storage_temperature', ''),
            nullif(v_line->>'default_location', '')
          )
          returning id into v_item_id;
        end if;

        if v_generates_lot then
          v_lot_code := coalesce(
            v_manufacturer_lot,
            'INIT-' || to_char(v_document_date, 'YYYYMMDD') || '-' ||
            upper(regexp_replace(left(coalesce(v_supplier_name, 'SUPPLIER'), 12), '[^A-Za-z0-9]+', '', 'g')) || '-' ||
            upper(regexp_replace(left(coalesce(v_product_name, 'PRODUCT'), 12), '[^A-Za-z0-9]+', '', 'g'))
          );

          select id into v_lot_id
          from public.admin_inventory_lots lot
          where lot.product_id = v_product_id
            and lot.normalized_supplier_id = v_supplier_id
            and lot.batch_number = v_lot_code
            and lot.purchase_document_id = v_document_id
          limit 1;

          if v_lot_id is null then
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
            values (
              v_product_id,
              v_product_id,
              v_product_name,
              v_supplier_id,
              v_supplier_id,
              v_supplier_name,
              v_document_id,
              v_line_id,
              v_lot_code,
              v_manufacturer_lot,
              nullif(v_line->>'origin_country', ''),
              nullif(v_line->>'expiry_date', '')::date,
              v_document_date,
              coalesce(v_quantity, 0),
              coalesce(v_quantity, 0),
              v_unit,
              coalesce(nullif(v_line->>'default_location', ''), 'Almacén'),
              v_price,
              v_price,
              'activo',
              v_requires_traceability,
              v_requires_appcc,
              true,
              case when v_category = 'service' then 'servicios exteriores' when v_category = 'equipment' then 'equipamiento' else 'compras explotación' end,
              v_category,
              nullif(v_line->>'storage_temperature', ''),
              nullif(v_line->>'default_location', ''),
              coalesce(v_line->>'notes', 'Lote creado desde importación histórica.'),
              'admin-kiosko-historical-import'
            )
            returning id into v_lot_id;

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
            values (
              v_lot_id,
              v_product_id,
              v_document_id,
              v_line_id,
              'entrada',
              v_document_date,
              coalesce(v_quantity, 0),
              v_unit,
              coalesce(nullif(v_line->>'default_location', ''), 'Almacén'),
              'Importación histórica revisada',
              'Sistema',
              'admin_accounting_documents',
              v_document_id,
              coalesce(v_line->>'notes', 'Entrada creada desde importación histórica.')
            );
          end if;
        end if;

        if v_requires_appcc then
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
            v_document_date,
            v_supplier_name,
            v_product_name,
            v_manufacturer_lot,
            nullif(v_line->>'expiry_date', '')::date,
            true,
            'correcto',
            coalesce(v_line->>'notes', 'Recepción APPCC creada desde importación histórica revisada.'),
            v_document_id,
            v_line_id,
            v_supplier_id,
            v_product_id,
            v_manufacturer_lot,
            nullif(v_line->>'origin_country', ''),
            v_requires_traceability,
            true,
            v_generates_lot,
            nullif(v_line->>'storage_temperature', ''),
            nullif(v_line->>'default_location', ''),
            'admin-kiosko-historical-import'
          where not exists (
            select 1
            from public.admin_goods_reception_records gr
            where gr.purchase_document_id = v_document_id
              and gr.purchase_line_id = v_line_id
          );
        end if;
      end loop;
    end loop;
  end loop;
end $$;
