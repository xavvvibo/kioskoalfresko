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

create table if not exists public.admin_equipment_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  equipment text not null,
  alert_date date not null,
  alert_time time,
  temperature numeric,
  alert_level text not null,
  status text default 'pendiente',
  description text,
  corrective_action text,
  resolved_at timestamptz,
  resolved_by text,
  source text default 'admin-kiosko'
);

alter table public.admin_temperature_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_cleaning_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_fryer_oil_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_goods_reception_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_incident_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_checklist_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_temperature_records enable row level security;
alter table public.admin_cleaning_records enable row level security;
alter table public.admin_fryer_oil_records enable row level security;
alter table public.admin_goods_reception_records enable row level security;
alter table public.admin_incident_records enable row level security;
alter table public.admin_checklist_records enable row level security;
alter table public.admin_equipment_alerts enable row level security;

revoke all on public.admin_temperature_records from anon, authenticated;
revoke all on public.admin_cleaning_records from anon, authenticated;
revoke all on public.admin_fryer_oil_records from anon, authenticated;
revoke all on public.admin_goods_reception_records from anon, authenticated;
revoke all on public.admin_incident_records from anon, authenticated;
revoke all on public.admin_checklist_records from anon, authenticated;
revoke all on public.admin_equipment_alerts from anon, authenticated;

drop policy if exists "admin_temperature_records_service_role_all" on public.admin_temperature_records;
create policy "admin_temperature_records_service_role_all"
  on public.admin_temperature_records
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_cleaning_records_service_role_all" on public.admin_cleaning_records;
create policy "admin_cleaning_records_service_role_all"
  on public.admin_cleaning_records
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_fryer_oil_records_service_role_all" on public.admin_fryer_oil_records;
create policy "admin_fryer_oil_records_service_role_all"
  on public.admin_fryer_oil_records
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_goods_reception_records_service_role_all" on public.admin_goods_reception_records;
create policy "admin_goods_reception_records_service_role_all"
  on public.admin_goods_reception_records
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_incident_records_service_role_all" on public.admin_incident_records;
create policy "admin_incident_records_service_role_all"
  on public.admin_incident_records
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_checklist_records_service_role_all" on public.admin_checklist_records;
create policy "admin_checklist_records_service_role_all"
  on public.admin_checklist_records
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_equipment_alerts_service_role_all" on public.admin_equipment_alerts;
create policy "admin_equipment_alerts_service_role_all"
  on public.admin_equipment_alerts
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
create index if not exists admin_equipment_alerts_created_at_idx on public.admin_equipment_alerts (created_at desc);
create index if not exists admin_equipment_alerts_open_equipment_idx on public.admin_equipment_alerts (equipment, status) where status in ('pendiente', 'en_proceso');

-- Optional duplicate cleanup for exact duplicated temperature rows.
-- Keeps the oldest row and deletes later exact duplicates.
--
-- with duplicates as (
--   select
--     id,
--     row_number() over (
--       partition by record_date, record_time, equipment, temperature, responsible, source
--       order by created_at asc, id asc
--     ) as duplicate_rank
--   from public.admin_temperature_records
-- )
-- delete from public.admin_temperature_records
-- using duplicates
-- where public.admin_temperature_records.id = duplicates.id
--   and duplicates.duplicate_rank > 1;
