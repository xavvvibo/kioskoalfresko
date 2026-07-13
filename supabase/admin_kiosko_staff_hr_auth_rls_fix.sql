-- RRHH auth/RLS hardening.
-- Estrategia A: la identidad real es la cookie interna admin_kiosko_session -> public.admin_users.id.
-- Las tablas RRHH no se consumen directamente desde el navegador con Supabase Auth.
-- RLS permanece activado para bloquear acceso directo anon/authenticated; la autorización de usuario se hace server-side.
-- No aplicar automáticamente en producción. Revisar primero con el runbook de docs/staff-auth-rls-architecture.md.

create extension if not exists pgcrypto;

comment on column public.admin_kiosko_staff_employees.auth_user_id is
  'Legacy name retained for compatibility. References public.admin_users.id from internal admin_kiosko_session, not auth.uid() from Supabase Auth.';

comment on function public.admin_kiosko_staff_current_employee_id() is
  'Legacy Supabase Auth helper. Not used by the application identity model after RRHH auth/RLS hardening.';

comment on function public.admin_kiosko_staff_has_role(text, uuid) is
  'Legacy Supabase Auth helper. Application authorization is resolved server-side from admin_users and staff roles.';

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
    'admin_kiosko_staff_audit_log',
    'admin_kiosko_staff_organizations',
    'admin_kiosko_staff_employee_private_profiles',
    'admin_kiosko_staff_employee_authorized_locations',
    'admin_kiosko_staff_documents',
    'admin_kiosko_staff_training_catalog',
    'admin_kiosko_staff_training_assignments',
    'admin_kiosko_staff_absences',
    'admin_kiosko_staff_disciplinary_cases',
    'admin_kiosko_staff_signatures',
    'admin_kiosko_staff_timeline_events',
    'admin_kiosko_staff_leave_policies',
    'admin_kiosko_staff_leave_balance_periods',
    'admin_kiosko_staff_leave_balance_ledger',
    'admin_kiosko_staff_leave_requests',
    'admin_kiosko_staff_leave_request_decisions',
    'admin_kiosko_staff_shift_absence_impacts',
    'admin_kiosko_staff_period_locks',
    'admin_kiosko_staff_payroll_variables',
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
    'admin_kiosko_staff_read_confirmations',
    'admin_kiosko_staff_process_templates',
    'admin_kiosko_staff_process_template_tasks',
    'admin_kiosko_staff_processes',
    'admin_kiosko_staff_process_tasks',
    'admin_kiosko_staff_document_requirements',
    'admin_kiosko_staff_internal_policies',
    'admin_kiosko_staff_policy_assignments',
    'admin_kiosko_staff_training_requirements',
    'admin_kiosko_staff_training_modules',
    'admin_kiosko_staff_training_attempts',
    'admin_kiosko_staff_prl_records',
    'admin_kiosko_staff_equipment_catalog',
    'admin_kiosko_staff_equipment_assignments',
    'admin_kiosko_staff_access_assignments',
    'admin_kiosko_staff_checklist_templates',
    'admin_kiosko_staff_checklist_template_items',
    'admin_kiosko_staff_checklist_runs',
    'admin_kiosko_staff_checklist_results',
    'admin_kiosko_staff_checklist_issues',
    'admin_kiosko_staff_compliance_alerts'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke all on table public.%I from authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end $$;

do $$
declare
  policy_name text;
  table_name text;
begin
  for policy_name, table_name in
    select *
    from (values
      ('admin_kiosko_staff_employees_self_select','admin_kiosko_staff_employees'),
      ('admin_kiosko_staff_contracts_hr_select','admin_kiosko_staff_contracts'),
      ('admin_kiosko_staff_locations_employee_select','admin_kiosko_staff_locations'),
      ('admin_kiosko_staff_shifts_employee_select','admin_kiosko_staff_shifts'),
      ('admin_kiosko_staff_assignments_employee_select','admin_kiosko_staff_shift_assignments'),
      ('admin_kiosko_staff_work_entries_employee_rw','admin_kiosko_staff_work_entries'),
      ('admin_kiosko_staff_break_entries_employee_rw','admin_kiosko_staff_break_entries'),
      ('admin_kiosko_staff_incidents_employee_rw','admin_kiosko_staff_time_incidents'),
      ('admin_kiosko_staff_audit_select_scoped','admin_kiosko_staff_audit_log'),
      ('staff_documents_employee_select','admin_kiosko_staff_documents'),
      ('staff_training_employee_select','admin_kiosko_staff_training_assignments'),
      ('staff_absences_employee_select','admin_kiosko_staff_absences'),
      ('staff_timeline_employee_select','admin_kiosko_staff_timeline_events'),
      ('staff_signatures_employee_select','admin_kiosko_staff_signatures'),
      ('staff_disciplinary_hr_select','admin_kiosko_staff_disciplinary_cases'),
      ('staff_leave_policies_employee_select','admin_kiosko_staff_leave_policies'),
      ('staff_leave_periods_employee_select','admin_kiosko_staff_leave_balance_periods'),
      ('staff_leave_requests_employee_rw','admin_kiosko_staff_leave_requests'),
      ('staff_leave_ledger_employee_select','admin_kiosko_staff_leave_balance_ledger'),
      ('staff_period_locks_hr_select','admin_kiosko_staff_period_locks'),
      ('staff_payroll_variables_hr_select','admin_kiosko_staff_payroll_variables'),
      ('staff_availability_self_select','admin_kiosko_staff_recurring_availability'),
      ('staff_availability_self_write','admin_kiosko_staff_recurring_availability'),
      ('staff_availability_exceptions_self_rw','admin_kiosko_staff_availability_exceptions'),
      ('staff_work_preferences_self_rw','admin_kiosko_staff_work_preferences'),
      ('staff_shift_changes_participant_rw','admin_kiosko_staff_shift_change_requests'),
      ('staff_offer_recipients_self_rw','admin_kiosko_staff_shift_offer_recipients'),
      ('staff_offers_employee_select','admin_kiosko_staff_shift_offers'),
      ('staff_notifications_self_rw','admin_kiosko_staff_notifications'),
      ('staff_read_confirmations_self_rw','admin_kiosko_staff_read_confirmations'),
      ('staff_phase3_hr_select','admin_kiosko_staff_candidate_scores'),
      ('staff_phase3_admin_tables_select','admin_kiosko_staff_coverage_requests'),
      ('staff_processes_employee_select','admin_kiosko_staff_processes'),
      ('staff_process_tasks_employee_select','admin_kiosko_staff_process_tasks'),
      ('staff_policy_assignments_employee_rw','admin_kiosko_staff_policy_assignments'),
      ('staff_training_modules_employee_select','admin_kiosko_staff_training_modules'),
      ('staff_training_attempts_employee_rw','admin_kiosko_staff_training_attempts'),
      ('staff_equipment_employee_select','admin_kiosko_staff_equipment_assignments'),
      ('staff_checklist_runs_employee_rw','admin_kiosko_staff_checklist_runs'),
      ('staff_compliance_hr_select','admin_kiosko_staff_compliance_alerts')
    ) as policies(policy_name, table_name)
  loop
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
  end loop;
end $$;
