create extension if not exists pgcrypto;

create table if not exists public.admin_kiosko_staff_operational_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  name text not null,
  min_rest_minutes integer not null default 720 check (min_rest_minutes >= 0),
  max_daily_minutes integer check (max_daily_minutes is null or max_daily_minutes > 0),
  max_weekly_minutes integer check (max_weekly_minutes is null or max_weekly_minutes > 0),
  max_consecutive_days integer check (max_consecutive_days is null or max_consecutive_days > 0),
  overlap_tolerance_minutes integer not null default 0 check (overlap_tolerance_minutes >= 0),
  min_notice_minutes integer not null default 0 check (min_notice_minutes >= 0),
  additional_hours_limit_minutes integer check (additional_hours_limit_minutes is null or additional_hours_limit_minutes >= 0),
  week_starts_on integer not null default 1 check (week_starts_on between 0 and 6),
  split_shift_alert_minutes integer check (split_shift_alert_minutes is null or split_shift_alert_minutes >= 0),
  active boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_recurring_availability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  availability_type text not null check (availability_type in ('available','unavailable','positive_preference','negative_preference')),
  starts_at time,
  ends_at time,
  full_day boolean not null default false,
  notes text,
  valid_from date not null default current_date,
  valid_until date,
  priority integer not null default 0,
  origin text not null default 'employee' check (origin in ('employee','admin','contract','import')),
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_recurring_availability_valid_dates check (valid_until is null or valid_until >= valid_from),
  constraint admin_kiosko_staff_recurring_availability_time_window check (full_day or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);

create table if not exists public.admin_kiosko_staff_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  availability_type text not null check (availability_type in ('available','unavailable')),
  reason text,
  notes text,
  status text not null default 'submitted' check (status in ('draft','submitted','approved','rejected','cancelled')),
  requested_by uuid references public.admin_users(id) on delete set null,
  resolved_by uuid references public.admin_users(id) on delete set null,
  resolved_at timestamptz,
  resolution_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_availability_exception_dates check (ends_at > starts_at)
);

create table if not exists public.admin_kiosko_staff_work_preferences (
  employee_id uuid primary key references public.admin_kiosko_staff_employees(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  preferred_shift_parts text[] not null default '{}',
  preferred_free_weekdays integer[] not null default '{}',
  preferred_location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  preferred_roles text[] not null default '{}',
  avoid_split_shifts boolean not null default false,
  preferred_max_consecutive_days integer check (preferred_max_consecutive_days is null or preferred_max_consecutive_days > 0),
  accepts_additional_hours boolean not null default false,
  accepts_urgent_coverage boolean not null default false,
  notes text,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_shift_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  requester_employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  original_shift_id uuid not null references public.admin_kiosko_staff_shifts(id) on delete restrict,
  request_type text not null check (request_type in ('give_away','swap','release','change_time','change_location','request_cover')),
  reason text not null,
  notes text,
  proposed_employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  proposed_shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  proposed_starts_at timestamptz,
  proposed_ends_at timestamptz,
  proposed_location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','submitted','searching_candidate','candidate_proposed','candidate_accepted','pending_manager','approved','rejected','cancelled','expired','executed')),
  deadline_at timestamptz,
  requires_manager_approval boolean not null default true,
  resolution text,
  resolved_by uuid references public.admin_users(id) on delete set null,
  resolved_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_shift_change_proposed_time check (proposed_ends_at is null or proposed_starts_at is null or proposed_ends_at > proposed_starts_at)
);

create table if not exists public.admin_kiosko_staff_shift_change_participants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.admin_kiosko_staff_shift_change_requests(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  role text not null check (role in ('requester','candidate','manager')),
  response text check (response in ('pending','accepted','declined','cancelled','expired')),
  responded_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, employee_id, role)
);

create table if not exists public.admin_kiosko_staff_shift_vacancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  shift_id uuid not null references public.admin_kiosko_staff_shifts(id) on delete cascade,
  location_id uuid not null references public.admin_kiosko_staff_locations(id) on delete restrict,
  role_name text,
  vacancy_status text not null default 'open' check (vacancy_status in ('draft','open','coverage_requested','covered','cancelled','expired')),
  previous_assignment_id uuid references public.admin_kiosko_staff_shift_assignments(id) on delete set null,
  reason text,
  deadline_at timestamptz,
  created_by uuid references public.admin_users(id) on delete set null,
  closed_by uuid references public.admin_users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, role_name)
);

create table if not exists public.admin_kiosko_staff_coverage_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  vacancy_id uuid references public.admin_kiosko_staff_shift_vacancies(id) on delete set null,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  reason text not null,
  urgency text not null default 'normal' check (urgency in ('low','normal','high','critical')),
  deadline_at timestamptz,
  status text not null default 'draft' check (status in ('draft','open','notified','responses_received','assigned','expired','cancelled')),
  assigned_employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  manager_user_id uuid references public.admin_users(id) on delete set null,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_shift_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  coverage_request_id uuid references public.admin_kiosko_staff_coverage_requests(id) on delete set null,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  title text not null,
  role_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  deadline_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','closed','cancelled','expired','assigned')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_by uuid references public.admin_users(id) on delete set null,
  assigned_employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  offer_version integer not null default 1 check (offer_version > 0),
  history jsonb not null default '[]'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_shift_offer_dates check (ends_at > starts_at),
  unique (idempotency_key)
);

create table if not exists public.admin_kiosko_staff_shift_offer_recipients (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.admin_kiosko_staff_shift_offers(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending','accepted','declined','interested','unavailable','expired')),
  responded_at timestamptz,
  comment text,
  offer_version integer not null default 1,
  shift_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, employee_id)
);

create table if not exists public.admin_kiosko_staff_candidate_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  entity_type text not null check (entity_type in ('coverage_request','shift_offer','shift_change')),
  entity_id uuid not null,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  eligible boolean not null default false,
  score numeric(8,2) not null default 0,
  blocking_reasons jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  positive_factors jsonb not null default '[]'::jsonb,
  planned_minutes integer not null default 0,
  contract_minutes integer,
  generated_at timestamptz not null default now(),
  idempotency_key text not null,
  unique (idempotency_key)
);

create table if not exists public.admin_kiosko_staff_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  recipient_employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  notification_type text not null check (notification_type in ('shift_published','shift_changed','shift_cancelled','swap_requested','swap_accepted','swap_rejected','coverage_offer','coverage_assigned','leave_approved','leave_rejected','availability_resolved','document_signature_required','period_locked','generic')),
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  read boolean not null default false,
  read_at timestamptz,
  archived boolean not null default false,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_users(id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists public.admin_kiosko_staff_schedule_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  period_starts_on date not null,
  period_ends_on date not null,
  version integer not null check (version > 0),
  published_at timestamptz,
  published_by uuid references public.admin_users(id) on delete set null,
  shift_ids uuid[] not null default '{}',
  affected_employee_ids uuid[] not null default '{}',
  change_summary jsonb not null default '{}'::jsonb,
  previous_publication_id uuid references public.admin_kiosko_staff_schedule_publications(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','superseded','cancelled')),
  effective_at timestamptz,
  notifications_generated integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kiosko_staff_schedule_publication_dates check (period_ends_on >= period_starts_on),
  unique (organization_id, location_id, period_starts_on, period_ends_on, version)
);

create table if not exists public.admin_kiosko_staff_schedule_publication_changes (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.admin_kiosko_staff_schedule_publications(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  change_type text not null check (change_type in ('shift_created','shift_removed','time_changed','location_changed','employee_assigned','employee_unassigned','employee_replaced','role_changed','status_changed')),
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  actor_user_id uuid references public.admin_users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_read_confirmations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  entity_version integer not null default 1,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  explicitly_confirmed boolean not null default false,
  confirmed_at timestamptz,
  ip_address inet,
  user_agent text,
  confirmed_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, entity_type, entity_id, entity_version)
);

create or replace function public.admin_kiosko_staff_sanitize_phase3_metadata(input jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(input, '{}'::jsonb) - array['diagnosis','medicalDetails','dni','nss','iban','salary','documentContent'];
$$;

create index if not exists admin_kiosko_staff_recurring_availability_employee_idx on public.admin_kiosko_staff_recurring_availability(employee_id, weekday, status, valid_from);
create index if not exists admin_kiosko_staff_availability_exceptions_employee_idx on public.admin_kiosko_staff_availability_exceptions(employee_id, starts_at, ends_at, status);
create index if not exists admin_kiosko_staff_shift_changes_employee_idx on public.admin_kiosko_staff_shift_change_requests(requester_employee_id, status, created_at desc);
create index if not exists admin_kiosko_staff_shift_changes_shift_idx on public.admin_kiosko_staff_shift_change_requests(original_shift_id, status);
create index if not exists admin_kiosko_staff_vacancies_status_idx on public.admin_kiosko_staff_shift_vacancies(organization_id, location_id, vacancy_status, deadline_at);
create index if not exists admin_kiosko_staff_coverage_status_idx on public.admin_kiosko_staff_coverage_requests(organization_id, location_id, status, deadline_at);
create index if not exists admin_kiosko_staff_offer_status_idx on public.admin_kiosko_staff_shift_offers(organization_id, location_id, status, starts_at);
create index if not exists admin_kiosko_staff_offer_recipients_employee_idx on public.admin_kiosko_staff_shift_offer_recipients(employee_id, response, created_at desc);
create index if not exists admin_kiosko_staff_candidate_scores_entity_idx on public.admin_kiosko_staff_candidate_scores(entity_type, entity_id, score desc);
create index if not exists admin_kiosko_staff_notifications_employee_idx on public.admin_kiosko_staff_notifications(recipient_employee_id, read, archived, created_at desc);
create index if not exists admin_kiosko_staff_schedule_publications_period_idx on public.admin_kiosko_staff_schedule_publications(organization_id, location_id, period_starts_on, period_ends_on, status);
create index if not exists admin_kiosko_staff_read_confirmations_employee_idx on public.admin_kiosko_staff_read_confirmations(employee_id, entity_type, read_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_kiosko_staff_operational_rules',
    'admin_kiosko_staff_recurring_availability',
    'admin_kiosko_staff_availability_exceptions',
    'admin_kiosko_staff_work_preferences',
    'admin_kiosko_staff_shift_change_requests',
    'admin_kiosko_staff_shift_change_participants',
    'admin_kiosko_staff_shift_vacancies',
    'admin_kiosko_staff_coverage_requests',
    'admin_kiosko_staff_shift_offers',
    'admin_kiosko_staff_shift_offer_recipients',
    'admin_kiosko_staff_candidate_scores',
    'admin_kiosko_staff_notifications',
    'admin_kiosko_staff_schedule_publications',
    'admin_kiosko_staff_schedule_publication_changes',
    'admin_kiosko_staff_read_confirmations'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_touch', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.admin_kiosko_staff_touch_updated_at()', table_name || '_touch', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end $$;

drop policy if exists staff_availability_self_select on public.admin_kiosko_staff_recurring_availability;
create policy staff_availability_self_select on public.admin_kiosko_staff_recurring_availability
for select to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null) or public.admin_kiosko_staff_has_role('staff_location_manager', location_id));

drop policy if exists staff_availability_self_write on public.admin_kiosko_staff_recurring_availability;
create policy staff_availability_self_write on public.admin_kiosko_staff_recurring_availability
for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_availability_exceptions_self_rw on public.admin_kiosko_staff_availability_exceptions;
create policy staff_availability_exceptions_self_rw on public.admin_kiosko_staff_availability_exceptions
for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null) or public.admin_kiosko_staff_has_role('staff_location_manager', location_id))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_work_preferences_self_rw on public.admin_kiosko_staff_work_preferences;
create policy staff_work_preferences_self_rw on public.admin_kiosko_staff_work_preferences
for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_shift_changes_participant_rw on public.admin_kiosko_staff_shift_change_requests;
create policy staff_shift_changes_participant_rw on public.admin_kiosko_staff_shift_change_requests
for all to authenticated
using (
  requester_employee_id = public.admin_kiosko_staff_current_employee_id()
  or proposed_employee_id = public.admin_kiosko_staff_current_employee_id()
  or public.admin_kiosko_staff_has_role('staff_hr', null)
  or public.admin_kiosko_staff_has_role('staff_location_manager', location_id)
)
with check (
  requester_employee_id = public.admin_kiosko_staff_current_employee_id()
  or public.admin_kiosko_staff_has_role('staff_hr', null)
  or public.admin_kiosko_staff_has_role('staff_location_manager', location_id)
);

drop policy if exists staff_offer_recipients_self_rw on public.admin_kiosko_staff_shift_offer_recipients;
create policy staff_offer_recipients_self_rw on public.admin_kiosko_staff_shift_offer_recipients
for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_offers_employee_select on public.admin_kiosko_staff_shift_offers;
create policy staff_offers_employee_select on public.admin_kiosko_staff_shift_offers
for select to authenticated
using (
  public.admin_kiosko_staff_has_role('staff_hr', null)
  or exists (
    select 1 from public.admin_kiosko_staff_shift_offer_recipients r
    where r.offer_id = admin_kiosko_staff_shift_offers.id
      and r.employee_id = public.admin_kiosko_staff_current_employee_id()
  )
);

drop policy if exists staff_notifications_self_rw on public.admin_kiosko_staff_notifications;
create policy staff_notifications_self_rw on public.admin_kiosko_staff_notifications
for all to authenticated
using (recipient_employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
with check (recipient_employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_read_confirmations_self_rw on public.admin_kiosko_staff_read_confirmations;
create policy staff_read_confirmations_self_rw on public.admin_kiosko_staff_read_confirmations
for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_phase3_hr_select on public.admin_kiosko_staff_candidate_scores;
create policy staff_phase3_hr_select on public.admin_kiosko_staff_candidate_scores
for select to authenticated
using (public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_phase3_admin_tables_select on public.admin_kiosko_staff_coverage_requests;
create policy staff_phase3_admin_tables_select on public.admin_kiosko_staff_coverage_requests
for select to authenticated
using (public.admin_kiosko_staff_has_role('staff_hr', null) or public.admin_kiosko_staff_has_role('staff_location_manager', location_id));

comment on table public.admin_kiosko_staff_recurring_availability is 'Recurring employee availability and preferences. Point exceptions take precedence.';
comment on table public.admin_kiosko_staff_availability_exceptions is 'Dated availability exceptions. Do not store medical details here.';
comment on table public.admin_kiosko_staff_shift_change_requests is 'Employee shift change, swap, give-away, release and cover requests. Execution must be authorized server-side.';
comment on table public.admin_kiosko_staff_shift_vacancies is 'Open shift/vacancy state without altering legacy shift status checks.';
comment on table public.admin_kiosko_staff_candidate_scores is 'Explainable candidate ranking cache. It is advisory and not a legal decision.';
comment on table public.admin_kiosko_staff_notifications is 'Internal-only notifications. No email, SMS, WhatsApp or push provider is integrated.';
comment on table public.admin_kiosko_staff_schedule_publications is 'Formal schedule publication versions preserving previous publications and employee acknowledgements.';
