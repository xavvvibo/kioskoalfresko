create extension if not exists pgcrypto;

-- Enlace de etiquetas APPCC/Zebra con lotes reales de inventario revisados.
-- No imprime etiquetas ni modifica stock. Solo amplia historial y compatibilidad.

alter table if exists public.admin_label_records
  add column if not exists inventory_lot_id uuid,
  add column if not exists product_id uuid,
  add column if not exists accounting_document_id uuid,
  add column if not exists supplier_document_id uuid,
  add column if not exists uploaded_document_id uuid,
  add column if not exists label_type text,
  add column if not exists expiry_source text,
  add column if not exists appcc_review_status text,
  add column if not exists review_warning text;

do $$
begin
  if to_regclass('public.admin_label_records') is not null then
    create index if not exists admin_label_records_inventory_lot_idx on public.admin_label_records (inventory_lot_id);
    create index if not exists admin_label_records_product_idx on public.admin_label_records (product_id);
    create index if not exists admin_label_records_accounting_document_idx on public.admin_label_records (accounting_document_id);
    create index if not exists admin_label_records_label_type_idx on public.admin_label_records (label_type);
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_appcc_review_status_chk') then
    alter table public.admin_inventory_lots
      drop constraint admin_inventory_lots_appcc_review_status_chk;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_appcc_review_status_chk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_appcc_review_status_chk
      check (appcc_review_status is null or appcc_review_status in ('pendiente_revision', 'revisado', 'aprobado', 'requiere_documentacion'))
      not valid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_label_records') is not null then
    comment on column public.admin_label_records.inventory_lot_id is 'Lote real de inventario asociado a la etiqueta APPCC/Zebra.';
    comment on column public.admin_label_records.product_id is 'Producto de inventario asociado a la etiqueta.';
    comment on column public.admin_label_records.accounting_document_id is 'Documento contable/factura origen de la etiqueta cuando exista.';
    comment on column public.admin_label_records.supplier_document_id is 'Documento OCR/proveedor origen de la etiqueta cuando exista.';
    comment on column public.admin_label_records.uploaded_document_id is 'Documento original privado asociado a la etiqueta cuando exista.';
    comment on column public.admin_label_records.label_type is 'Tipo funcional de etiqueta: inventory_lot, production_batch, reception, etc.';
    comment on column public.admin_label_records.expiry_source is 'Fuente de caducidad impresa: real_documentada, estimada_por_regla o revisada_manual.';
    comment on column public.admin_label_records.appcc_review_status is 'Estado APPCC del lote al generar/imprimir la etiqueta.';
    comment on column public.admin_label_records.review_warning is 'Aviso visible cuando la etiqueta usa caducidad estimada o lote pendiente de revisión.';
  end if;
end $$;
