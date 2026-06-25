create extension if not exists pgcrypto;

create table if not exists public.admin_supplier_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  document_type text,
  document_number text,
  document_date date,
  supplier_name text,
  supplier_tax_id text,
  total_amount numeric,
  original_filename text,
  ocr_status text,
  ocr_json jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  source text default 'admin-kiosko-ai'
);

create table if not exists public.admin_traceability_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  supplier_document_id uuid references public.admin_supplier_documents(id) on delete cascade,
  product_name text,
  quantity text,
  batch_number text,
  expiry_date date,
  storage_type text,
  accepted boolean default true,
  observations text
);

create table if not exists public.admin_ai_processing_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  document_name text,
  detected_type text,
  status text,
  summary text,
  raw_json jsonb,
  error_message text
);

alter table public.admin_supplier_documents enable row level security;
alter table public.admin_traceability_items enable row level security;
alter table public.admin_ai_processing_logs enable row level security;

revoke all on public.admin_supplier_documents from anon, authenticated;
revoke all on public.admin_traceability_items from anon, authenticated;
revoke all on public.admin_ai_processing_logs from anon, authenticated;

grant all on public.admin_supplier_documents to service_role;
grant all on public.admin_traceability_items to service_role;
grant all on public.admin_ai_processing_logs to service_role;

drop policy if exists "admin_supplier_documents_service_role_all" on public.admin_supplier_documents;
create policy "admin_supplier_documents_service_role_all"
  on public.admin_supplier_documents
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_traceability_items_service_role_all" on public.admin_traceability_items;
create policy "admin_traceability_items_service_role_all"
  on public.admin_traceability_items
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_ai_processing_logs_service_role_all" on public.admin_ai_processing_logs;
create policy "admin_ai_processing_logs_service_role_all"
  on public.admin_ai_processing_logs
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists admin_supplier_documents_created_at_idx on public.admin_supplier_documents (created_at desc);
create index if not exists admin_traceability_items_created_at_idx on public.admin_traceability_items (created_at desc);
create index if not exists admin_traceability_items_document_idx on public.admin_traceability_items (supplier_document_id);
create index if not exists admin_ai_processing_logs_created_at_idx on public.admin_ai_processing_logs (created_at desc);
