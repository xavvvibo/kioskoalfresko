create extension if not exists pgcrypto;

-- Core ERP contracts. This file is intentionally additive and idempotent.
-- It documents canonical ownership without replacing historical tables.

alter table if exists public.admin_supplier_documents
  add column if not exists uploaded_document_id uuid;

alter table if exists public.admin_goods_reception_records
  add column if not exists supplier_id uuid,
  add column if not exists uploaded_document_id uuid,
  add column if not exists supplier_document_id uuid,
  add column if not exists accounting_document_id uuid,
  add column if not exists inventory_lot_id uuid;

alter table if exists public.admin_inventory_lots
  add column if not exists supplier_id uuid,
  add column if not exists supplier_document_id uuid,
  add column if not exists uploaded_document_id uuid,
  add column if not exists accounting_document_id uuid,
  add column if not exists goods_reception_id uuid;

alter table if exists public.admin_label_records
  add column if not exists product_id uuid,
  add column if not exists inventory_lot_id uuid,
  add column if not exists production_batch_id uuid,
  add column if not exists uploaded_document_id uuid,
  add column if not exists supplier_document_id uuid,
  add column if not exists accounting_document_id uuid;

alter table if exists public.admin_production_batches
  add column if not exists source_inventory_lot_id uuid,
  add column if not exists source_uploaded_document_id uuid,
  add column if not exists output_inventory_lot_id uuid;

alter table if exists public.admin_accounting_documents
  add column if not exists supplier_id uuid,
  add column if not exists uploaded_document_id uuid;

create index if not exists admin_supplier_documents_uploaded_idx on public.admin_supplier_documents (uploaded_document_id);
create index if not exists admin_goods_reception_supplier_idx on public.admin_goods_reception_records (supplier_id);
create index if not exists admin_goods_reception_uploaded_idx on public.admin_goods_reception_records (uploaded_document_id);
create index if not exists admin_goods_reception_supplier_document_idx on public.admin_goods_reception_records (supplier_document_id);
create index if not exists admin_goods_reception_accounting_idx on public.admin_goods_reception_records (accounting_document_id);
create index if not exists admin_goods_reception_lot_idx on public.admin_goods_reception_records (inventory_lot_id);
create index if not exists admin_inventory_lots_supplier_id_idx on public.admin_inventory_lots (supplier_id);
create index if not exists admin_inventory_lots_supplier_document_idx on public.admin_inventory_lots (supplier_document_id);
create index if not exists admin_inventory_lots_uploaded_idx on public.admin_inventory_lots (uploaded_document_id);
create index if not exists admin_inventory_lots_accounting_idx on public.admin_inventory_lots (accounting_document_id);
create index if not exists admin_inventory_lots_reception_idx on public.admin_inventory_lots (goods_reception_id);
create index if not exists admin_label_records_product_id_idx on public.admin_label_records (product_id);
create index if not exists admin_label_records_lot_id_idx on public.admin_label_records (inventory_lot_id);
create index if not exists admin_label_records_production_batch_idx on public.admin_label_records (production_batch_id);
create index if not exists admin_label_records_uploaded_idx on public.admin_label_records (uploaded_document_id);
create index if not exists admin_label_records_supplier_document_idx on public.admin_label_records (supplier_document_id);
create index if not exists admin_production_batches_source_lot_idx on public.admin_production_batches (source_inventory_lot_id);
create index if not exists admin_production_batches_output_lot_idx on public.admin_production_batches (output_inventory_lot_id);

do $$
begin
  if to_regclass('public.admin_supplier_documents') is not null
     and to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_supplier_documents_uploaded_document_fk') then
    alter table public.admin_supplier_documents
      add constraint admin_supplier_documents_uploaded_document_fk
      foreign key (uploaded_document_id) references public.admin_uploaded_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_supplier_records') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_supplier_fk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_supplier_fk
      foreign key (supplier_id) references public.admin_supplier_records(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_supplier_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_supplier_document_fk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_supplier_document_fk
      foreign key (supplier_document_id) references public.admin_supplier_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_uploaded_document_fk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_uploaded_document_fk
      foreign key (uploaded_document_id) references public.admin_uploaded_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_accounting_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_accounting_document_fk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_accounting_document_fk
      foreign key (accounting_document_id) references public.admin_accounting_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_goods_reception_records') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_goods_reception_fk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_goods_reception_fk
      foreign key (goods_reception_id) references public.admin_goods_reception_records(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_goods_reception_records') is not null
     and to_regclass('public.admin_supplier_records') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_goods_reception_supplier_fk') then
    alter table public.admin_goods_reception_records
      add constraint admin_goods_reception_supplier_fk
      foreign key (supplier_id) references public.admin_supplier_records(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_goods_reception_records') is not null
     and to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_goods_reception_uploaded_document_fk') then
    alter table public.admin_goods_reception_records
      add constraint admin_goods_reception_uploaded_document_fk
      foreign key (uploaded_document_id) references public.admin_uploaded_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_goods_reception_records') is not null
     and to_regclass('public.admin_supplier_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_goods_reception_supplier_document_fk') then
    alter table public.admin_goods_reception_records
      add constraint admin_goods_reception_supplier_document_fk
      foreign key (supplier_document_id) references public.admin_supplier_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_goods_reception_records') is not null
     and to_regclass('public.admin_accounting_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_goods_reception_accounting_document_fk') then
    alter table public.admin_goods_reception_records
      add constraint admin_goods_reception_accounting_document_fk
      foreign key (accounting_document_id) references public.admin_accounting_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_goods_reception_records') is not null
     and to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_goods_reception_inventory_lot_fk') then
    alter table public.admin_goods_reception_records
      add constraint admin_goods_reception_inventory_lot_fk
      foreign key (inventory_lot_id) references public.admin_inventory_lots(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_label_records') is not null
     and to_regclass('public.admin_inventory_products') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_label_records_product_fk') then
    alter table public.admin_label_records
      add constraint admin_label_records_product_fk
      foreign key (product_id) references public.admin_inventory_products(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_label_records') is not null
     and to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_label_records_inventory_lot_fk') then
    alter table public.admin_label_records
      add constraint admin_label_records_inventory_lot_fk
      foreign key (inventory_lot_id) references public.admin_inventory_lots(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_label_records') is not null
     and to_regclass('public.admin_production_batches') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_label_records_production_batch_fk') then
    alter table public.admin_label_records
      add constraint admin_label_records_production_batch_fk
      foreign key (production_batch_id) references public.admin_production_batches(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_label_records') is not null
     and to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_label_records_uploaded_document_fk') then
    alter table public.admin_label_records
      add constraint admin_label_records_uploaded_document_fk
      foreign key (uploaded_document_id) references public.admin_uploaded_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_label_records') is not null
     and to_regclass('public.admin_supplier_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_label_records_supplier_document_fk') then
    alter table public.admin_label_records
      add constraint admin_label_records_supplier_document_fk
      foreign key (supplier_document_id) references public.admin_supplier_documents(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_production_batches') is not null
     and to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_production_batches_source_lot_fk') then
    alter table public.admin_production_batches
      add constraint admin_production_batches_source_lot_fk
      foreign key (source_inventory_lot_id) references public.admin_inventory_lots(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_production_batches') is not null
     and to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_production_batches_output_lot_fk') then
    alter table public.admin_production_batches
      add constraint admin_production_batches_output_lot_fk
      foreign key (output_inventory_lot_id) references public.admin_inventory_lots(id) on delete set null not valid;
  end if;

  if to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_uploaded_documents_review_status_chk') then
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_review_status_chk
      check (review_status is null or review_status in ('pendiente_revision', 'revisado', 'confirmado', 'rechazado', 'anulado'))
      not valid;
  end if;

  if to_regclass('public.admin_accounting_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_accounting_documents_reconciliation_status_chk') then
    alter table public.admin_accounting_documents
      add constraint admin_accounting_documents_reconciliation_status_chk
      check (reconciliation_status is null or reconciliation_status in ('pendiente_conciliar', 'conciliado', 'diferencia_importe', 'diferencia_producto', 'diferencia_cantidad', 'revisado_manual'))
      not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_status_chk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_status_chk
      check (status is null or status in ('activo', 'agotado', 'caducado', 'bloqueado', 'regularizado'))
      not valid;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lots_quantities_chk') then
    alter table public.admin_inventory_lots
      add constraint admin_inventory_lots_quantities_chk
      check (coalesce(initial_quantity, 0) >= 0 and coalesce(current_quantity, 0) >= 0)
      not valid;
  end if;

  if to_regclass('public.admin_inventory_lot_movements') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_inventory_lot_movements_quantity_chk') then
    alter table public.admin_inventory_lot_movements
      add constraint admin_inventory_lot_movements_quantity_chk
      check (quantity is null or quantity >= 0)
      not valid;
  end if;

  if to_regclass('public.admin_label_records') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_label_records_copies_chk') then
    alter table public.admin_label_records
      add constraint admin_label_records_copies_chk
      check (copies is null or copies > 0)
      not valid;
  end if;
end $$;

comment on table public.admin_uploaded_documents is 'ERP root document table. Private original files live here first; OCR, accounting, APPCC and inventory records should link back to this table when possible.';
comment on table public.admin_supplier_records is 'ERP supplier master. Supplier names stored elsewhere are compatibility denormalizations; supplier_id should be preferred for new integrations.';
comment on table public.admin_accounting_documents is 'Economic/accounting document: invoice, delivery note or purchase document reviewed from OCR and linked to the private original document.';
comment on table public.admin_goods_reception_records is 'APPCC goods reception record. This confirms sanitary reception controls and may link to supplier, OCR document, accounting document and inventory lot.';
comment on table public.admin_inventory_lots is 'Source of truth for stock by real lot. Product stock summaries must be derived from active lots whenever available.';
comment on table public.admin_inventory_products is 'Inventory product master and summary/cache. current_stock/current_batch/expiry_date are operational summaries, not the canonical source for lot stock.';
comment on table public.admin_label_records is 'APPCC/Zebra label print history. Labels should link to product, inventory lot, production batch or source document when known.';
comment on table public.admin_production_batches is 'Internal production batches. These transform inventory lots into internal batches/lots and feed traceability.';

comment on column public.admin_supplier_documents.uploaded_document_id is 'Optional link to admin_uploaded_documents, the private original OCR file.';
comment on column public.admin_goods_reception_records.supplier_id is 'Optional normalized supplier reference; supplier text is kept for compatibility.';
comment on column public.admin_goods_reception_records.uploaded_document_id is 'Optional private original document linked to the reception.';
comment on column public.admin_goods_reception_records.supplier_document_id is 'Optional OCR supplier document linked to the reception.';
comment on column public.admin_goods_reception_records.accounting_document_id is 'Optional accounting purchase document linked to this APPCC reception.';
comment on column public.admin_goods_reception_records.inventory_lot_id is 'Optional real inventory lot created or confirmed by this APPCC reception.';
comment on column public.admin_inventory_lots.supplier_id is 'Optional normalized supplier reference for the lot.';
comment on column public.admin_inventory_lots.uploaded_document_id is 'Optional private original document that originated the lot.';
comment on column public.admin_inventory_lots.accounting_document_id is 'Optional accounting document that originated the lot purchase.';
comment on column public.admin_inventory_lots.goods_reception_id is 'Optional APPCC goods reception record that accepted this lot.';
comment on column public.admin_label_records.inventory_lot_id is 'Optional real inventory lot represented by this label.';
comment on column public.admin_label_records.production_batch_id is 'Optional internal production batch represented by this label.';

do $$
begin
  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_inventory_products') is not null
     and to_regclass('public.admin_supplier_documents') is not null
     and to_regclass('public.admin_uploaded_documents') is not null then
    execute $view$
      create or replace view public.admin_inventory_lot_stock_view as
      with ranked_lots as (
        select
          l.id as inventory_lot_id,
          l.product_id,
          coalesce(p.name, l.product_name) as product_name,
          l.batch_number,
          l.expiry_date,
          l.received_date,
          l.current_quantity as stock_actual,
          l.initial_quantity,
          coalesce(l.unit, p.unit) as unit,
          l.location,
          l.status,
          l.supplier_id,
          coalesce(s.supplier, l.supplier_name, p.usual_supplier) as supplier_name,
          l.supplier_document_id,
          l.uploaded_document_id,
          sd.document_type as source_document_type,
          sd.document_number as source_document_number,
          ud.original_filename as original_filename,
          row_number() over (
            partition by l.product_id
            order by
              case when l.status = 'activo' and coalesce(l.current_quantity, 0) > 0 then 0 else 1 end,
              l.expiry_date asc nulls last,
              l.received_date asc nulls last,
              l.created_at asc
          ) as fefo_position
        from public.admin_inventory_lots l
        left join public.admin_inventory_products p on p.id = l.product_id
        left join public.admin_supplier_records s on s.id = l.supplier_id
        left join public.admin_supplier_documents sd on sd.id = l.supplier_document_id
        left join public.admin_uploaded_documents ud on ud.id = l.uploaded_document_id
      )
      select
        *,
        case
          when status = 'activo' and coalesce(stock_actual, 0) > 0 and fefo_position = 1 then true
          else false
        end as is_fefo
      from ranked_lots
    $view$;
  end if;

  if to_regclass('public.admin_inventory_lots') is not null
     and to_regclass('public.admin_inventory_lot_movements') is not null
     and to_regclass('public.admin_supplier_documents') is not null
     and to_regclass('public.admin_uploaded_documents') is not null
     and to_regclass('public.admin_accounting_documents') is not null
     and to_regclass('public.admin_goods_reception_records') is not null
     and to_regclass('public.admin_label_records') is not null
     and to_regclass('public.admin_production_batches') is not null then
    execute $view$
      create or replace view public.admin_traceability_events_view as
      select
        ('uploaded:' || ud.id::text) as event_id,
        ud.uploaded_at as event_at,
        ud.uploaded_at::date as event_date,
        'documento_original'::text as event_type,
        null::text as product_name,
        null::text as batch_number,
        null::text as supplier_name,
        ud.id as uploaded_document_id,
        null::uuid as supplier_document_id,
        null::uuid as accounting_document_id,
        null::uuid as goods_reception_id,
        null::uuid as inventory_lot_id,
        null::uuid as production_batch_id,
        null::uuid as label_record_id,
        'admin_uploaded_documents'::text as source_table,
        coalesce(ud.original_filename, ud.detected_type, 'Documento original') as detail
      from public.admin_uploaded_documents ud

      union all

      select
        ('ocr:' || sd.id::text) as event_id,
        sd.created_at as event_at,
        sd.document_date as event_date,
        'ocr_proveedor'::text as event_type,
        null::text as product_name,
        null::text as batch_number,
        sd.supplier_name,
        sd.uploaded_document_id,
        sd.id as supplier_document_id,
        null::uuid as accounting_document_id,
        null::uuid as goods_reception_id,
        null::uuid as inventory_lot_id,
        null::uuid as production_batch_id,
        null::uuid as label_record_id,
        'admin_supplier_documents'::text as source_table,
        concat_ws(' · ', sd.document_type, sd.document_number, sd.original_filename) as detail
      from public.admin_supplier_documents sd

      union all

      select
        ('accounting:' || ad.id::text) as event_id,
        ad.created_at as event_at,
        ad.document_date as event_date,
        'documento_contable'::text as event_type,
        null::text as product_name,
        null::text as batch_number,
        ad.supplier_name,
        ad.uploaded_document_id,
        null::uuid as supplier_document_id,
        ad.id as accounting_document_id,
        null::uuid as goods_reception_id,
        null::uuid as inventory_lot_id,
        null::uuid as production_batch_id,
        null::uuid as label_record_id,
        'admin_accounting_documents'::text as source_table,
        concat_ws(' · ', ad.document_type, ad.document_number, ad.total_amount::text) as detail
      from public.admin_accounting_documents ad

      union all

      select
        ('reception:' || gr.id::text) as event_id,
        gr.created_at as event_at,
        gr.record_date as event_date,
        'recepcion_appcc'::text as event_type,
        gr.product as product_name,
        gr.batch_number,
        gr.supplier as supplier_name,
        gr.uploaded_document_id,
        gr.supplier_document_id,
        gr.accounting_document_id,
        gr.id as goods_reception_id,
        gr.inventory_lot_id,
        null::uuid as production_batch_id,
        null::uuid as label_record_id,
        'admin_goods_reception_records'::text as source_table,
        concat_ws(' · ', case when gr.accepted then 'Aceptado' else 'Rechazado' end, gr.status, gr.observations) as detail
      from public.admin_goods_reception_records gr

      union all

      select
        ('lot:' || l.id::text) as event_id,
        l.created_at as event_at,
        coalesce(l.received_date, l.created_at::date) as event_date,
        'lote_inventario'::text as event_type,
        l.product_name,
        l.batch_number,
        l.supplier_name,
        l.uploaded_document_id,
        l.supplier_document_id,
        l.accounting_document_id,
        l.goods_reception_id,
        l.id as inventory_lot_id,
        null::uuid as production_batch_id,
        null::uuid as label_record_id,
        'admin_inventory_lots'::text as source_table,
        concat_ws(' · ', l.status, l.current_quantity::text, l.unit, l.location) as detail
      from public.admin_inventory_lots l

      union all

      select
        ('lot_movement:' || lm.id::text) as event_id,
        lm.created_at as event_at,
        lm.movement_date as event_date,
        coalesce(lm.movement_type, 'movimiento_lote') as event_type,
        l.product_name,
        l.batch_number,
        l.supplier_name,
        l.uploaded_document_id,
        l.supplier_document_id,
        l.accounting_document_id,
        l.goods_reception_id,
        lm.lot_id as inventory_lot_id,
        null::uuid as production_batch_id,
        null::uuid as label_record_id,
        'admin_inventory_lot_movements'::text as source_table,
        concat_ws(' · ', lm.quantity::text, lm.unit, lm.reason, lm.observations) as detail
      from public.admin_inventory_lot_movements lm
      left join public.admin_inventory_lots l on l.id = lm.lot_id

      union all

      select
        ('production:' || pb.id::text) as event_id,
        pb.created_at as event_at,
        pb.production_date as event_date,
        'produccion_interna'::text as event_type,
        pb.output_product as product_name,
        pb.batch_code as batch_number,
        pb.source_supplier as supplier_name,
        pb.source_uploaded_document_id as uploaded_document_id,
        null::uuid as supplier_document_id,
        null::uuid as accounting_document_id,
        null::uuid as goods_reception_id,
        pb.output_inventory_lot_id as inventory_lot_id,
        pb.id as production_batch_id,
        null::uuid as label_record_id,
        'admin_production_batches'::text as source_table,
        concat_ws(' · ', pb.source_product, pb.source_batch_number, pb.output_quantity::text, pb.output_unit) as detail
      from public.admin_production_batches pb

      union all

      select
        ('label:' || lr.id::text) as event_id,
        lr.created_at as event_at,
        lr.created_at::date as event_date,
        'etiqueta'::text as event_type,
        lr.product as product_name,
        lr.batch as batch_number,
        lr.supplier as supplier_name,
        lr.uploaded_document_id,
        lr.supplier_document_id,
        lr.accounting_document_id,
        null::uuid as goods_reception_id,
        lr.inventory_lot_id,
        lr.production_batch_id,
        lr.id as label_record_id,
        'admin_label_records'::text as source_table,
        concat_ws(' · ', lr.model, lr.template, lr.printer, lr.copies::text) as detail
      from public.admin_label_records lr
    $view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_inventory_lot_stock_view') is not null then
    comment on view public.admin_inventory_lot_stock_view is 'Read model for stock by real inventory lot, including FEFO position and source document context.';
    revoke all on public.admin_inventory_lot_stock_view from anon, authenticated;
    grant select on public.admin_inventory_lot_stock_view to service_role;
  end if;

  if to_regclass('public.admin_traceability_events_view') is not null then
    comment on view public.admin_traceability_events_view is 'Unified ERP traceability event stream for documents, OCR, accounting, APPCC reception, inventory lots, production and labels.';
    revoke all on public.admin_traceability_events_view from anon, authenticated;
    grant select on public.admin_traceability_events_view to service_role;
  end if;
end $$;
