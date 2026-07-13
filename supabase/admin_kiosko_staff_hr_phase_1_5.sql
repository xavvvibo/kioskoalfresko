create extension if not exists pgcrypto;

create table if not exists public.admin_kiosko_staff_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  tax_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_kiosko_staff_organizations (name, slug, active)
values ('Kiosko Alfresko', 'kiosko-alfresko-group', true)
on conflict (slug) do update
set name = excluded.name,
    active = excluded.active;

alter table public.admin_kiosko_staff_locations
  add column if not exists organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict;

alter table public.admin_kiosko_staff_employees
  add column if not exists organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict;

alter table public.admin_kiosko_staff_contracts
  add column if not exists organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict;

alter table public.admin_kiosko_staff_shifts
  add column if not exists organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict;

alter table public.admin_kiosko_staff_work_entries
  add column if not exists organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict;

update public.admin_kiosko_staff_locations
set organization_id = (select id from public.admin_kiosko_staff_organizations where slug = 'kiosko-alfresko-group')
where organization_id is null;

update public.admin_kiosko_staff_employees
set organization_id = (select id from public.admin_kiosko_staff_organizations where slug = 'kiosko-alfresko-group')
where organization_id is null;

update public.admin_kiosko_staff_contracts c
set organization_id = e.organization_id
from public.admin_kiosko_staff_employees e
where c.employee_id = e.id and c.organization_id is null;

update public.admin_kiosko_staff_shifts s
set organization_id = l.organization_id
from public.admin_kiosko_staff_locations l
where s.location_id = l.id and s.organization_id is null;

update public.admin_kiosko_staff_work_entries w
set organization_id = e.organization_id
from public.admin_kiosko_staff_employees e
where w.employee_id = e.id and w.organization_id is null;

create table if not exists public.admin_kiosko_staff_employee_private_profiles (
  employee_id uuid primary key references public.admin_kiosko_staff_employees(id) on delete cascade,
  organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict,
  preferred_name text,
  photo_path text,
  dni_nie text,
  social_security_number text,
  birth_date date,
  address text,
  postal_code text,
  municipality text,
  province text,
  country text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  iban text,
  shirt_size text,
  shoe_size text,
  internal_notes text,
  seniority_date date,
  termination_reason text,
  professional_group text,
  professional_category text,
  department text,
  workday_type text,
  salary_gross text,
  salary_periodicity text,
  estimated_company_cost text,
  probation_period text,
  probation_ends_at date,
  labor_notes text,
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_employee_authorized_locations (
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid not null references public.admin_kiosko_staff_locations(id) on delete cascade,
  organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (employee_id, location_id)
);

create table if not exists public.admin_kiosko_staff_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  category text not null check (category in ('dni_nie','contract','extension','payroll','model_145','social_security','prl','appcc','training_certificate','medical_check','medical_leave','medical_return','vacation','sanction','internal_communication','other')),
  visible_name text not null,
  original_name text not null,
  private_path text not null unique,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  document_date date,
  expires_at date,
  status text not null default 'active' check (status in ('active','archived','replaced','expired')),
  notes text,
  uploaded_by uuid references public.admin_users(id) on delete set null,
  file_hash text not null,
  version integer not null default 1 check (version > 0),
  replaces_document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  visible_to_employee boolean not null default false,
  requires_signature boolean not null default false,
  signature_status text not null default 'not_required' check (signature_status in ('not_required','pending','signed','invalidated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_documents_expiry_after_document check (expires_at is null or document_date is null or expires_at >= document_date)
);

create table if not exists public.admin_kiosko_staff_training_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict,
  category text not null check (category in ('appcc','food_handler','prl','allergens','fire_safety','first_aid','data_protection','customer_service','internal')),
  name text not null,
  provider text,
  default_duration_minutes integer check (default_duration_minutes is null or default_duration_minutes >= 0),
  validity_months integer check (validity_months is null or validity_months > 0),
  mandatory boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_training_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  training_id uuid references public.admin_kiosko_staff_training_catalog(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','expired','cancelled')),
  assigned_at date not null default current_date,
  completed_at date,
  expires_at date,
  provider text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  result text,
  notes text,
  certificate_document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  reminder_at date,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_training_expiry_after_completed check (expires_at is null or completed_at is null or expires_at >= completed_at)
);

create table if not exists public.admin_kiosko_staff_absences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  absence_type text not null check (absence_type in ('vacation','temporary_disability','paid_leave','unpaid_leave','unjustified_absence','personal_days','maternity_paternity','work_accident','other')),
  status text not null default 'draft' check (status in ('draft','requested','approved','rejected','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  natural_days numeric(6,2),
  estimated_working_days numeric(6,2),
  hours numeric(8,2),
  reason text,
  notes text,
  supporting_document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  requested_by uuid references public.admin_users(id) on delete set null,
  resolved_by uuid references public.admin_users(id) on delete set null,
  resolved_at timestamptz,
  resolution_reason text,
  shift_impact text,
  visible_to_employee boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_absences_end_after_start check (ends_at > starts_at)
);

create table if not exists public.admin_kiosko_staff_disciplinary_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  case_type text not null check (case_type in ('information_request','investigation_opening','allegations','warning','reprimand','sanction','closed_without_sanction','other_communication')),
  title text not null,
  facts text not null,
  facts_date date,
  opened_at date not null default current_date,
  status text not null default 'draft' check (status in ('draft','open','pending_allegations','investigation','resolved','archived')),
  confidentiality_level text not null default 'restricted' check (confidentiality_level in ('restricted','hr','legal')),
  instructor text,
  document_ids uuid[] not null default '{}',
  allegations text,
  resolution text,
  resolved_at date,
  visible_to_employee boolean not null default false,
  signature_required boolean not null default false,
  signature_received boolean not null default false,
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  signer_name text not null,
  signed_entity_type text not null,
  signed_entity_id uuid not null,
  document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  document_version integer not null default 1,
  signature_image_path text,
  signature_trace jsonb,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  content_hash text not null,
  signature_hash text not null,
  consent_text text not null,
  displayed_text text not null,
  actor_user_id uuid references public.admin_users(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'valid' check (status in ('valid','invalidated')),
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_timeline_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  event_type text not null,
  title text not null,
  description text,
  effective_at timestamptz not null,
  registered_at timestamptz not null default now(),
  actor_user_id uuid references public.admin_users(id) on delete set null,
  source text not null default 'staff_hr',
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  visible_to_employee boolean not null default false,
  severity text not null default 'info' check (severity in ('info','warning','critical','positive')),
  created_at timestamptz not null default now()
);

create index if not exists admin_kiosko_staff_locations_org_idx on public.admin_kiosko_staff_locations(organization_id, active);
create index if not exists admin_kiosko_staff_employees_org_location_idx on public.admin_kiosko_staff_employees(organization_id, primary_location_id, status);
create index if not exists admin_kiosko_staff_documents_employee_idx on public.admin_kiosko_staff_documents(employee_id, status, created_at desc);
create index if not exists admin_kiosko_staff_documents_expiry_idx on public.admin_kiosko_staff_documents(expires_at) where expires_at is not null;
create index if not exists admin_kiosko_staff_training_assignments_employee_idx on public.admin_kiosko_staff_training_assignments(employee_id, status, expires_at);
create index if not exists admin_kiosko_staff_absences_employee_idx on public.admin_kiosko_staff_absences(employee_id, starts_at desc, status);
create index if not exists admin_kiosko_staff_disciplinary_employee_idx on public.admin_kiosko_staff_disciplinary_cases(employee_id, status, opened_at desc);
create index if not exists admin_kiosko_staff_signatures_employee_idx on public.admin_kiosko_staff_signatures(employee_id, status, signed_at desc);
create index if not exists admin_kiosko_staff_timeline_employee_idx on public.admin_kiosko_staff_timeline_events(employee_id, effective_at desc);

drop trigger if exists admin_kiosko_staff_organizations_touch on public.admin_kiosko_staff_organizations;
create trigger admin_kiosko_staff_organizations_touch before update on public.admin_kiosko_staff_organizations
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_private_profiles_touch on public.admin_kiosko_staff_employee_private_profiles;
create trigger admin_kiosko_staff_private_profiles_touch before update on public.admin_kiosko_staff_employee_private_profiles
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_documents_touch on public.admin_kiosko_staff_documents;
create trigger admin_kiosko_staff_documents_touch before update on public.admin_kiosko_staff_documents
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_training_catalog_touch on public.admin_kiosko_staff_training_catalog;
create trigger admin_kiosko_staff_training_catalog_touch before update on public.admin_kiosko_staff_training_catalog
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_training_assignments_touch on public.admin_kiosko_staff_training_assignments;
create trigger admin_kiosko_staff_training_assignments_touch before update on public.admin_kiosko_staff_training_assignments
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_absences_touch on public.admin_kiosko_staff_absences;
create trigger admin_kiosko_staff_absences_touch before update on public.admin_kiosko_staff_absences
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_disciplinary_touch on public.admin_kiosko_staff_disciplinary_cases;
create trigger admin_kiosko_staff_disciplinary_touch before update on public.admin_kiosko_staff_disciplinary_cases
for each row execute function public.admin_kiosko_staff_touch_updated_at();

create or replace function public.admin_kiosko_staff_block_signature_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'admin_kiosko_staff_signatures cannot be deleted';
  end if;
  if old.status = 'invalidated' then
    raise exception 'invalidated signatures cannot be edited';
  end if;
  if new.status = 'valid' and old.status = 'valid' then
    raise exception 'valid signatures are immutable; invalidate instead';
  end if;
  return new;
end;
$$;

drop trigger if exists admin_kiosko_staff_signatures_immutable on public.admin_kiosko_staff_signatures;
create trigger admin_kiosko_staff_signatures_immutable
before update or delete on public.admin_kiosko_staff_signatures
for each row execute function public.admin_kiosko_staff_block_signature_mutation();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-private-documents',
  'staff-private-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.admin_kiosko_staff_organizations enable row level security;
alter table public.admin_kiosko_staff_employee_private_profiles enable row level security;
alter table public.admin_kiosko_staff_employee_authorized_locations enable row level security;
alter table public.admin_kiosko_staff_documents enable row level security;
alter table public.admin_kiosko_staff_training_catalog enable row level security;
alter table public.admin_kiosko_staff_training_assignments enable row level security;
alter table public.admin_kiosko_staff_absences enable row level security;
alter table public.admin_kiosko_staff_disciplinary_cases enable row level security;
alter table public.admin_kiosko_staff_signatures enable row level security;
alter table public.admin_kiosko_staff_timeline_events enable row level security;

grant all on public.admin_kiosko_staff_organizations to service_role;
grant all on public.admin_kiosko_staff_employee_private_profiles to service_role;
grant all on public.admin_kiosko_staff_employee_authorized_locations to service_role;
grant all on public.admin_kiosko_staff_documents to service_role;
grant all on public.admin_kiosko_staff_training_catalog to service_role;
grant all on public.admin_kiosko_staff_training_assignments to service_role;
grant all on public.admin_kiosko_staff_absences to service_role;
grant all on public.admin_kiosko_staff_disciplinary_cases to service_role;
grant all on public.admin_kiosko_staff_signatures to service_role;
grant all on public.admin_kiosko_staff_timeline_events to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_kiosko_staff_organizations',
    'admin_kiosko_staff_employee_private_profiles',
    'admin_kiosko_staff_employee_authorized_locations',
    'admin_kiosko_staff_documents',
    'admin_kiosko_staff_training_catalog',
    'admin_kiosko_staff_training_assignments',
    'admin_kiosko_staff_absences',
    'admin_kiosko_staff_disciplinary_cases',
    'admin_kiosko_staff_signatures',
    'admin_kiosko_staff_timeline_events'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end $$;

drop policy if exists staff_documents_employee_select on public.admin_kiosko_staff_documents;
create policy staff_documents_employee_select
  on public.admin_kiosko_staff_documents
  for select
  to authenticated
  using (
    (visible_to_employee = true and employee_id = public.admin_kiosko_staff_current_employee_id())
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists staff_training_employee_select on public.admin_kiosko_staff_training_assignments;
create policy staff_training_employee_select
  on public.admin_kiosko_staff_training_assignments
  for select
  to authenticated
  using (
    employee_id = public.admin_kiosko_staff_current_employee_id()
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists staff_absences_employee_select on public.admin_kiosko_staff_absences;
create policy staff_absences_employee_select
  on public.admin_kiosko_staff_absences
  for select
  to authenticated
  using (
    (visible_to_employee = true and employee_id = public.admin_kiosko_staff_current_employee_id())
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists staff_timeline_employee_select on public.admin_kiosko_staff_timeline_events;
create policy staff_timeline_employee_select
  on public.admin_kiosko_staff_timeline_events
  for select
  to authenticated
  using (
    (visible_to_employee = true and employee_id = public.admin_kiosko_staff_current_employee_id())
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists staff_signatures_employee_select on public.admin_kiosko_staff_signatures;
create policy staff_signatures_employee_select
  on public.admin_kiosko_staff_signatures
  for select
  to authenticated
  using (
    employee_id = public.admin_kiosko_staff_current_employee_id()
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists staff_disciplinary_hr_select on public.admin_kiosko_staff_disciplinary_cases;
create policy staff_disciplinary_hr_select
  on public.admin_kiosko_staff_disciplinary_cases
  for select
  to authenticated
  using (
    (visible_to_employee = true and employee_id = public.admin_kiosko_staff_current_employee_id())
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

comment on table public.admin_kiosko_staff_documents is 'Metadata for private employee documents. Files live in private Supabase Storage bucket staff-private-documents.';
comment on table public.admin_kiosko_staff_signatures is 'Internal handwritten signature evidence, not a qualified electronic signature.';
comment on table public.admin_kiosko_staff_employee_private_profiles is 'Sensitive employee profile fields. Do not expose in general listings or audit raw values.';
