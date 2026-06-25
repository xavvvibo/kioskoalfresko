create extension if not exists pgcrypto;

create table if not exists public.admin_appcc_monthly_signatures (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null,
  signed_by text not null,
  signed_at timestamptz not null default now(),
  signature_note text,
  created_at timestamptz default now(),
  unique (year, month)
);

create table if not exists public.admin_inspection_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  inspection_date date not null,
  inspector text,
  organization text,
  result text,
  observations text,
  requirements text,
  deadline date,
  status text default 'pendiente',
  actions_done text,
  responsible text,
  documentation text
);

create table if not exists public.admin_supplier_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  supplier text not null,
  cif text,
  phone text,
  email text,
  category text,
  certificates text,
  observations text,
  status text default 'activo'
);

create table if not exists public.admin_equipment_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  installation_date date,
  location text,
  last_maintenance date,
  next_maintenance date,
  fault_history text,
  status text default 'operativo'
);

create table if not exists public.admin_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  equipment text,
  intervention text,
  company text,
  invoice text,
  observations text,
  responsible text
);

create table if not exists public.admin_water_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  color text,
  smell text,
  taste text,
  chlorine text,
  observations text,
  responsible text
);

create table if not exists public.admin_annual_verification_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  record_date date not null,
  appcc_reviewed boolean default false,
  health_memory_reviewed boolean default false,
  allergens_reviewed boolean default false,
  suppliers_reviewed boolean default false,
  cleaning_products_reviewed boolean default false,
  equipment_reviewed boolean default false,
  handler_training boolean default false,
  documentation_complete boolean default false,
  observations text,
  responsible text
);

alter table public.admin_appcc_monthly_signatures enable row level security;
alter table public.admin_inspection_records enable row level security;
alter table public.admin_supplier_records enable row level security;
alter table public.admin_equipment_assets enable row level security;
alter table public.admin_maintenance_records enable row level security;
alter table public.admin_water_records enable row level security;
alter table public.admin_annual_verification_records enable row level security;

revoke all on public.admin_appcc_monthly_signatures from anon, authenticated;
revoke all on public.admin_inspection_records from anon, authenticated;
revoke all on public.admin_supplier_records from anon, authenticated;
revoke all on public.admin_equipment_assets from anon, authenticated;
revoke all on public.admin_maintenance_records from anon, authenticated;
revoke all on public.admin_water_records from anon, authenticated;
revoke all on public.admin_annual_verification_records from anon, authenticated;

drop policy if exists "admin_appcc_monthly_signatures_service_role_all" on public.admin_appcc_monthly_signatures;
create policy "admin_appcc_monthly_signatures_service_role_all" on public.admin_appcc_monthly_signatures for all to service_role using (true) with check (true);

drop policy if exists "admin_inspection_records_service_role_all" on public.admin_inspection_records;
create policy "admin_inspection_records_service_role_all" on public.admin_inspection_records for all to service_role using (true) with check (true);

drop policy if exists "admin_supplier_records_service_role_all" on public.admin_supplier_records;
create policy "admin_supplier_records_service_role_all" on public.admin_supplier_records for all to service_role using (true) with check (true);

drop policy if exists "admin_equipment_assets_service_role_all" on public.admin_equipment_assets;
create policy "admin_equipment_assets_service_role_all" on public.admin_equipment_assets for all to service_role using (true) with check (true);

drop policy if exists "admin_maintenance_records_service_role_all" on public.admin_maintenance_records;
create policy "admin_maintenance_records_service_role_all" on public.admin_maintenance_records for all to service_role using (true) with check (true);

drop policy if exists "admin_water_records_service_role_all" on public.admin_water_records;
create policy "admin_water_records_service_role_all" on public.admin_water_records for all to service_role using (true) with check (true);

drop policy if exists "admin_annual_verification_records_service_role_all" on public.admin_annual_verification_records;
create policy "admin_annual_verification_records_service_role_all" on public.admin_annual_verification_records for all to service_role using (true) with check (true);

create index if not exists admin_appcc_monthly_signatures_period_idx on public.admin_appcc_monthly_signatures (year desc, month desc);
create index if not exists admin_inspection_records_date_idx on public.admin_inspection_records (inspection_date desc);
create index if not exists admin_supplier_records_created_at_idx on public.admin_supplier_records (created_at desc);
create index if not exists admin_equipment_assets_created_at_idx on public.admin_equipment_assets (created_at desc);
create index if not exists admin_maintenance_records_date_idx on public.admin_maintenance_records (record_date desc);
create index if not exists admin_water_records_date_idx on public.admin_water_records (record_date desc);
create index if not exists admin_annual_verification_records_date_idx on public.admin_annual_verification_records (record_date desc);
