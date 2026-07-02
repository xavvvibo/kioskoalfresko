create extension if not exists pgcrypto;

-- Revision APPCC de lotes importados con datos incompletos.
-- Este SQL no asigna caducidades automaticamente.
-- Solo prepara campos de auditoria y una vista de trabajo para revision humana.

alter table if exists public.admin_inventory_lots
  add column if not exists expiry_source text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists review_notes text,
  add column if not exists appcc_review_status text default 'pendiente_revision';

do $$
begin
  if to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_expiry_source_chk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_expiry_source_chk
      check (expiry_source is null or expiry_source in ('real_documentada', 'estimada_por_regla', 'revisada_manual'))
      not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_appcc_review_status_chk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_appcc_review_status_chk
      check (appcc_review_status is null or appcc_review_status in ('pendiente_revision', 'revisado', 'requiere_documentacion'))
      not valid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_inventory_lots') is not null then
    create index if not exists admin_inventory_lots_review_status_idx
      on public.admin_inventory_lots (appcc_review_status, expiry_source);
    create index if not exists admin_inventory_lots_reviewed_at_idx
      on public.admin_inventory_lots (reviewed_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_inventory_products') is not null then
    drop view if exists public.admin_inventory_ready_view;

    execute $view$
      create view public.admin_inventory_ready_view as
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
          lot.supplier_document_id,
          lot.uploaded_document_id,
          lot.purchase_document_id,
          lot.purchase_line_id,
          lot.requires_traceability,
          lot.requires_appcc_reception,
          lot.generates_inventory_lot,
          lot.gtin,
          lot.ean,
          lot.manufacturer_lot,
          lot.origin_country,
          lot.product_family,
          lot.storage_temperature,
          lot.expiry_source,
          lot.reviewed_at,
          lot.reviewed_by,
          lot.review_notes,
          lot.appcc_review_status,
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
        supplier_document_id,
        uploaded_document_id,
        purchase_document_id,
        purchase_line_id,
        requires_traceability,
        requires_appcc_reception,
        generates_inventory_lot,
        gtin,
        ean,
        manufacturer_lot,
        origin_country,
        product_family,
        storage_temperature,
        expiry_source,
        reviewed_at,
        reviewed_by,
        review_notes,
        appcc_review_status,
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
          and (
            lote is null
            or caducidad is null
            or coalesce(appcc_review_status, 'pendiente_revision') = 'pendiente_revision'
          )
        ) as requiere_revision,
        case
          when coalesce(requires_traceability, false) is true and lote is null then 'missing_lot'
          when coalesce(requires_traceability, false) is true and caducidad is null then 'missing_expiry'
          when coalesce(requires_traceability, false) is true and coalesce(appcc_review_status, 'pendiente_revision') = 'pendiente_revision' then 'pending_appcc_review'
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
end $$;

do $$
begin
  if to_regclass('public.admin_inventory_lots') is not null then
    comment on column public.admin_inventory_lots.expiry_source is 'Origen APPCC de la caducidad: real_documentada, estimada_por_regla o revisada_manual.';
    comment on column public.admin_inventory_lots.reviewed_at is 'Fecha de revision APPCC del lote importado.';
    comment on column public.admin_inventory_lots.reviewed_by is 'Responsable que revisa o confirma la caducidad del lote.';
    comment on column public.admin_inventory_lots.review_notes is 'Notas de revision: documento fuente, criterio aplicado o aclaraciones.';
    comment on column public.admin_inventory_lots.appcc_review_status is 'Estado de revision APPCC del lote: pendiente_revision, revisado o requiere_documentacion.';
  end if;
end $$;
