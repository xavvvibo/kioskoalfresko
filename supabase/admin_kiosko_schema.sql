create extension if not exists pgcrypto;

create table if not exists public.admin_temperature_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  record_time time,
  responsible text,
  status text not null,
  observations text,
  created_by text,
  source text default 'admin-kiosko',
  equipment text not null,
  temperature numeric not null
);

create table if not exists public.admin_cleaning_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  record_time time,
  responsible text,
  status text,
  observations text,
  created_by text,
  source text default 'admin-kiosko',
  area text not null,
  shift text,
  cleaning_done boolean default false,
  products_used text
);

create table if not exists public.admin_fryer_oil_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  record_time time,
  responsible text,
  status text,
  observations text,
  created_by text,
  source text default 'admin-kiosko',
  fryer text not null,
  oil_status text not null,
  oil_changed boolean default false,
  polar_compounds text,
  color_smell_check text
);

create table if not exists public.admin_goods_reception_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  record_time time,
  responsible text,
  status text,
  observations text,
  created_by text,
  source text default 'admin-kiosko',
  supplier text not null,
  product text not null,
  delivery_temperature numeric,
  accepted boolean default true,
  batch_number text,
  expiry_date date
);

create table if not exists public.admin_incident_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  record_time time,
  responsible text,
  status text,
  observations text,
  created_by text,
  source text default 'admin-kiosko',
  incident_type text not null,
  severity text,
  corrective_action text,
  resolved boolean default false
);

create table if not exists public.admin_checklist_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  record_time time,
  responsible text,
  status text,
  observations text,
  created_by text,
  source text default 'admin-kiosko',
  checklist_type text not null,
  items jsonb,
  completed boolean default false
);

alter table public.admin_temperature_records enable row level security;
alter table public.admin_cleaning_records enable row level security;
alter table public.admin_fryer_oil_records enable row level security;
alter table public.admin_goods_reception_records enable row level security;
alter table public.admin_incident_records enable row level security;
alter table public.admin_checklist_records enable row level security;

revoke all on public.admin_temperature_records from anon, authenticated;
revoke all on public.admin_cleaning_records from anon, authenticated;
revoke all on public.admin_fryer_oil_records from anon, authenticated;
revoke all on public.admin_goods_reception_records from anon, authenticated;
revoke all on public.admin_incident_records from anon, authenticated;
revoke all on public.admin_checklist_records from anon, authenticated;

create policy "admin_temperature_records_service_role_all"
  on public.admin_temperature_records
  for all
  to service_role
  using (true)
  with check (true);

create policy "admin_cleaning_records_service_role_all"
  on public.admin_cleaning_records
  for all
  to service_role
  using (true)
  with check (true);

create policy "admin_fryer_oil_records_service_role_all"
  on public.admin_fryer_oil_records
  for all
  to service_role
  using (true)
  with check (true);

create policy "admin_goods_reception_records_service_role_all"
  on public.admin_goods_reception_records
  for all
  to service_role
  using (true)
  with check (true);

create policy "admin_incident_records_service_role_all"
  on public.admin_incident_records
  for all
  to service_role
  using (true)
  with check (true);

create policy "admin_checklist_records_service_role_all"
  on public.admin_checklist_records
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists admin_temperature_records_created_at_idx on public.admin_temperature_records (created_at desc);
create index if not exists admin_cleaning_records_created_at_idx on public.admin_cleaning_records (created_at desc);
create index if not exists admin_fryer_oil_records_created_at_idx on public.admin_fryer_oil_records (created_at desc);
create index if not exists admin_goods_reception_records_created_at_idx on public.admin_goods_reception_records (created_at desc);
create index if not exists admin_incident_records_created_at_idx on public.admin_incident_records (created_at desc);
create index if not exists admin_checklist_records_created_at_idx on public.admin_checklist_records (created_at desc);
