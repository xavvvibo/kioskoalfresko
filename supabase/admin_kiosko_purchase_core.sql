create extension if not exists pgcrypto;

-- Núcleo profesional de compras ERP.
-- Aditivo: no sustituye OCR, inventario, contabilidad ni APPCC actuales.

alter table if exists public.admin_uploaded_documents
  add column if not exists purchase_document_id uuid,
  add column if not exists normalized_supplier_id uuid,
  add column if not exists source_document_id uuid;

alter table if exists public.admin_supplier_documents
  add column if not exists purchase_document_id uuid,
  add column if not exists normalized_supplier_id uuid,
  add column if not exists source_document_id uuid;

alter table if exists public.admin_accounting_documents
  add column if not exists normalized_supplier_id uuid,
  add column if not exists source_document_id uuid,
  add column if not exists purchase_status text default 'pending_review',
  add column if not exists accounting_category text;

alter table if exists public.admin_accounting_document_items
  add column if not exists purchase_document_id uuid,
  add column if not exists purchase_line_id uuid,
  add column if not exists normalized_product_id uuid,
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
  add column if not exists default_location text,
  add column if not exists source_document_id uuid;

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
  add column if not exists generates_inventory_lot boolean default false,
  add column if not exists source_document_id uuid;

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
  add column if not exists default_location text,
  add column if not exists source_document_id uuid;

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
  add column if not exists default_location text,
  add column if not exists source_document_id uuid;

alter table if exists public.admin_label_records
  add column if not exists purchase_document_id uuid,
  add column if not exists purchase_line_id uuid,
  add column if not exists normalized_product_id uuid,
  add column if not exists gtin text,
  add column if not exists ean text,
  add column if not exists manufacturer_lot text,
  add column if not exists origin_country text,
  add column if not exists source_document_id uuid;

do $$
begin
  if to_regclass('public.admin_accounting_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_accounting_documents_purchase_status_chk') then
    alter table public.admin_accounting_documents
      add constraint admin_accounting_documents_purchase_status_chk
      check (purchase_status is null or purchase_status in ('pending_review', 'reviewed', 'linked', 'rejected', 'archived'))
      not valid;
  end if;

  if to_regclass('public.admin_supplier_records') is not null
     and to_regclass('public.admin_accounting_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_accounting_documents_normalized_supplier_fk') then
    alter table public.admin_accounting_documents
      add constraint admin_accounting_documents_normalized_supplier_fk
      foreign key (normalized_supplier_id) references public.admin_supplier_records(id) on delete set null
      not valid;
  end if;

  if to_regclass('public.admin_accounting_documents') is not null
     and to_regclass('public.admin_accounting_document_items') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_accounting_items_purchase_document_fk') then
    alter table public.admin_accounting_document_items
      add constraint admin_accounting_items_purchase_document_fk
      foreign key (purchase_document_id) references public.admin_accounting_documents(id) on delete set null
      not valid;
  end if;

  if to_regclass('public.admin_inventory_products') is not null
     and to_regclass('public.admin_accounting_document_items') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_accounting_items_normalized_product_fk') then
    alter table public.admin_accounting_document_items
      add constraint admin_accounting_items_normalized_product_fk
      foreign key (normalized_product_id) references public.admin_inventory_products(id) on delete set null
      not valid;
  end if;

  if to_regclass('public.admin_inventory_products') is not null
     and to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_normalized_product_fk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_normalized_product_fk
      foreign key (normalized_product_id) references public.admin_inventory_products(id) on delete set null
      not valid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_accounting_documents') is not null then
    create index if not exists admin_accounting_documents_normalized_supplier_idx on public.admin_accounting_documents (normalized_supplier_id);
    create index if not exists admin_accounting_documents_purchase_status_idx on public.admin_accounting_documents (purchase_status);
  end if;

  if to_regclass('public.admin_accounting_document_items') is not null then
    create index if not exists admin_accounting_items_purchase_document_idx on public.admin_accounting_document_items (purchase_document_id);
    create index if not exists admin_accounting_items_purchase_line_idx on public.admin_accounting_document_items (purchase_line_id);
    create index if not exists admin_accounting_items_normalized_product_idx on public.admin_accounting_document_items (normalized_product_id);
    create index if not exists admin_accounting_items_gtin_idx on public.admin_accounting_document_items (gtin);
    create index if not exists admin_accounting_items_ean_idx on public.admin_accounting_document_items (ean);
    create index if not exists admin_accounting_items_pending_review_idx on public.admin_accounting_document_items (requires_traceability, requires_appcc_reception, generates_inventory_lot);
  end if;

  if to_regclass('public.admin_inventory_products') is not null then
    create index if not exists admin_inventory_products_gtin_idx on public.admin_inventory_products (gtin);
    create index if not exists admin_inventory_products_ean_idx on public.admin_inventory_products (ean);
    create index if not exists admin_inventory_products_family_idx on public.admin_inventory_products (lower(product_family));
    create index if not exists admin_inventory_products_traceability_flags_idx on public.admin_inventory_products (requires_traceability, requires_appcc_reception, generates_inventory_lot);
  end if;

  if to_regclass('public.admin_inventory_lots') is not null then
    create index if not exists admin_inventory_lots_purchase_document_idx on public.admin_inventory_lots (purchase_document_id);
    create index if not exists admin_inventory_lots_purchase_line_idx on public.admin_inventory_lots (purchase_line_id);
    create index if not exists admin_inventory_lots_gtin_idx on public.admin_inventory_lots (gtin);
    create index if not exists admin_inventory_lots_ean_idx on public.admin_inventory_lots (ean);
    create index if not exists admin_inventory_lots_label_ready_idx on public.admin_inventory_lots (status, current_quantity, expiry_date);
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_accounting_documents') is not null then
    comment on column public.admin_accounting_documents.purchase_status is 'Estado operativo del documento de compra dentro del núcleo ERP: pending_review, reviewed, linked, rejected, archived.';
  end if;

  if to_regclass('public.admin_accounting_document_items') is not null then
    comment on column public.admin_accounting_document_items.purchase_line_id is 'Identificador estable de línea de compra para relacionar contabilidad, lote, APPCC y etiquetas.';
    comment on column public.admin_accounting_document_items.normalized_product_id is 'Producto maestro normalizado asociado a esta línea de compra.';
  end if;

  if to_regclass('public.admin_inventory_lots') is not null then
    comment on column public.admin_inventory_lots.purchase_line_id is 'Línea de compra origen del lote FEFO cuando exista.';
  end if;

  if to_regclass('public.admin_inventory_products') is not null then
    comment on column public.admin_inventory_products.requires_traceability is 'Indica si el producto requiere trazabilidad alimentaria por lote.';
    comment on column public.admin_inventory_products.requires_appcc_reception is 'Indica si la compra requiere registro APPCC de recepción.';
    comment on column public.admin_inventory_products.generates_inventory_lot is 'Indica si la compra debe generar lote real de inventario.';
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_accounting_documents') is not null
     and to_regclass('public.admin_accounting_document_items') is not null
     and to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_goods_reception_records') is not null then
    execute $view$
      create or replace view public.admin_purchase_traceability_view as
      select
        ad.id as purchase_document_id,
        adi.id as accounting_item_id,
        adi.purchase_line_id,
        coalesce(ad.normalized_supplier_id, ad.supplier_id) as supplier_id,
        ad.supplier_name,
        ad.document_type,
        ad.document_number,
        ad.document_date,
        adi.product_name,
        coalesce(adi.normalized_product_id, adi.inventory_product_id) as product_id,
        adi.gtin,
        adi.ean,
        coalesce(adi.manufacturer_lot, adi.batch_number, lot.batch_number) as batch_number,
        coalesce(adi.expiry_date, lot.expiry_date) as expiry_date,
        lot.id as inventory_lot_id,
        lot.current_quantity,
        lot.unit,
        lot.location,
        gr.id as appcc_reception_id,
        gr.status as appcc_status,
        adi.requires_traceability,
        adi.requires_appcc_reception,
        adi.generates_inventory_lot
      from public.admin_accounting_documents ad
      left join public.admin_accounting_document_items adi
        on adi.accounting_document_id = ad.id or adi.purchase_document_id = ad.id
      left join public.admin_inventory_lots lot
        on lot.purchase_line_id = adi.purchase_line_id
        or (lot.purchase_document_id = ad.id and lot.normalized_product_id = coalesce(adi.normalized_product_id, adi.inventory_product_id))
      left join public.admin_goods_reception_records gr
        on gr.purchase_line_id = adi.purchase_line_id
        or gr.purchase_document_id = ad.id
    $view$;
  end if;

  if to_regclass('public.admin_accounting_documents') is not null
     and to_regclass('public.admin_accounting_document_items') is not null then
    execute $view$
      create or replace view public.admin_purchase_lines_pending_review_view as
      select
        ad.id as purchase_document_id,
        adi.id as accounting_item_id,
        adi.purchase_line_id,
        ad.supplier_name,
        ad.document_type,
        ad.document_number,
        ad.document_date,
        adi.product_name,
        adi.quantity,
        adi.unit,
        adi.total_amount,
        adi.gtin,
        adi.ean,
        adi.batch_number,
        adi.expiry_date,
        adi.normalized_product_id,
        ad.purchase_status,
        case
          when adi.normalized_product_id is null then 'product_not_normalized'
          when adi.requires_traceability and coalesce(adi.batch_number, adi.manufacturer_lot) is null then 'missing_lot'
          when adi.requires_traceability and adi.expiry_date is null then 'missing_expiry'
          when adi.requires_appcc_reception and ad.purchase_status = 'pending_review' then 'appcc_pending'
          else 'ready'
        end as review_reason
      from public.admin_accounting_documents ad
      join public.admin_accounting_document_items adi
        on adi.accounting_document_id = ad.id or adi.purchase_document_id = ad.id
      where ad.purchase_status = 'pending_review'
         or adi.normalized_product_id is null
         or (adi.requires_traceability and (coalesce(adi.batch_number, adi.manufacturer_lot) is null or adi.expiry_date is null))
         or adi.requires_appcc_reception
    $view$;
  end if;

  if to_regclass('public.admin_inventory_products') is not null then
    execute $view$
      create or replace view public.admin_products_deduplication_candidates_view as
      select
        p1.id as product_id,
        p1.name as product_name,
        p1.gtin,
        p1.ean,
        p1.usual_supplier,
        p2.id as candidate_product_id,
        p2.name as candidate_product_name,
        case
          when p1.gtin is not null and p1.gtin = p2.gtin then 'gtin'
          when p1.ean is not null and p1.ean = p2.ean then 'ean'
          when lower(p1.name) = lower(p2.name) then 'name'
          else 'similar_name'
        end as match_reason
      from public.admin_inventory_products p1
      join public.admin_inventory_products p2
        on p1.id < p2.id
       and (
        (p1.gtin is not null and p1.gtin = p2.gtin)
        or (p1.ean is not null and p1.ean = p2.ean)
        or lower(p1.name) = lower(p2.name)
       )
    $view$;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null then
    execute $view$
      create or replace view public.admin_stock_ready_for_labels_view as
      select
        lot.id as inventory_lot_id,
        lot.product_id,
        lot.product_name,
        lot.supplier_name,
        lot.batch_number,
        lot.expiry_date,
        lot.current_quantity,
        lot.unit,
        lot.location,
        lot.purchase_document_id,
        lot.purchase_line_id,
        lot.gtin,
        lot.ean,
        lot.requires_traceability,
        lot.status
      from public.admin_inventory_lots lot
      where lot.status = 'activo'
        and coalesce(lot.current_quantity, 0) > 0
        and (lot.requires_traceability is true or lot.expiry_date is not null or lot.batch_number is not null)
    $view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_purchase_traceability_view') is not null then
    revoke all on public.admin_purchase_traceability_view from anon, authenticated;
    grant select on public.admin_purchase_traceability_view to service_role;
  end if;

  if to_regclass('public.admin_purchase_lines_pending_review_view') is not null then
    revoke all on public.admin_purchase_lines_pending_review_view from anon, authenticated;
    grant select on public.admin_purchase_lines_pending_review_view to service_role;
  end if;

  if to_regclass('public.admin_products_deduplication_candidates_view') is not null then
    revoke all on public.admin_products_deduplication_candidates_view from anon, authenticated;
    grant select on public.admin_products_deduplication_candidates_view to service_role;
  end if;

  if to_regclass('public.admin_stock_ready_for_labels_view') is not null then
    revoke all on public.admin_stock_ready_for_labels_view from anon, authenticated;
    grant select on public.admin_stock_ready_for_labels_view to service_role;
  end if;
end $$;
