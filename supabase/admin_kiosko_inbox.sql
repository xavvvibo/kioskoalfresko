create extension if not exists pgcrypto;

-- Bandeja de entrada inteligente del ERP APPCC.
-- admin_uploaded_documents sigue siendo la raiz documental unica.
-- Este SQL es aditivo, idempotente y no mueve datos existentes.

alter table if exists public.admin_uploaded_documents
  add column if not exists upload_group_id uuid,
  add column if not exists upload_sequence integer,
  add column if not exists expediente_id uuid,
  add column if not exists detected_type text,
  add column if not exists selected_type text,
  add column if not exists confirmed_type text,
  add column if not exists classification_source text,
  add column if not exists classification_confidence numeric,
  add column if not exists classification_reason text,
  add column if not exists processing_status text default 'uploaded',
  add column if not exists processing_error text,
  add column if not exists corrections jsonb default '{}'::jsonb,
  add column if not exists ocr_attempts integer not null default 0,
  add column if not exists ocr_started_at timestamptz,
  add column if not exists ocr_completed_at timestamptz,
  add column if not exists ocr_model text,
  add column if not exists ocr_json jsonb default '{}'::jsonb,
  add column if not exists ocr_text text,
  add column if not exists ocr_warnings text[] default '{}'::text[],
  add column if not exists ocr_reprocess_requested boolean default false,
  add column if not exists file_hash text,
  add column if not exists possible_duplicate boolean default false,
  add column if not exists duplicate_of uuid,
  add column if not exists duplicate_score numeric,
  add column if not exists document_fingerprint text,
  add column if not exists normalized_supplier_id uuid,
  add column if not exists normalized_product_ids uuid[] default '{}'::uuid[],
  add column if not exists related_record_type text,
  add column if not exists related_record_id uuid,
  add column if not exists import_status text,
  add column if not exists import_started_at timestamptz,
  add column if not exists import_completed_at timestamptz,
  add column if not exists import_duration_ms integer,
  add column if not exists import_handler_results jsonb default '[]'::jsonb,
  add column if not exists import_error text,
  add column if not exists imported_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists archived_at timestamptz;

create or replace function public.admin_normalize_document_type(p_type text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(p_type, '')))
    when '' then 'other'
    when 'factura' then 'purchase_invoice'
    when 'invoice' then 'purchase_invoice'
    when 'purchase_invoice' then 'purchase_invoice'
    when 'rectificativa' then 'credit_note'
    when 'abono' then 'credit_note'
    when 'credit_note' then 'credit_note'
    when 'albaran' then 'purchase_delivery_note'
    when 'albarán' then 'purchase_delivery_note'
    when 'delivery_note' then 'purchase_delivery_note'
    when 'purchase_delivery_note' then 'purchase_delivery_note'
    when 'recibo' then 'receipt'
    when 'ticket' then 'receipt'
    when 'receipt' then 'receipt'
    when 'etiqueta' then 'supplier_traceability_label'
    when 'etiqueta_lote' then 'supplier_traceability_label'
    when 'supplier_traceability_label' then 'supplier_traceability_label'
    when 'etiqueta_trazabilidad' then 'traceability_label'
    when 'traceability_label' then 'traceability_label'
    when 'certificado' then 'sanitary_document'
    when 'certificado_ddd' then 'sanitary_document'
    when 'boletin_sanitario' then 'sanitary_document'
    when 'boletín_sanitario' then 'sanitary_document'
    when 'analisis_agua' then 'sanitary_document'
    when 'análisis_agua' then 'sanitary_document'
    when 'sanitary_document' then 'sanitary_document'
    when 'ficha_tecnica' then 'technical_sheet'
    when 'ficha_técnica' then 'technical_sheet'
    when 'technical_sheet' then 'technical_sheet'
    when 'contrato' then 'supplier_contract'
    when 'contrato_ddd' then 'supplier_contract'
    when 'supplier_contract' then 'supplier_contract'
    when 'mantenimiento' then 'maintenance_document'
    when 'maintenance_document' then 'maintenance_document'
    when 'formacion' then 'training_document'
    when 'formación' then 'training_document'
    when 'certificado_manipulador' then 'training_document'
    when 'training_document' then 'training_document'
    when 'appcc' then 'appcc_document'
    when 'haccp' then 'appcc_document'
    when 'memoria_sanitaria' then 'appcc_document'
    when 'appcc_document' then 'appcc_document'
    when 'accounting_document' then 'accounting_document'
    when 'contabilidad' then 'accounting_document'
    when 'otro' then 'other'
    when 'other' then 'other'
    else 'other'
  end;
$$;

comment on function public.admin_normalize_document_type(text) is 'Normaliza aliases legacy al catalogo documental canonico del ERP APPCC.';

do $$
begin
  if to_regclass('public.admin_uploaded_documents') is not null then
    begin
      alter table public.admin_uploaded_documents
        alter column upload_group_id type uuid
        using case
          when upload_group_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then upload_group_id::text::uuid
          else null
        end;
    exception
      when others then
        raise notice 'upload_group_id no se ha convertido automaticamente a uuid: %', sqlerrm;
    end;
  end if;
end $$;

update public.admin_uploaded_documents
set
  detected_type = case when detected_type is null then null else public.admin_normalize_document_type(detected_type) end,
  selected_type = case when selected_type is null then null else public.admin_normalize_document_type(selected_type) end,
  confirmed_type = case when confirmed_type is null then null else public.admin_normalize_document_type(confirmed_type) end
where to_regclass('public.admin_uploaded_documents') is not null
  and (
    detected_type is not null
    or selected_type is not null
    or confirmed_type is not null
  );

update public.admin_uploaded_documents
set processing_status = case
  when processing_status in ('failed', 'archived', 'processing', 'classified', 'needs_review', 'confirmed', 'imported') then processing_status
  when review_status in ('rechazado') then 'failed'
  when review_status in ('anulado') then 'archived'
  when related_record_id is not null and review_status in ('revisado', 'confirmado') then 'confirmed'
  when related_record_id is not null then 'imported'
  when review_status in ('confirmado') then 'confirmed'
  when review_status in ('revisado', 'pendiente_revision') then 'needs_review'
  else coalesce(processing_status, 'uploaded')
end
where to_regclass('public.admin_uploaded_documents') is not null;

update public.admin_uploaded_documents
set review_status = case
  when processing_status in ('confirmed', 'imported') then 'confirmado'
  when processing_status = 'failed' then 'rechazado'
  when processing_status = 'archived' then 'anulado'
  else 'pendiente_revision'
end
where to_regclass('public.admin_uploaded_documents') is not null;

update public.admin_uploaded_documents
set related_record_type = case related_record_type
  when 'admin_supplier_documents' then 'supplier_document'
  when 'admin_accounting_documents' then 'accounting_document'
  when 'admin_goods_reception_records' then 'inventory_reception'
  when 'admin_inventory_lots' then 'inventory_lot'
  when 'admin_label_records' then 'traceability_label'
  when 'admin_maintenance_records' then 'maintenance_document'
  when 'admin_training_records' then 'training_document'
  else related_record_type
end
where to_regclass('public.admin_uploaded_documents') is not null
  and related_record_type is not null;

update public.admin_uploaded_documents
set document_fingerprint = coalesce(
  file_hash,
  md5(lower(coalesce(original_filename, '')) || '|' || coalesce(file_size::text, '') || '|' || coalesce(storage_path, ''))
)
where to_regclass('public.admin_uploaded_documents') is not null
  and document_fingerprint is null;

with duplicates as (
  select
    id,
    first_value(id) over (partition by document_fingerprint order by uploaded_at nulls last, created_at nulls last, id) as first_id,
    count(*) over (partition by document_fingerprint) as duplicate_count
  from public.admin_uploaded_documents
  where document_fingerprint is not null
)
update public.admin_uploaded_documents d
set
  possible_duplicate = true,
  duplicate_of = duplicates.first_id,
  duplicate_score = 0.98
from duplicates
where d.id = duplicates.id
  and duplicates.duplicate_count > 1
  and d.id <> duplicates.first_id;

do $$
begin
  if to_regclass('public.admin_uploaded_documents') is not null then
    create index if not exists admin_uploaded_documents_inbox_status_idx
      on public.admin_uploaded_documents (processing_status, uploaded_at desc);

    create index if not exists admin_uploaded_documents_inbox_group_idx
      on public.admin_uploaded_documents (upload_group_id, upload_sequence);

    create index if not exists admin_uploaded_documents_inbox_type_idx
      on public.admin_uploaded_documents (coalesce(confirmed_type, selected_type, detected_type));

    create index if not exists admin_uploaded_documents_inbox_expediente_idx
      on public.admin_uploaded_documents (expediente_id);

    create index if not exists admin_uploaded_documents_inbox_corrections_idx
      on public.admin_uploaded_documents using gin (corrections);

    create index if not exists admin_uploaded_documents_inbox_ocr_queue_idx
      on public.admin_uploaded_documents (processing_status, ocr_reprocess_requested, uploaded_at);

    create index if not exists admin_uploaded_documents_inbox_ocr_completed_idx
      on public.admin_uploaded_documents (ocr_completed_at desc);

    create index if not exists admin_uploaded_documents_inbox_ocr_json_idx
      on public.admin_uploaded_documents using gin (ocr_json);

    create index if not exists admin_uploaded_documents_inbox_duplicate_idx
      on public.admin_uploaded_documents (possible_duplicate, duplicate_of);

    create index if not exists admin_uploaded_documents_inbox_fingerprint_idx
      on public.admin_uploaded_documents (document_fingerprint);

    create index if not exists admin_uploaded_documents_inbox_imported_idx
      on public.admin_uploaded_documents (imported_at desc);

    create index if not exists admin_uploaded_documents_inbox_import_status_idx
      on public.admin_uploaded_documents (import_status, import_completed_at desc);

    create index if not exists admin_uploaded_documents_inbox_import_results_idx
      on public.admin_uploaded_documents using gin (import_handler_results);
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_uploaded_documents') is not null then
    comment on column public.admin_uploaded_documents.upload_group_id is 'Identificador comun para una subida masiva o expediente documental.';
    comment on column public.admin_uploaded_documents.expediente_id is 'Identificador futuro de expediente ERP; la UI puede agrupar por upload_group_id hasta que exista expediente persistido.';
    comment on column public.admin_uploaded_documents.detected_type is 'Tipo documental canonico propuesto por IA/OCR: purchase_invoice, purchase_delivery_note, receipt, supplier_traceability_label, traceability_label, technical_sheet, sanitary_document, appcc_document, maintenance_document, supplier_contract, training_document, accounting_document, credit_note, other.';
    comment on column public.admin_uploaded_documents.selected_type is 'Tipo elegido manualmente antes de confirmar.';
    comment on column public.admin_uploaded_documents.confirmed_type is 'Tipo confirmado por usuario tras revision.';
    comment on column public.admin_uploaded_documents.processing_status is 'Estado canonico de bandeja: uploaded, processing, classified, needs_review, confirmed, imported, failed, archived.';
    comment on column public.admin_uploaded_documents.review_status is 'Campo legacy mantenido por compatibilidad; no debe usarse como estado operativo.';
    comment on column public.admin_uploaded_documents.classification_confidence is 'Confianza de clasificacion documental entre 0 y 1.';
    comment on column public.admin_uploaded_documents.corrections is 'Campos corregidos durante la revision antes de derivar a contabilidad, compras, APPCC, inventario, trazabilidad o etiquetas.';
    comment on column public.admin_uploaded_documents.ocr_attempts is 'Numero de intentos de OCR batch ejecutados desde Inbox.';
    comment on column public.admin_uploaded_documents.ocr_started_at is 'Fecha/hora de inicio del ultimo OCR batch.';
    comment on column public.admin_uploaded_documents.ocr_completed_at is 'Fecha/hora de finalizacion del ultimo OCR batch.';
    comment on column public.admin_uploaded_documents.ocr_model is 'Modelo usado por OpenAI Vision/OCR en el ultimo procesamiento.';
    comment on column public.admin_uploaded_documents.ocr_json is 'Resultado OCR estructurado del documento raiz; no crea impactos definitivos hasta confirmacion.';
    comment on column public.admin_uploaded_documents.ocr_text is 'Texto bruto devuelto por OCR/OpenAI cuando existe.';
    comment on column public.admin_uploaded_documents.ocr_warnings is 'Avisos APPCC/operativos detectados durante OCR que obligan o recomiendan revision.';
    comment on column public.admin_uploaded_documents.ocr_reprocess_requested is 'Marca de cola para reprocesar OCR sin crear un nuevo documento raiz.';
    comment on column public.admin_uploaded_documents.possible_duplicate is 'Marca advertencia de posible documento duplicado; nunca bloquea la subida.';
    comment on column public.admin_uploaded_documents.duplicate_of is 'Documento raiz posible al que duplica este registro.';
    comment on column public.admin_uploaded_documents.duplicate_score is 'Puntuacion de similitud de duplicado entre 0 y 1.';
    comment on column public.admin_uploaded_documents.related_record_type is 'Tipo de dominio relacionado, nunca nombre fisico de tabla.';
    comment on column public.admin_uploaded_documents.import_status is 'Resultado agregado del pipeline de importacion: success, warning, needs_review, failed.';
    comment on column public.admin_uploaded_documents.import_handler_results is 'Resultados por handler del orquestador documental.';
    comment on column public.admin_uploaded_documents.import_duration_ms is 'Duracion total del pipeline de importacion documental en milisegundos.';
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_uploaded_documents') is not null then
    alter table public.admin_uploaded_documents
      drop constraint if exists admin_uploaded_documents_processing_status_chk;
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_processing_status_chk
      check (processing_status in ('uploaded', 'processing', 'classified', 'needs_review', 'confirmed', 'imported', 'failed', 'archived'))
      not valid;

    alter table public.admin_uploaded_documents
      drop constraint if exists admin_uploaded_documents_detected_type_chk;
    alter table public.admin_uploaded_documents
      drop constraint if exists admin_uploaded_documents_selected_type_chk;
    alter table public.admin_uploaded_documents
      drop constraint if exists admin_uploaded_documents_confirmed_type_chk;
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_detected_type_chk
      check (
        detected_type is null
        or detected_type in (
          'purchase_invoice',
          'purchase_delivery_note',
          'receipt',
          'supplier_traceability_label',
          'traceability_label',
          'technical_sheet',
          'sanitary_document',
          'appcc_document',
          'maintenance_document',
          'supplier_contract',
          'training_document',
          'accounting_document',
          'credit_note',
          'other'
        )
      )
      not valid;
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_selected_type_chk
      check (
        selected_type is null
        or selected_type in (
          'purchase_invoice',
          'purchase_delivery_note',
          'receipt',
          'supplier_traceability_label',
          'traceability_label',
          'technical_sheet',
          'sanitary_document',
          'appcc_document',
          'maintenance_document',
          'supplier_contract',
          'training_document',
          'accounting_document',
          'credit_note',
          'other'
        )
      )
      not valid;
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_confirmed_type_chk
      check (
        confirmed_type is null
        or confirmed_type in (
          'purchase_invoice',
          'purchase_delivery_note',
          'receipt',
          'supplier_traceability_label',
          'traceability_label',
          'technical_sheet',
          'sanitary_document',
          'appcc_document',
          'maintenance_document',
          'supplier_contract',
          'training_document',
          'accounting_document',
          'credit_note',
          'other'
        )
      )
      not valid;

    alter table public.admin_uploaded_documents
      drop constraint if exists admin_uploaded_documents_related_record_type_chk;
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_related_record_type_chk
      check (
        related_record_type is null
        or related_record_type in (
          'supplier_document',
          'purchase_invoice',
          'purchase_delivery_note',
          'inventory_reception',
          'inventory_lot',
          'appcc_record',
          'technical_sheet',
          'traceability_label',
          'accounting_document',
          'maintenance_document',
          'training_document'
        )
      )
      not valid;

    alter table public.admin_uploaded_documents
      drop constraint if exists admin_uploaded_documents_import_status_chk;
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_import_status_chk
      check (import_status is null or import_status in ('success', 'warning', 'needs_review', 'failed', 'processing'))
      not valid;
  end if;
end $$;

drop view if exists public.admin_inbox_documents_view;
create or replace view public.admin_inbox_documents_view as
select
  id,
  uploaded_at,
  original_filename,
  mime_type,
  file_size,
  storage_bucket,
  storage_path,
  upload_group_id,
  upload_sequence,
  expediente_id,
  coalesce(confirmed_type, selected_type, detected_type, 'other') as effective_type,
  detected_type,
  selected_type,
  confirmed_type,
  processing_status,
  review_status,
  classification_source,
  classification_confidence,
  classification_reason,
  processing_error,
  ocr_attempts,
  ocr_started_at,
  ocr_completed_at,
  ocr_model,
  ocr_json,
  ocr_warnings,
  ocr_reprocess_requested,
  possible_duplicate,
  duplicate_of,
  duplicate_score,
  document_fingerprint,
  corrections,
  related_record_type,
  related_record_id,
  import_status,
  import_started_at,
  import_completed_at,
  import_duration_ms,
  import_handler_results,
  import_error,
  imported_at
from public.admin_uploaded_documents;

comment on view public.admin_inbox_documents_view is 'Vista de lectura para la bandeja de entrada inteligente; no sustituye admin_uploaded_documents como raiz documental.';

create or replace function public.admin_inbox_bulk_update(
  p_document_ids uuid[],
  p_action text,
  p_confirmed_type text default null,
  p_duplicate_of uuid default null,
  p_responsible text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  if p_document_ids is null or array_length(p_document_ids, 1) is null then
    raise exception 'No hay documentos seleccionados.';
  end if;

  if p_action not in ('confirm', 'archive', 'change_type', 'reprocess_ocr', 'mark_duplicate') then
    raise exception 'Accion masiva no permitida: %', p_action;
  end if;

  if p_action = 'confirm' then
    update public.admin_uploaded_documents
    set
      updated_at = now(),
      processing_status = 'confirmed',
      review_status = 'confirmado',
      confirmed_type = public.admin_normalize_document_type(coalesce(p_confirmed_type, confirmed_type, selected_type, detected_type, 'other')),
      selected_type = public.admin_normalize_document_type(coalesce(p_confirmed_type, selected_type, detected_type, 'other')),
      confirmed_by = coalesce(p_responsible, confirmed_by),
      confirmed_at = now()
    where id = any(p_document_ids);
    get diagnostics v_updated = row_count;
  elsif p_action = 'archive' then
    update public.admin_uploaded_documents
    set
      updated_at = now(),
      processing_status = 'archived',
      review_status = 'anulado',
      archived_by = coalesce(p_responsible, archived_by),
      archived_at = now()
    where id = any(p_document_ids);
    get diagnostics v_updated = row_count;
  elsif p_action = 'change_type' then
    update public.admin_uploaded_documents
    set
      updated_at = now(),
      processing_status = 'needs_review',
      review_status = 'pendiente_revision',
      selected_type = public.admin_normalize_document_type(coalesce(p_confirmed_type, selected_type, detected_type, 'other'))
    where id = any(p_document_ids);
    get diagnostics v_updated = row_count;
  elsif p_action = 'reprocess_ocr' then
    update public.admin_uploaded_documents
    set
      updated_at = now(),
      processing_status = 'uploaded',
      review_status = 'pendiente_revision',
      processing_error = null,
      ocr_reprocess_requested = true
    where id = any(p_document_ids)
      and processing_status <> 'imported';
    get diagnostics v_updated = row_count;
  elsif p_action = 'mark_duplicate' then
    update public.admin_uploaded_documents
    set
      updated_at = now(),
      possible_duplicate = true,
      duplicate_of = p_duplicate_of,
      duplicate_score = case when p_duplicate_of is not null then 1 else coalesce(duplicate_score, 0.8) end
    where id = any(p_document_ids);
    get diagnostics v_updated = row_count;
  end if;

  return jsonb_build_object('updated', v_updated, 'action', p_action);
end $$;

grant execute on function public.admin_inbox_bulk_update(uuid[], text, text, uuid, text) to service_role;
comment on function public.admin_inbox_bulk_update(uuid[], text, text, uuid, text) is 'Actualiza documentos de bandeja en una unica transaccion PostgreSQL para acciones masivas operativas.';
