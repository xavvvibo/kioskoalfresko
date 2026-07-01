create extension if not exists pgcrypto;

create table if not exists public.admin_uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  original_filename text,
  mime_type text,
  file_size bigint,
  uploaded_at timestamptz default now(),
  uploaded_by text,
  detected_type text,
  ocr_json jsonb default '{}'::jsonb,
  review_status text default 'pendiente_revision',
  corrections jsonb default '{}'::jsonb,
  related_record_type text,
  related_record_id uuid,
  storage_bucket text,
  storage_path text,
  storage_status text default 'metadata_only',
  source text default 'admin-kiosko-ocr'
);

create table if not exists public.admin_accounting_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  uploaded_document_id uuid references public.admin_uploaded_documents(id) on delete set null,
  supplier_id uuid references public.admin_supplier_records(id) on delete set null,
  supplier_name text,
  supplier_tax_id text,
  document_type text,
  document_number text,
  document_date date,
  taxable_base numeric default 0,
  vat_amount numeric default 0,
  total_amount numeric default 0,
  reconciliation_status text default 'pendiente_conciliar',
  review_status text default 'pendiente_revision',
  observations text,
  source text default 'admin-kiosko-accounting'
);

create table if not exists public.admin_accounting_document_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  accounting_document_id uuid references public.admin_accounting_documents(id) on delete cascade,
  product_name text,
  category text,
  quantity numeric,
  unit text,
  unit_price numeric,
  taxable_base numeric,
  vat_rate numeric,
  vat_amount numeric,
  total_amount numeric,
  batch_number text,
  expiry_date date,
  inventory_product_id uuid references public.admin_inventory_products(id) on delete set null,
  traceability_item_id uuid references public.admin_traceability_items(id) on delete set null
);

create table if not exists public.admin_accounting_reconciliations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  invoice_document_id uuid references public.admin_accounting_documents(id) on delete cascade,
  delivery_note_document_id uuid references public.admin_accounting_documents(id) on delete cascade,
  status text default 'pendiente_conciliar',
  difference_type text,
  difference_amount numeric,
  observations text,
  reviewed_by text,
  reviewed_at timestamptz
);

create table if not exists public.admin_document_corrections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  document_id uuid references public.admin_uploaded_documents(id) on delete cascade,
  accounting_document_id uuid references public.admin_accounting_documents(id) on delete cascade,
  field_name text not null,
  ocr_value text,
  final_value text,
  responsible text,
  source text default 'admin-kiosko-ocr-review'
);

create table if not exists public.admin_user_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  display_name text not null,
  email text,
  role text default 'employee',
  active boolean default true,
  last_access_at timestamptz,
  status text default 'activo',
  permissions jsonb default '{}'::jsonb,
  password_status text default 'pendiente_configuracion',
  observations text
);

create table if not exists public.admin_printer_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  printer_name text default 'Zebra ZD421',
  model text default 'Zebra ZD421',
  resolution text default '203 dpi',
  label_size text default '58x40 mm',
  default_copies int default 1,
  language text default 'ZPL',
  active boolean default true,
  browser_print_status text default 'pendiente_comprobar',
  observations text
);

alter table if exists public.admin_uploaded_documents
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_status text default 'metadata_only',
  add column if not exists review_status text default 'pendiente_revision',
  add column if not exists corrections jsonb default '{}'::jsonb,
  add column if not exists related_record_type text,
  add column if not exists related_record_id uuid;

alter table if exists public.admin_accounting_documents
  add column if not exists uploaded_document_id uuid references public.admin_uploaded_documents(id) on delete set null,
  add column if not exists reconciliation_status text default 'pendiente_conciliar',
  add column if not exists review_status text default 'pendiente_revision',
  add column if not exists observations text;

alter table if exists public.admin_goods_reception_records
  add column if not exists uploaded_document_id uuid references public.admin_uploaded_documents(id) on delete set null,
  add column if not exists supplier_document_id uuid references public.admin_supplier_documents(id) on delete set null;

alter table if exists public.admin_uploaded_documents enable row level security;
alter table if exists public.admin_accounting_documents enable row level security;
alter table if exists public.admin_accounting_document_items enable row level security;
alter table if exists public.admin_accounting_reconciliations enable row level security;
alter table if exists public.admin_document_corrections enable row level security;
alter table if exists public.admin_user_profiles enable row level security;
alter table if exists public.admin_printer_settings enable row level security;

revoke all on public.admin_uploaded_documents from anon, authenticated;
revoke all on public.admin_accounting_documents from anon, authenticated;
revoke all on public.admin_accounting_document_items from anon, authenticated;
revoke all on public.admin_accounting_reconciliations from anon, authenticated;
revoke all on public.admin_document_corrections from anon, authenticated;
revoke all on public.admin_user_profiles from anon, authenticated;
revoke all on public.admin_printer_settings from anon, authenticated;

grant all on public.admin_uploaded_documents to service_role;
grant all on public.admin_accounting_documents to service_role;
grant all on public.admin_accounting_document_items to service_role;
grant all on public.admin_accounting_reconciliations to service_role;
grant all on public.admin_document_corrections to service_role;
grant all on public.admin_user_profiles to service_role;
grant all on public.admin_printer_settings to service_role;

drop policy if exists "admin_uploaded_documents_service_role_all" on public.admin_uploaded_documents;
create policy "admin_uploaded_documents_service_role_all" on public.admin_uploaded_documents for all to service_role using (true) with check (true);
drop policy if exists "admin_accounting_documents_service_role_all" on public.admin_accounting_documents;
create policy "admin_accounting_documents_service_role_all" on public.admin_accounting_documents for all to service_role using (true) with check (true);
drop policy if exists "admin_accounting_document_items_service_role_all" on public.admin_accounting_document_items;
create policy "admin_accounting_document_items_service_role_all" on public.admin_accounting_document_items for all to service_role using (true) with check (true);
drop policy if exists "admin_accounting_reconciliations_service_role_all" on public.admin_accounting_reconciliations;
create policy "admin_accounting_reconciliations_service_role_all" on public.admin_accounting_reconciliations for all to service_role using (true) with check (true);
drop policy if exists "admin_document_corrections_service_role_all" on public.admin_document_corrections;
create policy "admin_document_corrections_service_role_all" on public.admin_document_corrections for all to service_role using (true) with check (true);
drop policy if exists "admin_user_profiles_service_role_all" on public.admin_user_profiles;
create policy "admin_user_profiles_service_role_all" on public.admin_user_profiles for all to service_role using (true) with check (true);
drop policy if exists "admin_printer_settings_service_role_all" on public.admin_printer_settings;
create policy "admin_printer_settings_service_role_all" on public.admin_printer_settings for all to service_role using (true) with check (true);

create index if not exists admin_uploaded_documents_uploaded_at_idx on public.admin_uploaded_documents (uploaded_at desc);
create index if not exists admin_uploaded_documents_type_idx on public.admin_uploaded_documents (detected_type);
create index if not exists admin_accounting_documents_date_idx on public.admin_accounting_documents (document_date desc);
create index if not exists admin_accounting_documents_supplier_idx on public.admin_accounting_documents (lower(supplier_name));
create index if not exists admin_accounting_documents_type_idx on public.admin_accounting_documents (document_type);
create index if not exists admin_accounting_documents_status_idx on public.admin_accounting_documents (reconciliation_status);
create index if not exists admin_accounting_documents_review_idx on public.admin_accounting_documents (review_status);
create index if not exists admin_accounting_items_document_idx on public.admin_accounting_document_items (accounting_document_id);
create index if not exists admin_accounting_reconciliations_invoice_idx on public.admin_accounting_reconciliations (invoice_document_id);
create index if not exists admin_accounting_reconciliations_delivery_idx on public.admin_accounting_reconciliations (delivery_note_document_id);
create index if not exists admin_document_corrections_document_idx on public.admin_document_corrections (document_id, created_at desc);
create index if not exists admin_user_profiles_role_idx on public.admin_user_profiles (role);
create index if not exists admin_printer_settings_active_idx on public.admin_printer_settings (active);
