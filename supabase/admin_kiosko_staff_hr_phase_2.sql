create extension if not exists pgcrypto;

create table if not exists public.admin_kiosko_staff_leave_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  name text not null,
  absence_type text not null check (absence_type in ('vacation','paid_leave','unpaid_leave','personal_leave','sick_leave','work_accident','parental_leave','unjustified_absence','other')),
  unit text not null check (unit in ('natural_days','working_days','hours')),
  accrual_method text not null check (accrual_method in ('annual','monthly','proportional','manual')),
  annual_amount numeric(10,2) not null default 0 check (annual_amount >= 0),
  cycle_starts_on date not null,
  prorate_enabled boolean not null default true,
  carryover_enabled boolean not null default false,
  max_carryover numeric(10,2) not null default 0 check (max_carryover >= 0),
  carryover_expires_on date,
  negative_balance_allowed boolean not null default false,
  negative_limit numeric(10,2) not null default 0 check (negative_limit >= 0),
  requires_document boolean not null default false,
  requires_approval boolean not null default true,
  approver_count integer not null default 1 check (approver_count >= 0),
  min_notice_days integer not null default 0 check (min_notice_days >= 0),
  min_duration numeric(10,2) not null default 0 check (min_duration >= 0),
  max_duration numeric(10,2) check (max_duration is null or max_duration >= min_duration),
  allows_half_days boolean not null default false,
  allows_hours boolean not null default false,
  visible_to_employee boolean not null default true,
  active boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_leave_balance_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  policy_id uuid not null references public.admin_kiosko_staff_leave_policies(id) on delete restrict,
  period_label text not null,
  starts_on date not null,
  ends_on date not null,
  opening_balance numeric(10,2) not null default 0,
  accrued_amount numeric(10,2) not null default 0,
  consumed_amount numeric(10,2) not null default 0,
  reserved_amount numeric(10,2) not null default 0,
  adjusted_amount numeric(10,2) not null default 0,
  carried_over_amount numeric(10,2) not null default 0,
  expired_amount numeric(10,2) not null default 0,
  status text not null default 'open' check (status in ('open','locked','closed')),
  locked_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references public.admin_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_leave_period_dates check (ends_on >= starts_on),
  unique (employee_id, policy_id, starts_on, ends_on)
);

create table if not exists public.admin_kiosko_staff_leave_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  policy_id uuid not null references public.admin_kiosko_staff_leave_policies(id) on delete restrict,
  period_id uuid not null references public.admin_kiosko_staff_leave_balance_periods(id) on delete restrict,
  movement_type text not null check (movement_type in ('accrual','reservation','consumption','release','adjustment','carryover','expiration','reversal')),
  amount numeric(10,2) not null,
  unit text not null check (unit in ('natural_days','working_days','hours')),
  effective_on date not null,
  source text not null default 'staff_hr',
  reference_type text,
  reference_id uuid,
  reverses_ledger_id uuid references public.admin_kiosko_staff_leave_balance_ledger(id) on delete restrict,
  actor_user_id uuid references public.admin_users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists public.admin_kiosko_staff_leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  policy_id uuid not null references public.admin_kiosko_staff_leave_policies(id) on delete restrict,
  absence_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  partial_mode text not null default 'full_day' check (partial_mode in ('full_day','half_day','hours')),
  requested_amount numeric(10,2) not null default 0,
  requested_unit text not null check (requested_unit in ('natural_days','working_days','hours')),
  reason text,
  employee_notes text,
  supporting_document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','approved','rejected','cancelled','withdrawn','partially_approved')),
  submitted_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.admin_users(id) on delete set null,
  resolution_reason text,
  reserved_amount numeric(10,2) not null default 0,
  consumed_amount numeric(10,2) not null default 0,
  approved_starts_at timestamptz,
  approved_ends_at timestamptz,
  approved_amount numeric(10,2),
  conflict_summary jsonb not null default '[]'::jsonb,
  shift_impact_summary jsonb not null default '[]'::jsonb,
  visible_to_employee boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_leave_request_dates check (ends_at > starts_at)
);

create table if not exists public.admin_kiosko_staff_leave_request_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.admin_kiosko_staff_leave_requests(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  decision text not null check (decision in ('approve','partially_approve','reject','request_documentation','return_to_draft','cancel_approval')),
  approved_starts_at timestamptz,
  approved_ends_at timestamptz,
  approved_amount numeric(10,2),
  previous_status text,
  next_status text not null,
  comment text not null,
  actor_user_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_shift_absence_impacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  request_id uuid not null references public.admin_kiosko_staff_leave_requests(id) on delete cascade,
  shift_id uuid not null references public.admin_kiosko_staff_shifts(id) on delete cascade,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  impact_type text not null default 'absence_overlap' check (impact_type in ('absence_overlap','coverage_needed','resolved')),
  proposed_action text not null default 'resolve_later' check (proposed_action in ('keep_with_warning','unassign_employee','convert_to_vacant','reassign_employee','cancel_shift','resolve_later')),
  resolution_status text not null default 'pending' check (resolution_status in ('pending','resolved','ignored')),
  previous_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  reason text,
  actor_user_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, shift_id)
);

create table if not exists public.admin_kiosko_staff_period_locks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  period_type text not null check (period_type in ('work_entries','absences','balances','payroll_variables')),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','soft_locked','hard_locked','closed')),
  locked_by uuid references public.admin_users(id) on delete set null,
  locked_at timestamptz,
  reason text,
  reopened_by uuid references public.admin_users(id) on delete set null,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_period_lock_dates check (ends_on >= starts_on)
);

create table if not exists public.admin_kiosko_staff_payroll_variables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  period_lock_id uuid references public.admin_kiosko_staff_period_locks(id) on delete set null,
  period_start date not null,
  period_end date not null,
  concept text not null check (concept in ('ordinary_hours','additional_hours','overtime_hours','night_hours','holiday_hours','paid_absence','unpaid_absence','temporary_disability','vacation','lateness','clock_incident','manual_adjustment')),
  quantity numeric(10,2) not null,
  unit text not null check (unit in ('hours','days','events')),
  source text not null default 'staff_hr',
  reference_type text,
  reference_id uuid,
  status text not null default 'draft' check (status in ('draft','reviewed','locked','exported')),
  notes text,
  created_by uuid references public.admin_users(id) on delete set null,
  reviewed_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_payroll_variable_period_dates check (period_end >= period_start)
);

create or replace function public.admin_kiosko_staff_block_leave_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_kiosko_staff_leave_balance_ledger is immutable; use reversal movements';
end;
$$;

drop trigger if exists admin_kiosko_staff_leave_ledger_immutable on public.admin_kiosko_staff_leave_balance_ledger;
create trigger admin_kiosko_staff_leave_ledger_immutable
before update or delete on public.admin_kiosko_staff_leave_balance_ledger
for each row execute function public.admin_kiosko_staff_block_leave_ledger_mutation();

create or replace function public.admin_kiosko_staff_recalculate_leave_period(period_uuid uuid)
returns table (
  opening_balance numeric,
  accrued_amount numeric,
  consumed_amount numeric,
  reserved_amount numeric,
  adjusted_amount numeric,
  carried_over_amount numeric,
  expired_amount numeric,
  available_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  opening numeric := 0;
  accrued numeric := 0;
  consumed numeric := 0;
  reserved numeric := 0;
  adjusted numeric := 0;
  carried numeric := 0;
  expired numeric := 0;
begin
  select
    coalesce(sum(case when movement_type = 'carryover' then amount else 0 end), 0),
    coalesce(sum(case when movement_type = 'accrual' then amount else 0 end), 0),
    coalesce(sum(case when movement_type = 'consumption' then amount else 0 end), 0),
    coalesce(sum(case when movement_type = 'reservation' then amount else 0 end), 0),
    coalesce(sum(case when movement_type in ('adjustment','reversal','release') then amount else 0 end), 0),
    coalesce(sum(case when movement_type = 'carryover' then amount else 0 end), 0),
    coalesce(sum(case when movement_type = 'expiration' then amount else 0 end), 0)
  into opening, accrued, consumed, reserved, adjusted, carried, expired
  from public.admin_kiosko_staff_leave_balance_ledger
  where period_id = period_uuid;

  update public.admin_kiosko_staff_leave_balance_periods
  set opening_balance = opening,
      accrued_amount = accrued,
      consumed_amount = consumed,
      reserved_amount = reserved,
      adjusted_amount = adjusted,
      carried_over_amount = carried,
      expired_amount = expired
  where id = period_uuid;

  return query select opening, accrued, consumed, reserved, adjusted, carried, expired,
    (opening + accrued + adjusted + carried - consumed - reserved - expired);
end;
$$;

create index if not exists admin_kiosko_staff_leave_policies_scope_idx on public.admin_kiosko_staff_leave_policies(organization_id, location_id, absence_type, active);
create index if not exists admin_kiosko_staff_leave_periods_employee_idx on public.admin_kiosko_staff_leave_balance_periods(employee_id, policy_id, starts_on desc);
create index if not exists admin_kiosko_staff_leave_ledger_period_idx on public.admin_kiosko_staff_leave_balance_ledger(period_id, created_at desc);
create index if not exists admin_kiosko_staff_leave_requests_employee_idx on public.admin_kiosko_staff_leave_requests(employee_id, starts_at desc, status);
create index if not exists admin_kiosko_staff_leave_requests_admin_idx on public.admin_kiosko_staff_leave_requests(organization_id, location_id, status, starts_at);
create index if not exists admin_kiosko_staff_shift_absence_impacts_request_idx on public.admin_kiosko_staff_shift_absence_impacts(request_id, resolution_status);
create index if not exists admin_kiosko_staff_period_locks_scope_idx on public.admin_kiosko_staff_period_locks(organization_id, location_id, period_type, starts_on, ends_on, status);
create index if not exists admin_kiosko_staff_payroll_variables_period_idx on public.admin_kiosko_staff_payroll_variables(organization_id, employee_id, period_start, period_end, status);

drop trigger if exists admin_kiosko_staff_leave_policies_touch on public.admin_kiosko_staff_leave_policies;
create trigger admin_kiosko_staff_leave_policies_touch before update on public.admin_kiosko_staff_leave_policies
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_leave_periods_touch on public.admin_kiosko_staff_leave_balance_periods;
create trigger admin_kiosko_staff_leave_periods_touch before update on public.admin_kiosko_staff_leave_balance_periods
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_leave_requests_touch on public.admin_kiosko_staff_leave_requests;
create trigger admin_kiosko_staff_leave_requests_touch before update on public.admin_kiosko_staff_leave_requests
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_shift_impacts_touch on public.admin_kiosko_staff_shift_absence_impacts;
create trigger admin_kiosko_staff_shift_impacts_touch before update on public.admin_kiosko_staff_shift_absence_impacts
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_period_locks_touch on public.admin_kiosko_staff_period_locks;
create trigger admin_kiosko_staff_period_locks_touch before update on public.admin_kiosko_staff_period_locks
for each row execute function public.admin_kiosko_staff_touch_updated_at();

drop trigger if exists admin_kiosko_staff_payroll_variables_touch on public.admin_kiosko_staff_payroll_variables;
create trigger admin_kiosko_staff_payroll_variables_touch before update on public.admin_kiosko_staff_payroll_variables
for each row execute function public.admin_kiosko_staff_touch_updated_at();

alter table public.admin_kiosko_staff_leave_policies enable row level security;
alter table public.admin_kiosko_staff_leave_balance_periods enable row level security;
alter table public.admin_kiosko_staff_leave_balance_ledger enable row level security;
alter table public.admin_kiosko_staff_leave_requests enable row level security;
alter table public.admin_kiosko_staff_leave_request_decisions enable row level security;
alter table public.admin_kiosko_staff_shift_absence_impacts enable row level security;
alter table public.admin_kiosko_staff_period_locks enable row level security;
alter table public.admin_kiosko_staff_payroll_variables enable row level security;

grant all on public.admin_kiosko_staff_leave_policies to service_role;
grant all on public.admin_kiosko_staff_leave_balance_periods to service_role;
grant all on public.admin_kiosko_staff_leave_balance_ledger to service_role;
grant all on public.admin_kiosko_staff_leave_requests to service_role;
grant all on public.admin_kiosko_staff_leave_request_decisions to service_role;
grant all on public.admin_kiosko_staff_shift_absence_impacts to service_role;
grant all on public.admin_kiosko_staff_period_locks to service_role;
grant all on public.admin_kiosko_staff_payroll_variables to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_kiosko_staff_leave_policies',
    'admin_kiosko_staff_leave_balance_periods',
    'admin_kiosko_staff_leave_balance_ledger',
    'admin_kiosko_staff_leave_requests',
    'admin_kiosko_staff_leave_request_decisions',
    'admin_kiosko_staff_shift_absence_impacts',
    'admin_kiosko_staff_period_locks',
    'admin_kiosko_staff_payroll_variables'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end $$;

drop policy if exists staff_leave_policies_employee_select on public.admin_kiosko_staff_leave_policies;
create policy staff_leave_policies_employee_select
  on public.admin_kiosko_staff_leave_policies for select to authenticated
  using (visible_to_employee = true or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_leave_periods_employee_select on public.admin_kiosko_staff_leave_balance_periods;
create policy staff_leave_periods_employee_select
  on public.admin_kiosko_staff_leave_balance_periods for select to authenticated
  using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_leave_requests_employee_rw on public.admin_kiosko_staff_leave_requests;
create policy staff_leave_requests_employee_rw
  on public.admin_kiosko_staff_leave_requests for all to authenticated
  using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
  with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_leave_ledger_employee_select on public.admin_kiosko_staff_leave_balance_ledger;
create policy staff_leave_ledger_employee_select
  on public.admin_kiosko_staff_leave_balance_ledger for select to authenticated
  using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_period_locks_hr_select on public.admin_kiosko_staff_period_locks;
create policy staff_period_locks_hr_select
  on public.admin_kiosko_staff_period_locks for select to authenticated
  using (public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_payroll_variables_hr_select on public.admin_kiosko_staff_payroll_variables;
create policy staff_payroll_variables_hr_select
  on public.admin_kiosko_staff_payroll_variables for select to authenticated
  using (public.admin_kiosko_staff_has_role('staff_hr', null));

comment on table public.admin_kiosko_staff_leave_balance_ledger is 'Immutable leave balance ledger. Use reversal movements for corrections.';
comment on table public.admin_kiosko_staff_leave_requests is 'Employee leave requests and administrative approval state. Does not silently modify shifts.';
comment on table public.admin_kiosko_staff_payroll_variables is 'Preparatory payroll variables only. No salary amounts are calculated here.';
