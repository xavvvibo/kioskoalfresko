create extension if not exists pgcrypto;

create table if not exists public.admin_kiosko_staff_process_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  process_type text not null check (process_type in ('onboarding','offboarding')),
  name text not null,
  position text,
  role_name text,
  contract_type text,
  department text,
  exit_reason text check (exit_reason is null or exit_reason in ('voluntary','contract_end','dismissal','retirement','transfer','other')),
  version integer not null default 1 check (version > 0),
  active boolean not null default true,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, location_id, process_type, name, version)
);

create table if not exists public.admin_kiosko_staff_process_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.admin_kiosko_staff_process_templates(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  title text not null,
  description text,
  task_type text not null check (task_type in ('administrative','document','signature','training','access','equipment','uniform','prl','appcc','meeting','checklist','custom')),
  sort_order integer not null default 0,
  responsible_role text,
  due_offset_days integer not null default 0,
  mandatory boolean not null default true,
  blocking boolean not null default false,
  requires_evidence boolean not null default false,
  requires_document boolean not null default false,
  requires_signature boolean not null default false,
  requires_approval boolean not null default false,
  visible_to_employee boolean not null default false,
  instructions text,
  expires_after_days integer check (expires_after_days is null or expires_after_days >= 0),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  process_type text not null check (process_type in ('onboarding','offboarding')),
  position text,
  role_name text,
  manager_user_id uuid references public.admin_users(id) on delete set null,
  manager_employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  planned_date date,
  effective_date date,
  template_id uuid references public.admin_kiosko_staff_process_templates(id) on delete set null,
  template_version integer,
  status text not null default 'draft' check (status in ('draft','planned','in_progress','blocked','ready','completed','cancelled')),
  completion_percent numeric(5,2) not null default 0 check (completion_percent >= 0 and completion_percent <= 100),
  blockers jsonb not null default '[]'::jsonb,
  notes text,
  exit_reason text check (exit_reason is null or exit_reason in ('voluntary','contract_end','dismissal','retirement','transfer','other')),
  portal_access_until timestamptz,
  created_by uuid references public.admin_users(id) on delete set null,
  completed_by uuid references public.admin_users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_process_tasks (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.admin_kiosko_staff_processes(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  template_task_id uuid references public.admin_kiosko_staff_process_template_tasks(id) on delete set null,
  template_version integer,
  title text not null,
  description text,
  task_type text not null check (task_type in ('administrative','document','signature','training','access','equipment','uniform','prl','appcc','meeting','checklist','custom')),
  responsible_user_id uuid references public.admin_users(id) on delete set null,
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending','available','in_progress','waiting_employee','waiting_manager','blocked','completed','waived','cancelled','expired')),
  result text,
  evidence jsonb not null default '{}'::jsonb,
  document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  signature_id uuid references public.admin_kiosko_staff_signatures(id) on delete set null,
  training_assignment_id uuid references public.admin_kiosko_staff_training_assignments(id) on delete set null,
  equipment_assignment_id uuid,
  checklist_run_id uuid,
  comments text,
  mandatory boolean not null default true,
  blocking boolean not null default false,
  requires_evidence boolean not null default false,
  requires_document boolean not null default false,
  requires_signature boolean not null default false,
  requires_approval boolean not null default false,
  visible_to_employee boolean not null default false,
  completed_by uuid references public.admin_users(id) on delete set null,
  completed_at timestamptz,
  blocked_reason text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_document_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  position text,
  role_name text,
  document_category text not null,
  mandatory boolean not null default true,
  due_offset_days integer not null default 0,
  expires_after_days integer check (expires_after_days is null or expires_after_days >= 0),
  requires_validation boolean not null default true,
  requires_signature boolean not null default false,
  visible_to_employee boolean not null default true,
  instructions text,
  minimum_version integer not null default 1,
  active boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_internal_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  title text not null,
  code text not null,
  category text not null,
  content text not null,
  version integer not null default 1 check (version > 0),
  effective_on date,
  status text not null default 'draft' check (status in ('draft','published','superseded','archived')),
  requires_read boolean not null default true,
  requires_confirmation boolean not null default true,
  requires_signature boolean not null default false,
  applicable_positions text[] not null default '{}',
  document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  created_by uuid references public.admin_users(id) on delete set null,
  published_by uuid references public.admin_users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code, version)
);

create table if not exists public.admin_kiosko_staff_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  policy_id uuid not null references public.admin_kiosko_staff_internal_policies(id) on delete cascade,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  policy_version integer not null,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  acknowledged_at timestamptz,
  signature_id uuid references public.admin_kiosko_staff_signatures(id) on delete set null,
  ip_address inet,
  user_agent text,
  confirmed_text text,
  status text not null default 'pending' check (status in ('pending','delivered','read','acknowledged','signed','declined','expired','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (policy_id, employee_id, policy_version)
);

create table if not exists public.admin_kiosko_staff_training_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  position text,
  role_name text,
  task_type text,
  risk_level text check (risk_level is null or risk_level in ('low','medium','high','critical')),
  training_id uuid references public.admin_kiosko_staff_training_catalog(id) on delete set null,
  internal_module_id uuid,
  mandatory boolean not null default true,
  due_offset_days integer not null default 0,
  recurrence_months integer check (recurrence_months is null or recurrence_months > 0),
  expires_after_months integer check (expires_after_months is null or expires_after_months > 0),
  provider text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  evidence_required boolean not null default false,
  certificate_required boolean not null default false,
  assessment_required boolean not null default false,
  min_score numeric(5,2) check (min_score is null or (min_score >= 0 and min_score <= 100)),
  validation_responsible text,
  active boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_training_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  title text not null,
  description text,
  content text not null,
  media_url text,
  document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  questions jsonb not null default '[]'::jsonb,
  min_score numeric(5,2) not null default 80 check (min_score >= 0 and min_score <= 100),
  attempts_allowed integer not null default 3 check (attempts_allowed > 0),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  applicable_positions text[] not null default '{}',
  created_by uuid references public.admin_users(id) on delete set null,
  published_by uuid references public.admin_users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_training_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  module_id uuid not null references public.admin_kiosko_staff_training_modules(id) on delete cascade,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  module_version integer not null,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2) not null default 0 check (score >= 0 and score <= 100),
  passed boolean not null default false,
  attempted_at timestamptz not null default now(),
  reviewed_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_prl_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  record_type text not null check (record_type in ('job_risk_assessment','mandatory_training','information_delivery','ppe_delivery','medical_fitness','review_pending','incident','accident_reported','preventive_measure')),
  title text not null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','expired','cancelled')),
  medical_fitness_status text not null default 'unknown' check (medical_fitness_status in ('not_required','pending','fit','fit_with_restrictions','not_fit','expired','unknown')),
  responsible_user_id uuid references public.admin_users(id) on delete set null,
  effective_on date,
  review_on date,
  document_id uuid references public.admin_kiosko_staff_documents(id) on delete set null,
  notes text,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  item_type text not null check (item_type in ('shirt','pants','apron','shoes','gloves','hat','jacket','keys','card','device','tools','ppe','other')),
  name text not null,
  active boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_equipment_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  item_id uuid references public.admin_kiosko_staff_equipment_catalog(id) on delete set null,
  item_name text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  size text,
  serial_number text,
  status text not null default 'pending' check (status in ('pending','delivered','returned','lost','damaged','written_off')),
  delivered_at timestamptz,
  delivered_by uuid references public.admin_users(id) on delete set null,
  signature_id uuid references public.admin_kiosko_staff_signatures(id) on delete set null,
  expected_return_at date,
  returned_at timestamptz,
  return_status text,
  notes text,
  informational_cost numeric(10,2) check (informational_cost is null or informational_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_access_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  employee_id uuid not null references public.admin_kiosko_staff_employees(id) on delete cascade,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  access_type text not null check (access_type in ('staff_portal','admin_internal','pos','qamarero','email','internal_wifi','keys','alarm','cash_register','printer','godex','suppliers','other')),
  required boolean not null default true,
  status text not null default 'pending' check (status in ('not_required','pending','requested','active','suspended','revoked','failed')),
  requested_at timestamptz,
  granted_at timestamptz,
  revoked_at timestamptz,
  responsible_user_id uuid references public.admin_users(id) on delete set null,
  external_identifier text,
  notes text,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete cascade,
  name text not null,
  checklist_type text not null check (checklist_type in ('opening','closing','kitchen','front_of_house','cleaning','appcc','cash','inventory','custom')),
  position text,
  role_name text,
  shift_kind text,
  weekday integer check (weekday is null or weekday between 0 and 6),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references public.admin_users(id) on delete set null,
  published_by uuid references public.admin_users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, location_id, name, version)
);

create table if not exists public.admin_kiosko_staff_checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.admin_kiosko_staff_checklist_templates(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  text text not null,
  instructions text,
  response_type text not null check (response_type in ('checkbox','text','number','temperature','photo','selection','signature')),
  mandatory boolean not null default true,
  critical boolean not null default false,
  min_value numeric(10,2),
  max_value numeric(10,2),
  unit text,
  requires_evidence boolean not null default false,
  generates_incident boolean not null default false,
  sort_order integer not null default 0,
  responsible_role text,
  category text,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_checklist_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  template_id uuid references public.admin_kiosko_staff_checklist_templates(id) on delete set null,
  template_version integer not null,
  tasks_snapshot jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','available','in_progress','completed','completed_with_issues','missed','waived')),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  incident_ids uuid[] not null default '{}',
  signature_id uuid references public.admin_kiosko_staff_signatures(id) on delete set null,
  supervised_by uuid references public.admin_users(id) on delete set null,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_checklist_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.admin_kiosko_staff_checklist_runs(id) on delete cascade,
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  item_id uuid references public.admin_kiosko_staff_checklist_template_items(id) on delete set null,
  item_text text not null,
  response_type text not null,
  value_text text,
  value_number numeric(10,2),
  passed boolean,
  evidence jsonb not null default '{}'::jsonb,
  incident_id uuid,
  completed_by uuid references public.admin_users(id) on delete set null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_checklist_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  run_id uuid references public.admin_kiosko_staff_checklist_runs(id) on delete set null,
  result_id uuid references public.admin_kiosko_staff_checklist_results(id) on delete set null,
  shift_id uuid references public.admin_kiosko_staff_shifts(id) on delete set null,
  employee_id uuid references public.admin_kiosko_staff_employees(id) on delete set null,
  item_text text not null,
  observed_value text,
  expected_limit text,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','acknowledged','corrective_action','resolved','dismissed')),
  corrective_action text,
  responsible_user_id uuid references public.admin_users(id) on delete set null,
  resolved_by uuid references public.admin_users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_kiosko_staff_compliance_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.admin_kiosko_staff_organizations(id) on delete restrict,
  location_id uuid references public.admin_kiosko_staff_locations(id) on delete set null,
  employee_id uuid references public.admin_kiosko_staff_employees(id) on delete cascade,
  category text not null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  title text not null,
  description text,
  entity_type text,
  entity_id uuid,
  responsible_user_id uuid references public.admin_users(id) on delete set null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.admin_kiosko_staff_phase4_sanitize(input jsonb)
returns jsonb language sql immutable as $$
  select coalesce(input, '{}'::jsonb) - array['diagnosis','medicalDetails','dni','nss','iban','salary','documentContent','clinicalData','password'];
$$;

create index if not exists admin_kiosko_staff_processes_employee_idx on public.admin_kiosko_staff_processes(employee_id, process_type, status, planned_date);
create index if not exists admin_kiosko_staff_process_tasks_process_idx on public.admin_kiosko_staff_process_tasks(process_id, status, due_at);
create index if not exists admin_kiosko_staff_document_requirements_scope_idx on public.admin_kiosko_staff_document_requirements(organization_id, location_id, position, role_name, active);
create index if not exists admin_kiosko_staff_policy_assignments_employee_idx on public.admin_kiosko_staff_policy_assignments(employee_id, status, delivered_at desc);
create index if not exists admin_kiosko_staff_training_requirements_scope_idx on public.admin_kiosko_staff_training_requirements(organization_id, location_id, position, role_name, active);
create index if not exists admin_kiosko_staff_prl_employee_idx on public.admin_kiosko_staff_prl_records(employee_id, status, review_on);
create index if not exists admin_kiosko_staff_equipment_employee_idx on public.admin_kiosko_staff_equipment_assignments(employee_id, status, expected_return_at);
create index if not exists admin_kiosko_staff_access_employee_idx on public.admin_kiosko_staff_access_assignments(employee_id, access_type, status);
create index if not exists admin_kiosko_staff_checklist_runs_shift_idx on public.admin_kiosko_staff_checklist_runs(shift_id, employee_id, status, due_at);
create index if not exists admin_kiosko_staff_checklist_issues_status_idx on public.admin_kiosko_staff_checklist_issues(organization_id, location_id, status, created_at desc);
create index if not exists admin_kiosko_staff_compliance_alerts_status_idx on public.admin_kiosko_staff_compliance_alerts(organization_id, location_id, employee_id, status, severity, due_at);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'admin_kiosko_staff_process_templates','admin_kiosko_staff_process_template_tasks','admin_kiosko_staff_processes','admin_kiosko_staff_process_tasks',
    'admin_kiosko_staff_document_requirements','admin_kiosko_staff_internal_policies','admin_kiosko_staff_policy_assignments',
    'admin_kiosko_staff_training_requirements','admin_kiosko_staff_training_modules','admin_kiosko_staff_training_attempts',
    'admin_kiosko_staff_prl_records','admin_kiosko_staff_equipment_catalog','admin_kiosko_staff_equipment_assignments',
    'admin_kiosko_staff_access_assignments','admin_kiosko_staff_checklist_templates','admin_kiosko_staff_checklist_template_items',
    'admin_kiosko_staff_checklist_runs','admin_kiosko_staff_checklist_results','admin_kiosko_staff_checklist_issues','admin_kiosko_staff_compliance_alerts'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_touch', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.admin_kiosko_staff_touch_updated_at()', table_name || '_touch', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end $$;

drop policy if exists staff_processes_employee_select on public.admin_kiosko_staff_processes;
create policy staff_processes_employee_select on public.admin_kiosko_staff_processes for select to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null) or public.admin_kiosko_staff_has_role('staff_location_manager', location_id));

drop policy if exists staff_process_tasks_employee_select on public.admin_kiosko_staff_process_tasks;
create policy staff_process_tasks_employee_select on public.admin_kiosko_staff_process_tasks for select to authenticated
using ((visible_to_employee and employee_id = public.admin_kiosko_staff_current_employee_id()) or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_policy_assignments_employee_rw on public.admin_kiosko_staff_policy_assignments;
create policy staff_policy_assignments_employee_rw on public.admin_kiosko_staff_policy_assignments for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_training_modules_employee_select on public.admin_kiosko_staff_training_modules;
create policy staff_training_modules_employee_select on public.admin_kiosko_staff_training_modules for select to authenticated
using (status = 'published' or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_training_attempts_employee_rw on public.admin_kiosko_staff_training_attempts;
create policy staff_training_attempts_employee_rw on public.admin_kiosko_staff_training_attempts for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_equipment_employee_select on public.admin_kiosko_staff_equipment_assignments;
create policy staff_equipment_employee_select on public.admin_kiosko_staff_equipment_assignments for select to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_checklist_runs_employee_rw on public.admin_kiosko_staff_checklist_runs;
create policy staff_checklist_runs_employee_rw on public.admin_kiosko_staff_checklist_runs for all to authenticated
using (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null) or public.admin_kiosko_staff_has_role('staff_location_manager', location_id))
with check (employee_id = public.admin_kiosko_staff_current_employee_id() or public.admin_kiosko_staff_has_role('staff_hr', null));

drop policy if exists staff_compliance_hr_select on public.admin_kiosko_staff_compliance_alerts;
create policy staff_compliance_hr_select on public.admin_kiosko_staff_compliance_alerts for select to authenticated
using (public.admin_kiosko_staff_has_role('staff_hr', null) or public.admin_kiosko_staff_has_role('staff_location_manager', location_id));

comment on table public.admin_kiosko_staff_processes is 'Generic employee process engine for onboarding and offboarding. Employees see only their own visible tasks.';
comment on table public.admin_kiosko_staff_document_requirements is 'Required-document rules by organization, center, position and role. Reuses admin_kiosko_staff_documents.';
comment on table public.admin_kiosko_staff_internal_policies is 'Versioned internal policies and communications. Signed versions are immutable by process.';
comment on table public.admin_kiosko_staff_prl_records is 'Administrative PRL tracking only. Do not store clinical data.';
comment on table public.admin_kiosko_staff_checklist_runs is 'Shift checklist executions. Does not block clock-out; use warnings.';
