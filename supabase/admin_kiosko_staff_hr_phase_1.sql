create extension if not exists pgcrypto;

create or replace function public.admin_kiosko_staff_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_kiosko_staff_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Europe/Madrid',
  address text,
  active boolean not null default true,
  allows_kiosk_clock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references public.admin_users(id) on delete set null,
  employee_code text not null unique,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  email text unique,
  phone text,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'terminated')),
  hire_date date,
  termination_date date,
  primary_location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  manager_employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_employees_termination_after_hire check (
    termination_date is null or hire_date is null or termination_date >= hire_date
  )
);

create table if not exists public.admin_kiosko_staff_employee_roles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  role text not null check (role in ('staff_employee', 'staff_shift_lead', 'staff_location_manager', 'staff_hr', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, location_id, role)
);

create table if not exists public.admin_kiosko_staff_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  contract_type text not null,
  start_date date not null,
  end_date date,
  weekly_minutes integer not null default 0 check (weekly_minutes >= 0),
  annual_minutes integer check (annual_minutes is null or annual_minutes >= 0),
  workday_distribution jsonb not null default '{}'::jsonb,
  job_title text,
  collective_agreement text,
  salary_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_contract_dates check (end_date is null or end_date >= start_date)
);

create table if not exists public.admin_kiosko_staff_shift_templates (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.admin_kiosko_staff_locations(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  default_break_minutes integer not null default 0 check (default_break_minutes >= 0),
  color_key text not null default 'stone',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_shifts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.admin_kiosko_staff_locations(id) on delete restrict,
  template_id uuid references public.admin_kiosko_staff_shift_templates(id) on delete set null,
  shift_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  published_at timestamptz,
  published_by uuid references public.admin_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_shift_ends_after_starts check (ends_at > starts_at)
);

create table if not exists public.admin_kiosko_staff_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.admin_kiosko_staff_shifts(id) on delete cascade,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  role_name text,
  assignment_status text not null default 'assigned' check (assignment_status in ('assigned', 'acknowledged', 'declined', 'removed')),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, employee_id)
);

create table if not exists public.admin_kiosko_staff_work_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete restrict,
  shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  clock_in_source text not null check (clock_in_source in ('employee_web', 'shared_kiosk', 'manager_assisted', 'system_import')),
  clock_out_source text check (clock_out_source in ('employee_web', 'shared_kiosk', 'manager_assisted', 'system_import')),
  clock_in_device text,
  clock_out_device text,
  worked_seconds integer check (worked_seconds is null or worked_seconds >= 0),
  status text not null default 'open' check (status in ('open', 'completed', 'pending_review', 'approved', 'locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_work_entry_out_after_in check (clock_out_at is null or clock_out_at > clock_in_at)
);

create table if not exists public.admin_kiosko_staff_break_entries (
  id uuid primary key default gen_random_uuid(),
  work_entry_id uuid not null references public.admin_kiosko_staff_work_entries(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  break_type text not null default 'rest',
  paid boolean not null default false,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_break_ends_after_starts check (ended_at is null or ended_at > started_at)
);

create table if not exists public.admin_kiosko_staff_time_incidents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete restrict,
  work_entry_id uuid references public.admin_kiosko_staff_work_entries(id) on delete set null,
  shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  incident_type text not null check (incident_type in ('missed_clock_in', 'missed_clock_out', 'wrong_time', 'wrong_location', 'forgotten_break', 'other')),
  description text not null,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected', 'cancelled')),
  requested_change jsonb not null default '{}'::jsonb,
  resolution text,
  resolved_by uuid references public.admin_users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.admin_users(id) on delete set null,
  actor_employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_kiosko_staff_employees_status_location_idx on public.admin_kiosko_staff_employees(status, primary_location_id);
create index if not exists admin_kiosko_staff_employees_auth_user_idx on public.admin_kiosko_staff_employees(auth_user_id);
create index if not exists admin_kiosko_staff_roles_employee_idx on public.admin_kiosko_staff_employee_roles(employee_id, active);
create index if not exists admin_kiosko_staff_contracts_employee_active_idx on public.admin_kiosko_staff_contracts(employee_id, active);
create index if not exists admin_kiosko_staff_shifts_date_location_idx on public.admin_kiosko_staff_shifts(shift_date, location_id, status);
create index if not exists admin_kiosko_staff_assignments_employee_idx on public.admin_kiosko_staff_shift_assignments(employee_id, assignment_status);
create index if not exists admin_kiosko_staff_work_entries_employee_clock_idx on public.admin_kiosko_staff_work_entries(employee_id, clock_in_at desc);
create index if not exists admin_kiosko_staff_work_entries_location_clock_idx on public.admin_kiosko_staff_work_entries(location_id, clock_in_at desc);
create unique index if not exists admin_kiosko_staff_one_open_work_entry_idx
  on public.admin_kiosko_staff_work_entries(employee_id)
  where status = 'open' and clock_out_at is null;
create unique index if not exists admin_kiosko_staff_one_open_break_idx
  on public.admin_kiosko_staff_break_entries(work_entry_id)
  where ended_at is null;
create index if not exists admin_kiosko_staff_incidents_status_created_idx on public.admin_kiosko_staff_time_incidents(status, created_at desc);
create index if not exists admin_kiosko_staff_audit_entity_idx on public.admin_kiosko_staff_audit_log(entity_type, entity_id, created_at desc);
create index if not exists admin_kiosko_staff_audit_actor_idx on public.admin_kiosko_staff_audit_log(actor_user_id, actor_employee_id, created_at desc);

drop trigger if exists admin_kiosko_staff_locations_touch on public.admin_kiosko_staff_locations;
create trigger admin_kiosko_staff_locations_touch before update on public.admin_kiosko_staff_locations
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_employees_touch on public.admin_kiosko_staff_employees;
create trigger admin_kiosko_staff_employees_touch before update on public.admin_kiosko_staff_employees
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_roles_touch on public.admin_kiosko_staff_employee_roles;
create trigger admin_kiosko_staff_roles_touch before update on public.admin_kiosko_staff_employee_roles
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_contracts_touch on public.admin_kiosko_staff_contracts;
create trigger admin_kiosko_staff_contracts_touch before update on public.admin_kiosko_staff_contracts
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_shift_templates_touch on public.admin_kiosko_staff_shift_templates;
create trigger admin_kiosko_staff_shift_templates_touch before update on public.admin_kiosko_staff_shift_templates
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_shifts_touch on public.admin_kiosko_staff_shifts;
create trigger admin_kiosko_staff_shifts_touch before update on public.admin_kiosko_staff_shifts
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_assignments_touch on public.admin_kiosko_staff_shift_assignments;
create trigger admin_kiosko_staff_assignments_touch before update on public.admin_kiosko_staff_shift_assignments
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_work_entries_touch on public.admin_kiosko_staff_work_entries;
create trigger admin_kiosko_staff_work_entries_touch before update on public.admin_kiosko_staff_work_entries
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_break_entries_touch on public.admin_kiosko_staff_break_entries;
create trigger admin_kiosko_staff_break_entries_touch before update on public.admin_kiosko_staff_break_entries
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_incidents_touch on public.admin_kiosko_staff_time_incidents;
create trigger admin_kiosko_staff_incidents_touch before update on public.admin_kiosko_staff_time_incidents
for each row execute function public.admin_kiosko_staff_touch_updated_at();

create or replace function public.admin_kiosko_staff_recalculate_worked_seconds(entry_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total_seconds integer;
  unpaid_break_seconds integer;
begin
  select greatest(0, floor(extract(epoch from (clock_out_at - clock_in_at)))::integer)
    into total_seconds
  from public.admin_kiosko_staff_work_entries
  where id = entry_id and clock_out_at is not null;

  if total_seconds is null then
    return null;
  end if;

  select coalesce(sum(greatest(0, floor(extract(epoch from (ended_at - started_at)))::integer)), 0)
    into unpaid_break_seconds
  from public.admin_kiosko_staff_break_entries
  where work_entry_id = entry_id and paid = false and ended_at is not null;

  update public.admin_kiosko_staff_work_entries
  set worked_seconds = greatest(0, total_seconds - unpaid_break_seconds)
  where id = entry_id;

  return greatest(0, total_seconds - unpaid_break_seconds);
end;
$$;

create or replace function public.admin_kiosko_staff_block_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_kiosko_staff_audit_log is immutable';
end;
$$;

drop trigger if exists admin_kiosko_staff_audit_immutable on public.admin_kiosko_staff_audit_log;
create trigger admin_kiosko_staff_audit_immutable
before update or delete on public.admin_kiosko_staff_audit_log
for each row execute function public.admin_kiosko_staff_block_audit_mutation();

alter table public.admin_kiosko_staff_locations enable row level security;
alter table public.admin_kiosko_staff_employees enable row level security;
alter table public.admin_kiosko_staff_employee_roles enable row level security;
alter table public.admin_kiosko_staff_contracts enable row level security;
alter table public.admin_kiosko_staff_shift_templates enable row level security;
alter table public.admin_kiosko_staff_shifts enable row level security;
alter table public.admin_kiosko_staff_shift_assignments enable row level security;
alter table public.admin_kiosko_staff_work_entries enable row level security;
alter table public.admin_kiosko_staff_break_entries enable row level security;
alter table public.admin_kiosko_staff_time_incidents enable row level security;
alter table public.admin_kiosko_staff_audit_log enable row level security;

grant all on public.admin_kiosko_staff_locations to service_role;
grant all on public.admin_kiosko_staff_employees to service_role;
grant all on public.admin_kiosko_staff_employee_roles to service_role;
grant all on public.admin_kiosko_staff_contracts to service_role;
grant all on public.admin_kiosko_staff_shift_templates to service_role;
grant all on public.admin_kiosko_staff_shifts to service_role;
grant all on public.admin_kiosko_staff_shift_assignments to service_role;
grant all on public.admin_kiosko_staff_work_entries to service_role;
grant all on public.admin_kiosko_staff_break_entries to service_role;
grant all on public.admin_kiosko_staff_time_incidents to service_role;
grant all on public.admin_kiosko_staff_audit_log to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_kiosko_staff_locations',
    'admin_kiosko_staff_employees',
    'admin_kiosko_staff_employee_roles',
    'admin_kiosko_staff_contracts',
    'admin_kiosko_staff_shift_templates',
    'admin_kiosko_staff_shifts',
    'admin_kiosko_staff_shift_assignments',
    'admin_kiosko_staff_work_entries',
    'admin_kiosko_staff_break_entries',
    'admin_kiosko_staff_time_incidents',
    'admin_kiosko_staff_audit_log'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end $$;

create or replace function public.admin_kiosko_staff_current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.admin_kiosko_staff_employees
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1
$$;

create or replace function public.admin_kiosko_staff_has_role(required_role text, target_location_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_kiosko_staff_employee_roles r
    join public.admin_kiosko_staff_employees e on e.id = r.employee_id
    where e.auth_user_id = auth.uid()
      and e.status = 'active'
      and r.active = true
      and r.role in (required_role, 'admin')
      and (target_location_id is null or r.location_id is null or r.location_id = target_location_id)
  )
$$;

drop policy if exists admin_kiosko_staff_employees_self_select on public.admin_kiosko_staff_employees;
create policy admin_kiosko_staff_employees_self_select
  on public.admin_kiosko_staff_employees
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or public.admin_kiosko_staff_has_role('staff_hr', null)
    or public.admin_kiosko_staff_has_role('staff_location_manager', primary_location_id)
    or public.admin_kiosko_staff_has_role('staff_shift_lead', primary_location_id)
  );

drop policy if exists admin_kiosko_staff_contracts_hr_select on public.admin_kiosko_staff_contracts;
create policy admin_kiosko_staff_contracts_hr_select
  on public.admin_kiosko_staff_contracts
  for select
  to authenticated
  using (
    public.admin_kiosko_staff_has_role('staff_hr', null)
    or employee_id = public.admin_kiosko_staff_current_employee_id()
  );

drop policy if exists admin_kiosko_staff_locations_employee_select on public.admin_kiosko_staff_locations;
create policy admin_kiosko_staff_locations_employee_select
  on public.admin_kiosko_staff_locations
  for select
  to authenticated
  using (active = true);

drop policy if exists admin_kiosko_staff_shifts_employee_select on public.admin_kiosko_staff_shifts;
create policy admin_kiosko_staff_shifts_employee_select
  on public.admin_kiosko_staff_shifts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_kiosko_staff_shift_assignments a
      where a.shift_id = id
        and a.employee_id = public.admin_kiosko_staff_current_employee_id()
        and status = 'published'
    )
    or public.admin_kiosko_staff_has_role('staff_location_manager', location_id)
    or public.admin_kiosko_staff_has_role('staff_shift_lead', location_id)
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists admin_kiosko_staff_assignments_employee_select on public.admin_kiosko_staff_shift_assignments;
create policy admin_kiosko_staff_assignments_employee_select
  on public.admin_kiosko_staff_shift_assignments
  for select
  to authenticated
  using (
    employee_id = public.admin_kiosko_staff_current_employee_id()
    or exists (
      select 1 from public.admin_kiosko_staff_shifts s
      where s.id = shift_id
        and (
          public.admin_kiosko_staff_has_role('staff_location_manager', s.location_id)
          or public.admin_kiosko_staff_has_role('staff_shift_lead', s.location_id)
          or public.admin_kiosko_staff_has_role('staff_hr', null)
        )
    )
  );

drop policy if exists admin_kiosko_staff_work_entries_employee_rw on public.admin_kiosko_staff_work_entries;
create policy admin_kiosko_staff_work_entries_employee_rw
  on public.admin_kiosko_staff_work_entries
  for all
  to authenticated
  using (
    employee_id = public.admin_kiosko_staff_current_employee_id()
    or public.admin_kiosko_staff_has_role('staff_location_manager', location_id)
    or public.admin_kiosko_staff_has_role('staff_shift_lead', location_id)
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  )
  with check (
    employee_id = public.admin_kiosko_staff_current_employee_id()
    or public.admin_kiosko_staff_has_role('staff_location_manager', location_id)
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists admin_kiosko_staff_break_entries_employee_rw on public.admin_kiosko_staff_break_entries;
create policy admin_kiosko_staff_break_entries_employee_rw
  on public.admin_kiosko_staff_break_entries
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_kiosko_staff_work_entries w
      where w.id = work_entry_id
        and (
          w.employee_id = public.admin_kiosko_staff_current_employee_id()
          or public.admin_kiosko_staff_has_role('staff_location_manager', w.location_id)
          or public.admin_kiosko_staff_has_role('staff_shift_lead', w.location_id)
          or public.admin_kiosko_staff_has_role('staff_hr', null)
        )
    )
  )
  with check (
    exists (
      select 1 from public.admin_kiosko_staff_work_entries w
      where w.id = work_entry_id
        and (
          w.employee_id = public.admin_kiosko_staff_current_employee_id()
          or public.admin_kiosko_staff_has_role('staff_location_manager', w.location_id)
          or public.admin_kiosko_staff_has_role('staff_hr', null)
        )
    )
  );

drop policy if exists admin_kiosko_staff_incidents_employee_rw on public.admin_kiosko_staff_time_incidents;
create policy admin_kiosko_staff_incidents_employee_rw
  on public.admin_kiosko_staff_time_incidents
  for all
  to authenticated
  using (
    employee_id = public.admin_kiosko_staff_current_employee_id()
    or public.admin_kiosko_staff_has_role('staff_location_manager', null)
    or public.admin_kiosko_staff_has_role('staff_shift_lead', null)
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  )
  with check (
    employee_id = public.admin_kiosko_staff_current_employee_id()
    or public.admin_kiosko_staff_has_role('staff_location_manager', null)
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

drop policy if exists admin_kiosko_staff_audit_select_scoped on public.admin_kiosko_staff_audit_log;
create policy admin_kiosko_staff_audit_select_scoped
  on public.admin_kiosko_staff_audit_log
  for select
  to authenticated
  using (
    actor_employee_id = public.admin_kiosko_staff_current_employee_id()
    or public.admin_kiosko_staff_has_role('staff_location_manager', null)
    or public.admin_kiosko_staff_has_role('staff_hr', null)
  );

comment on table public.admin_kiosko_staff_contracts is 'salary_reference is administrative and restricted; it is not a payroll calculation source.';
comment on table public.admin_kiosko_staff_audit_log is 'Immutable HR audit log. Application must insert new events and never update/delete rows.';
