-- Contratos documentales para futura subida bulk.
-- Ejecutar despues de supabase/admin_kiosko_accounting.sql.
-- No migra datos ni impacta tablas especificas: refuerza admin_uploaded_documents
-- como raiz unica por archivo subido.

alter table if exists public.admin_uploaded_documents
  add column if not exists processing_status text default 'uploaded',
  add column if not exists selected_type text,
  add column if not exists confirmed_type text,
  add column if not exists classification_confidence numeric,
  add column if not exists upload_group_id uuid,
  add column if not exists upload_sequence integer,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz,
  add column if not exists processing_error text,
  add column if not exists processing_attempts integer default 0,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

do $$
begin
  if to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_uploaded_documents_processing_status_chk') then
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_processing_status_chk
      check (
        processing_status is null
        or processing_status in ('uploaded', 'processing', 'needs_review', 'confirmed', 'failed', 'archived')
      )
      not valid;
  end if;

  if to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_uploaded_documents_selected_type_chk') then
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_selected_type_chk
      check (
        selected_type is null
        or selected_type in (
          'invoice',
          'delivery_note',
          'receipt',
          'supplier_traceability_label',
          'sanitary_document',
          'technical_sheet',
          'supplier_contract',
          'maintenance_document',
          'training_document',
          'other'
        )
      )
      not valid;
  end if;

  if to_regclass('public.admin_uploaded_documents') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_uploaded_documents_confirmed_type_chk') then
    alter table public.admin_uploaded_documents
      add constraint admin_uploaded_documents_confirmed_type_chk
      check (
        confirmed_type is null
        or confirmed_type in (
          'invoice',
          'delivery_note',
          'receipt',
          'supplier_traceability_label',
          'sanitary_document',
          'technical_sheet',
          'supplier_contract',
          'maintenance_document',
          'training_document',
          'other'
        )
      )
      not valid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_uploaded_documents') is not null then
    create index if not exists admin_uploaded_documents_processing_status_idx
      on public.admin_uploaded_documents (processing_status, uploaded_at desc);

    create index if not exists admin_uploaded_documents_selected_type_idx
      on public.admin_uploaded_documents (selected_type);

    create index if not exists admin_uploaded_documents_confirmed_type_idx
      on public.admin_uploaded_documents (confirmed_type);

    create index if not exists admin_uploaded_documents_upload_group_idx
      on public.admin_uploaded_documents (upload_group_id, upload_sequence);

    create index if not exists admin_uploaded_documents_queue_idx
      on public.admin_uploaded_documents (processing_status, created_at)
      where processing_status in ('uploaded', 'processing', 'needs_review', 'failed');

    comment on column public.admin_uploaded_documents.processing_status is
      'Estado tecnico/documental para subida individual o bulk: uploaded, processing, needs_review, confirmed, failed, archived.';

    comment on column public.admin_uploaded_documents.selected_type is
      'Tipo documental seleccionado manualmente antes de confirmar. No sustituye al tipo detectado por IA.';

    comment on column public.admin_uploaded_documents.confirmed_type is
      'Tipo documental confirmado por usuario o revision final. Debe guiar la derivacion a contabilidad, compras, APPCC, inventario, trazabilidad, documentacion sanitaria o etiquetas.';

    comment on column public.admin_uploaded_documents.classification_confidence is
      'Confianza de clasificacion documental calculada por IA cuando aplique.';

    comment on column public.admin_uploaded_documents.upload_group_id is
      'Identificador comun para agrupar archivos de una subida multiple.';

    comment on column public.admin_uploaded_documents.upload_sequence is
      'Orden relativo del archivo dentro de una subida multiple.';

    comment on column public.admin_uploaded_documents.processing_error is
      'Mensaje tecnico resumido para documentos failed; mostrar al usuario solo como aviso profesional.';

    comment on column public.admin_uploaded_documents.processing_attempts is
      'Numero de intentos de procesamiento OCR/clasificacion para este archivo.';
  end if;
end $$;
