-- QA RRHH controlado e idempotente.
--
-- Finalidad:
--   Crear un dataset ficticio para probar de extremo a extremo las fases RRHH 1-4.
--
-- Entorno recomendado:
--   Ejecutar solo en Supabase local, staging o entorno QA controlado.
--   No ejecutarlo automáticamente contra producción.
--
-- Datos creados:
--   Organización QA Alfresko Group, centros QA Kiosko Alfresko y QA La Picatería,
--   usuarios internos QA sin contraseñas, empleados ficticios, contratos, turnos,
--   fichajes cerrados, ausencias, disponibilidad, cambios, ofertas, notificaciones,
--   onboarding, offboarding, políticas, formación, material, accesos y checklists.
--
-- Identificación:
--   Slug de organización: qa-alfresko-group
--   Slugs de centros: qa-kiosko-alfresko, qa-la-picateria
--   Códigos de empleado: QA-*
--   Usernames internos: qa_*
--
-- PIN:
--   Este archivo no contiene PIN en claro.
--   Para cargar pin_hash, genera un hash compatible:
--     QA_STAFF_PIN='<PIN_QA>' node /Users/xavibocanegra/kioskoalfresko/scripts/staff-hr-qa-setup.mjs --pin-hash
--   Antes de ejecutar el seed en SQL Editor:
--     set app.qa_staff_pin_hash = '<HASH_GENERADO>';
--
-- Retirada manual:
--   No hay borrado automático. Si necesitas retirar el dataset, filtra siempre por
--   organization slug = 'qa-alfresko-group', location slug like 'qa-%',
--   employee_code like 'QA-%' y username like 'qa_%'.

do $$
declare
  qa_pin_hash text := nullif(coalesce(current_setting('app.qa_staff_pin_hash', true), ''), '');
  org_id uuid := '10000000-0000-4000-8000-000000000001';
  loc_kiosko uuid := '10000000-0000-4000-8000-000000000101';
  loc_picateria uuid := '10000000-0000-4000-8000-000000000102';
  user_owner uuid := '10000000-0000-4000-8000-000000000201';
  user_manager uuid := '10000000-0000-4000-8000-000000000202';
  user_emp_kiosko uuid := '10000000-0000-4000-8000-000000000203';
  user_emp_picateria uuid := '10000000-0000-4000-8000-000000000204';
  user_emp_multi uuid := '10000000-0000-4000-8000-000000000205';
  emp_owner uuid := '10000000-0000-4000-8000-000000000301';
  emp_manager uuid := '10000000-0000-4000-8000-000000000302';
  emp_kiosko uuid := '10000000-0000-4000-8000-000000000303';
  emp_picateria uuid := '10000000-0000-4000-8000-000000000304';
  emp_multi uuid := '10000000-0000-4000-8000-000000000305';
  template_night uuid := '10000000-0000-4000-8000-000000000401';
  template_close uuid := '10000000-0000-4000-8000-000000000402';
  template_picateria uuid := '10000000-0000-4000-8000-000000000403';
  shift_draft uuid := '10000000-0000-4000-8000-000000000501';
  shift_published uuid := '10000000-0000-4000-8000-000000000502';
  shift_picateria uuid := '10000000-0000-4000-8000-000000000503';
  shift_open uuid := '10000000-0000-4000-8000-000000000504';
  assign_published uuid := '10000000-0000-4000-8000-000000000601';
  assign_picateria uuid := '10000000-0000-4000-8000-000000000602';
  policy_vacation uuid := '10000000-0000-4000-8000-000000000701';
  balance_kiosko uuid := '10000000-0000-4000-8000-000000000702';
  leave_submitted uuid := '10000000-0000-4000-8000-000000000703';
  leave_approved uuid := '10000000-0000-4000-8000-000000000704';
  availability_recurring uuid := '10000000-0000-4000-8000-000000000801';
  availability_exception uuid := '10000000-0000-4000-8000-000000000802';
  shift_change uuid := '10000000-0000-4000-8000-000000000901';
  vacancy_id uuid := '10000000-0000-4000-8000-000000000902';
  coverage_id uuid := '10000000-0000-4000-8000-000000000903';
  v_offer_id uuid := '10000000-0000-4000-8000-000000000904';
  publication_id uuid := '10000000-0000-4000-8000-000000000905';
  onboarding_template uuid := '10000000-0000-4000-8000-000000001001';
  offboarding_template uuid := '10000000-0000-4000-8000-000000001002';
  onboarding_process uuid := '10000000-0000-4000-8000-000000001101';
  offboarding_process uuid := '10000000-0000-4000-8000-000000001102';
  policy_internal uuid := '10000000-0000-4000-8000-000000001201';
  training_catalog uuid := '10000000-0000-4000-8000-000000001301';
  training_assignment uuid := '10000000-0000-4000-8000-000000001302';
  training_module uuid := '10000000-0000-4000-8000-000000001303';
  equipment_item uuid := '10000000-0000-4000-8000-000000001401';
  equipment_assignment uuid := '10000000-0000-4000-8000-000000001402';
  checklist_template uuid := '10000000-0000-4000-8000-000000001501';
  checklist_item uuid := '10000000-0000-4000-8000-000000001502';
  checklist_run uuid := '10000000-0000-4000-8000-000000001503';
begin
  insert into public.admin_kiosko_staff_organizations (id, name, slug, legal_name, tax_id, active)
  values (org_id, 'QA Alfresko Group', 'qa-alfresko-group', null, null, true)
  on conflict (slug) do update
  set name = excluded.name, active = excluded.active;

  insert into public.admin_kiosko_staff_locations (id, organization_id, name, slug, timezone, address, active, allows_kiosk_clock)
  values
    (loc_kiosko, org_id, 'QA Kiosko Alfresko', 'qa-kiosko-alfresko', 'Europe/Madrid', 'QA ficticio, no usar para operación real', true, true),
    (loc_picateria, org_id, 'QA La Picatería', 'qa-la-picateria', 'Europe/Madrid', 'QA ficticio, no usar para operación real', true, true)
  on conflict (slug) do update
  set organization_id = excluded.organization_id,
      name = excluded.name,
      timezone = excluded.timezone,
      address = excluded.address,
      active = excluded.active,
      allows_kiosk_clock = excluded.allows_kiosk_clock;

  insert into public.admin_users (id, username, email, display_name, role, status, password_hash, pin_hash)
  values
    (user_owner, 'qa_owner', 'qa.owner@example.invalid', 'QA Owner', 'owner', 'active', null, null),
    (user_manager, 'qa_manager_kiosko', 'qa.manager.kiosko@example.invalid', 'QA Manager Kiosko', 'employee', 'active', null, null),
    (user_emp_kiosko, 'qa_employee_kiosko', 'qa.employee.kiosko@example.invalid', 'QA Employee Kiosko', 'employee', 'active', null, null),
    (user_emp_picateria, 'qa_employee_picateria', 'qa.employee.picateria@example.invalid', 'QA Employee Picatería', 'employee', 'active', null, null),
    (user_emp_multi, 'qa_employee_multi', 'qa.employee.multi@example.invalid', 'QA Employee Multi-centro', 'employee', 'active', null, null)
  on conflict (username) do update
  set display_name = excluded.display_name,
      role = excluded.role,
      status = excluded.status,
      email = excluded.email,
      disabled_at = null;

  insert into public.admin_user_permissions (user_id, permission, enabled)
  values
    (user_owner, 'staff:admin', true),
    (user_owner, 'staff:hr', true),
    (user_owner, 'staff:audit:read', true),
    (user_manager, 'staff:shifts:manage', true),
    (user_manager, 'staff:time:review', true),
    (user_manager, 'staff:absence:approve', true),
    (user_manager, 'staff:availability:approve', true)
  on conflict (user_id, permission) do update
  set enabled = excluded.enabled;

  insert into public.admin_kiosko_staff_employees (
    id, organization_id, auth_user_id, employee_code, first_name, last_name, display_name, email, phone, status,
    hire_date, termination_date, primary_location_id, manager_employee_id, pin_hash
  )
  values
    (emp_owner, org_id, user_owner, 'QA-OWN-001', 'QA', 'Owner', 'QA Owner', 'qa.owner@example.invalid', null, 'active', current_date - 180, null, loc_kiosko, null, coalesce(qa_pin_hash, (select pin_hash from public.admin_kiosko_staff_employees where id = emp_owner))),
    (emp_manager, org_id, user_manager, 'QA-MGR-KIO-001', 'QA', 'Manager Kiosko', 'QA Manager Kiosko', 'qa.manager.kiosko@example.invalid', null, 'active', current_date - 120, null, loc_kiosko, emp_owner, coalesce(qa_pin_hash, (select pin_hash from public.admin_kiosko_staff_employees where id = emp_manager))),
    (emp_kiosko, org_id, user_emp_kiosko, 'QA-EMP-KIO-001', 'QA', 'Employee Kiosko', 'QA Employee Kiosko', 'qa.employee.kiosko@example.invalid', null, 'active', current_date - 60, null, loc_kiosko, emp_manager, coalesce(qa_pin_hash, (select pin_hash from public.admin_kiosko_staff_employees where id = emp_kiosko))),
    (emp_picateria, org_id, user_emp_picateria, 'QA-EMP-PIC-001', 'QA', 'Employee Picatería', 'QA Employee Picatería', 'qa.employee.picateria@example.invalid', null, 'active', current_date - 45, null, loc_picateria, emp_manager, coalesce(qa_pin_hash, (select pin_hash from public.admin_kiosko_staff_employees where id = emp_picateria))),
    (emp_multi, org_id, user_emp_multi, 'QA-EMP-MULTI-001', 'QA', 'Employee Multi-centro', 'QA Employee Multi-centro', 'qa.employee.multi@example.invalid', null, 'active', current_date - 90, null, loc_kiosko, emp_manager, coalesce(qa_pin_hash, (select pin_hash from public.admin_kiosko_staff_employees where id = emp_multi)))
  on conflict (employee_code) do update
  set organization_id = excluded.organization_id,
      auth_user_id = excluded.auth_user_id,
      display_name = excluded.display_name,
      email = excluded.email,
      status = excluded.status,
      hire_date = excluded.hire_date,
      termination_date = excluded.termination_date,
      primary_location_id = excluded.primary_location_id,
      manager_employee_id = excluded.manager_employee_id,
      pin_hash = coalesce(excluded.pin_hash, public.admin_kiosko_staff_employees.pin_hash);

  insert into public.admin_kiosko_staff_employee_roles (employee_id, location_id, role, active)
  values
    (emp_owner, null, 'admin', true),
    (emp_manager, loc_kiosko, 'staff_location_manager', true),
    (emp_kiosko, loc_kiosko, 'staff_employee', true),
    (emp_picateria, loc_picateria, 'staff_employee', true),
    (emp_multi, loc_kiosko, 'staff_employee', true),
    (emp_multi, loc_picateria, 'staff_employee', true)
  on conflict (employee_id, location_id, role) do update set active = excluded.active;

  insert into public.admin_kiosko_staff_employee_authorized_locations (employee_id, location_id, organization_id, created_by)
  values
    (emp_owner, loc_kiosko, org_id, user_owner),
    (emp_owner, loc_picateria, org_id, user_owner),
    (emp_manager, loc_kiosko, org_id, user_owner),
    (emp_kiosko, loc_kiosko, org_id, user_owner),
    (emp_picateria, loc_picateria, org_id, user_owner),
    (emp_multi, loc_kiosko, org_id, user_owner),
    (emp_multi, loc_picateria, org_id, user_owner)
  on conflict (employee_id, location_id) do update set organization_id = excluded.organization_id;

  insert into public.admin_kiosko_staff_contracts (id, organization_id, employee_id, contract_type, start_date, end_date, weekly_minutes, annual_minutes, workday_distribution, job_title, collective_agreement, salary_reference, active)
  values
    ('10000000-0000-4000-8000-000000000311', org_id, emp_owner, 'qa_indefinite', current_date - 180, null, 2400, null, '{"qa":true,"weeklyHours":40}'::jsonb, 'QA Owner', null, null, true),
    ('10000000-0000-4000-8000-000000000312', org_id, emp_manager, 'qa_indefinite', current_date - 120, null, 2400, null, '{"qa":true,"weeklyHours":40}'::jsonb, 'QA Manager', null, null, true),
    ('10000000-0000-4000-8000-000000000313', org_id, emp_kiosko, 'qa_part_time', current_date - 60, current_date + 20, 1200, null, '{"qa":true,"weeklyHours":20}'::jsonb, 'QA Sala', null, null, true),
    ('10000000-0000-4000-8000-000000000314', org_id, emp_picateria, 'qa_full_time', current_date - 45, null, 2400, null, '{"qa":true,"weeklyHours":40}'::jsonb, 'QA Cocina', null, null, true),
    ('10000000-0000-4000-8000-000000000315', org_id, emp_multi, 'qa_multi_center', current_date - 90, null, 1800, null, '{"qa":true,"weeklyHours":30,"multiCenter":true}'::jsonb, 'QA Multi-centro', null, null, true),
    ('10000000-0000-4000-8000-000000000316', org_id, emp_multi, 'qa_finished', current_date - 180, current_date - 100, 900, null, '{"qa":true,"finished":true}'::jsonb, 'QA Histórico', null, null, false)
  on conflict (id) do update
  set organization_id = excluded.organization_id,
      employee_id = excluded.employee_id,
      contract_type = excluded.contract_type,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      weekly_minutes = excluded.weekly_minutes,
      workday_distribution = excluded.workday_distribution,
      job_title = excluded.job_title,
      active = excluded.active;

  insert into public.admin_kiosko_staff_shift_templates (id, location_id, name, start_time, end_time, default_break_minutes, color_key, active)
  values
    (template_night, loc_kiosko, 'QA Servicio noche', '20:30', '00:30', 20, 'red', true),
    (template_close, loc_kiosko, 'QA Cierre', '21:00', '01:30', 30, 'amber', true),
    (template_picateria, loc_picateria, 'QA Servicio Picatería', '19:00', '23:00', 20, 'stone', true)
  on conflict (id) do update
  set location_id = excluded.location_id, name = excluded.name, start_time = excluded.start_time, end_time = excluded.end_time, default_break_minutes = excluded.default_break_minutes, color_key = excluded.color_key, active = excluded.active;

  insert into public.admin_kiosko_staff_shifts (id, organization_id, location_id, template_id, shift_date, starts_at, ends_at, status, published_at, published_by, notes)
  values
    (shift_draft, org_id, loc_kiosko, template_night, current_date + 3, ((current_date + 3)::timestamp + time '20:30') at time zone 'Europe/Madrid', ((current_date + 4)::timestamp + time '00:30') at time zone 'Europe/Madrid', 'draft', null, null, 'QA borrador'),
    (shift_published, org_id, loc_kiosko, template_close, current_date + 1, ((current_date + 1)::timestamp + time '21:00') at time zone 'Europe/Madrid', ((current_date + 2)::timestamp + time '01:30') at time zone 'Europe/Madrid', 'published', now(), user_manager, 'QA publicado cruzando medianoche'),
    (shift_picateria, org_id, loc_picateria, template_picateria, current_date + 1, ((current_date + 1)::timestamp + time '19:00') at time zone 'Europe/Madrid', ((current_date + 1)::timestamp + time '23:00') at time zone 'Europe/Madrid', 'published', now(), user_manager, 'QA Picatería publicado'),
    (shift_open, org_id, loc_kiosko, template_night, current_date + 2, ((current_date + 2)::timestamp + time '20:30') at time zone 'Europe/Madrid', ((current_date + 3)::timestamp + time '00:30') at time zone 'Europe/Madrid', 'published', now(), user_manager, 'QA turno abierto')
  on conflict (id) do update
  set status = excluded.status,
      published_at = excluded.published_at,
      published_by = excluded.published_by,
      notes = excluded.notes;

  insert into public.admin_kiosko_staff_shift_assignments (id, shift_id, employee_id, role_name, assignment_status)
  values
    (assign_published, shift_published, emp_kiosko, 'Servicio', 'assigned'),
    (assign_picateria, shift_picateria, emp_picateria, 'Cocina', 'assigned')
  on conflict (shift_id, employee_id) do update
  set role_name = excluded.role_name, assignment_status = excluded.assignment_status;

  insert into public.admin_kiosko_staff_schedule_publications (id, organization_id, location_id, period_starts_on, period_ends_on, version, published_at, published_by, shift_ids, affected_employee_ids, change_summary, status, effective_at, notifications_generated)
  values (publication_id, org_id, loc_kiosko, current_date, current_date + 7, 1, now(), user_manager, array[shift_published, shift_open], array[emp_kiosko], '{"qa":true,"summary":"Publicación QA inicial"}'::jsonb, 'published', now(), 1)
  on conflict (organization_id, location_id, period_starts_on, period_ends_on, version) do update
  set shift_ids = excluded.shift_ids,
      affected_employee_ids = excluded.affected_employee_ids,
      change_summary = excluded.change_summary,
      status = excluded.status,
      notifications_generated = excluded.notifications_generated;

  insert into public.admin_kiosko_staff_work_entries (id, organization_id, employee_id, shift_id, location_id, clock_in_at, clock_out_at, clock_in_source, clock_out_source, worked_seconds, status)
  values ('10000000-0000-4000-8000-000000000610', org_id, emp_kiosko, shift_published, loc_kiosko, now() - interval '2 days 5 hours', now() - interval '2 days 1 hour', 'employee_web', 'employee_web', 13500, 'completed')
  on conflict (id) do update
  set clock_in_at = excluded.clock_in_at,
      clock_out_at = excluded.clock_out_at,
      worked_seconds = excluded.worked_seconds,
      status = excluded.status;

  insert into public.admin_kiosko_staff_break_entries (id, work_entry_id, started_at, ended_at, break_type, paid, duration_seconds)
  values ('10000000-0000-4000-8000-000000000611', '10000000-0000-4000-8000-000000000610', now() - interval '2 days 3 hours', now() - interval '2 days 2 hours 45 minutes', 'rest', false, 900)
  on conflict (id) do update
  set started_at = excluded.started_at, ended_at = excluded.ended_at, duration_seconds = excluded.duration_seconds;

  insert into public.admin_kiosko_staff_leave_policies (id, organization_id, location_id, name, absence_type, unit, accrual_method, annual_amount, cycle_starts_on, prorate_enabled, carryover_enabled, requires_approval, visible_to_employee, active, created_by)
  values (policy_vacation, org_id, null, 'QA Vacaciones', 'vacation', 'natural_days', 'annual', 22, make_date(extract(year from current_date)::int, 1, 1), true, true, true, true, true, user_owner)
  on conflict (id) do update
  set name = excluded.name, annual_amount = excluded.annual_amount, active = excluded.active;

  insert into public.admin_kiosko_staff_leave_balance_periods (id, organization_id, employee_id, policy_id, period_label, starts_on, ends_on, opening_balance, accrued_amount, consumed_amount, reserved_amount, adjusted_amount, carried_over_amount, expired_amount, status, notes)
  values (balance_kiosko, org_id, emp_kiosko, policy_vacation, extract(year from current_date)::text || ' · QA Vacaciones', make_date(extract(year from current_date)::int, 1, 1), make_date(extract(year from current_date)::int, 12, 31), 0, 22, 1, 1, 0, 0, 0, 'open', 'Periodo QA')
  on conflict (employee_id, policy_id, starts_on, ends_on) do update
  set accrued_amount = excluded.accrued_amount,
      consumed_amount = excluded.consumed_amount,
      reserved_amount = excluded.reserved_amount,
      status = excluded.status;

  insert into public.admin_kiosko_staff_leave_balance_ledger (id, organization_id, employee_id, policy_id, period_id, movement_type, amount, unit, effective_on, source, reference_type, reference_id, actor_user_id, reason, metadata, idempotency_key)
  values
    ('10000000-0000-4000-8000-000000000711', org_id, emp_kiosko, policy_vacation, balance_kiosko, 'accrual', 22, 'natural_days', current_date, 'qa_seed', 'leave_balance_period', balance_kiosko, user_owner, 'Devengo QA inicial', '{"qa":true}'::jsonb, 'qa:leave-ledger:accrual:kiosko'),
    ('10000000-0000-4000-8000-000000000712', org_id, emp_kiosko, policy_vacation, balance_kiosko, 'reservation', 1, 'natural_days', current_date + 10, 'qa_seed', 'leave_request', leave_submitted, user_owner, 'Reserva QA', '{"qa":true}'::jsonb, 'qa:leave-ledger:reservation:kiosko'),
    ('10000000-0000-4000-8000-000000000713', org_id, emp_kiosko, policy_vacation, balance_kiosko, 'consumption', 1, 'natural_days', current_date - 5, 'qa_seed', 'leave_request', leave_approved, user_owner, 'Consumo QA aprobado', '{"qa":true}'::jsonb, 'qa:leave-ledger:consumption:kiosko')
  on conflict (idempotency_key) do nothing;

  insert into public.admin_kiosko_staff_leave_requests (id, organization_id, employee_id, location_id, policy_id, absence_type, starts_at, ends_at, partial_mode, requested_amount, requested_unit, reason, employee_notes, status, submitted_at, resolved_at, resolved_by, resolution_reason, reserved_amount, consumed_amount, approved_starts_at, approved_ends_at, approved_amount, conflict_summary, shift_impact_summary, visible_to_employee, created_by)
  values
    (leave_submitted, org_id, emp_kiosko, loc_kiosko, policy_vacation, 'vacation', ((current_date + 10)::timestamp + time '00:00') at time zone 'Europe/Madrid', ((current_date + 11)::timestamp + time '00:00') at time zone 'Europe/Madrid', 'full_day', 1, 'natural_days', 'QA solicitud pendiente', null, 'submitted', now(), null, null, null, 1, 0, null, null, null, '[]'::jsonb, '[]'::jsonb, true, user_emp_kiosko),
    (leave_approved, org_id, emp_kiosko, loc_kiosko, policy_vacation, 'vacation', ((current_date - 5)::timestamp + time '00:00') at time zone 'Europe/Madrid', ((current_date - 4)::timestamp + time '00:00') at time zone 'Europe/Madrid', 'full_day', 1, 'natural_days', 'QA ausencia aprobada', null, 'approved', now() - interval '10 days', now() - interval '9 days', user_manager, 'Aprobación QA', 0, 1, ((current_date - 5)::timestamp + time '00:00') at time zone 'Europe/Madrid', ((current_date - 4)::timestamp + time '00:00') at time zone 'Europe/Madrid', 1, '[]'::jsonb, '[]'::jsonb, true, user_emp_kiosko)
  on conflict (id) do update
  set status = excluded.status,
      reserved_amount = excluded.reserved_amount,
      consumed_amount = excluded.consumed_amount,
      resolved_by = excluded.resolved_by,
      resolution_reason = excluded.resolution_reason;

  insert into public.admin_kiosko_staff_recurring_availability (id, organization_id, employee_id, location_id, weekday, availability_type, starts_at, ends_at, full_day, notes, valid_from, priority, origin, status, created_by)
  values (availability_recurring, org_id, emp_kiosko, loc_kiosko, 5, 'available', '18:00', '23:59', false, 'QA disponible viernes tarde', current_date, 10, 'employee', 'active', user_emp_kiosko)
  on conflict (id) do update
  set availability_type = excluded.availability_type,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      status = excluded.status;

  insert into public.admin_kiosko_staff_availability_exceptions (id, organization_id, employee_id, location_id, starts_at, ends_at, availability_type, reason, notes, status, requested_by, resolved_by, resolved_at, resolution_reason)
  values (availability_exception, org_id, emp_kiosko, loc_kiosko, ((current_date + 4)::timestamp + time '18:00') at time zone 'Europe/Madrid', ((current_date + 4)::timestamp + time '23:00') at time zone 'Europe/Madrid', 'unavailable', 'QA indisponibilidad puntual', null, 'approved', user_emp_kiosko, user_manager, now(), 'Aprobación QA')
  on conflict (id) do update
  set status = excluded.status,
      resolved_by = excluded.resolved_by,
      resolved_at = excluded.resolved_at;

  insert into public.admin_kiosko_staff_work_preferences (employee_id, organization_id, preferred_shift_parts, preferred_free_weekdays, preferred_location_id, preferred_roles, avoid_split_shifts, accepts_additional_hours, accepts_urgent_coverage, notes, updated_by)
  values (emp_kiosko, org_id, array['evening'], array[1], loc_kiosko, array['Servicio'], true, true, true, 'QA preferencias no vinculantes', user_emp_kiosko)
  on conflict (employee_id) do update
  set preferred_shift_parts = excluded.preferred_shift_parts,
      preferred_free_weekdays = excluded.preferred_free_weekdays,
      accepts_urgent_coverage = excluded.accepts_urgent_coverage;

  insert into public.admin_kiosko_staff_shift_change_requests (id, organization_id, location_id, requester_employee_id, original_shift_id, request_type, reason, proposed_employee_id, status, deadline_at, requires_manager_approval, created_by)
  values (shift_change, org_id, loc_kiosko, emp_kiosko, shift_published, 'release', 'QA solicitud de liberación de turno', emp_multi, 'pending_manager', now() + interval '2 days', true, user_emp_kiosko)
  on conflict (id) do update set status = excluded.status, proposed_employee_id = excluded.proposed_employee_id;

  insert into public.admin_kiosko_staff_shift_vacancies (id, organization_id, shift_id, location_id, role_name, vacancy_status, previous_assignment_id, reason, deadline_at, created_by)
  values (vacancy_id, org_id, shift_open, loc_kiosko, 'Servicio', 'open', null, 'QA turno abierto', now() + interval '2 days', user_manager)
  on conflict (shift_id, role_name) do update
  set vacancy_status = excluded.vacancy_status, deadline_at = excluded.deadline_at;

  insert into public.admin_kiosko_staff_coverage_requests (id, organization_id, shift_id, vacancy_id, location_id, reason, urgency, deadline_at, status, manager_user_id, created_by)
  values (coverage_id, org_id, shift_open, vacancy_id, loc_kiosko, 'QA cobertura urgente', 'high', now() + interval '1 day', 'open', user_manager, user_manager)
  on conflict (id) do update set status = excluded.status, urgency = excluded.urgency;

  insert into public.admin_kiosko_staff_shift_offers (id, organization_id, shift_id, coverage_request_id, location_id, title, role_name, starts_at, ends_at, notes, deadline_at, status, priority, created_by, offer_version, idempotency_key)
  values (v_offer_id, org_id, shift_open, coverage_id, loc_kiosko, 'QA oferta de turno', 'Servicio', ((current_date + 2)::timestamp + time '20:30') at time zone 'Europe/Madrid', ((current_date + 3)::timestamp + time '00:30') at time zone 'Europe/Madrid', 'Oferta interna QA', now() + interval '1 day', 'published', 'high', user_manager, 1, 'qa:shift-offer:open')
  on conflict (idempotency_key) do update
  set status = excluded.status, deadline_at = excluded.deadline_at;

  insert into public.admin_kiosko_staff_shift_offer_recipients (id, offer_id, organization_id, employee_id, response, offer_version, shift_snapshot)
  values ('10000000-0000-4000-8000-000000000906', v_offer_id, org_id, emp_multi, 'pending', 1, '{"qa":true}'::jsonb)
  on conflict (offer_id, employee_id) do update set response = excluded.response;

  insert into public.admin_kiosko_staff_notifications (id, organization_id, recipient_employee_id, notification_type, title, message, entity_type, entity_id, priority, read, archived, metadata, created_by, idempotency_key)
  values ('10000000-0000-4000-8000-000000000907', org_id, emp_kiosko, 'shift_published', 'QA cuadrante publicado', 'Tienes un turno QA publicado para validar el flujo.', 'schedule_publication', publication_id, 'normal', false, false, '{"qa":true}'::jsonb, user_manager, 'qa:notification:shift-published:kiosko')
  on conflict (idempotency_key) do update
  set title = excluded.title, message = excluded.message, read = false, archived = false;

  insert into public.admin_kiosko_staff_process_templates (id, organization_id, location_id, process_type, name, position, role_name, version, active, status, created_by)
  values
    (onboarding_template, org_id, loc_kiosko, 'onboarding', 'QA onboarding básico', 'Servicio', 'staff_employee', 1, true, 'active', user_owner),
    (offboarding_template, org_id, loc_kiosko, 'offboarding', 'QA offboarding básico', 'Servicio', 'staff_employee', 1, true, 'active', user_owner)
  on conflict (organization_id, location_id, process_type, name, version) do update set active = excluded.active, status = excluded.status;

  insert into public.admin_kiosko_staff_processes (id, organization_id, location_id, employee_id, process_type, position, role_name, manager_user_id, planned_date, effective_date, template_id, template_version, status, completion_percent, blockers, notes, exit_reason, created_by)
  values
    (onboarding_process, org_id, loc_kiosko, emp_kiosko, 'onboarding', 'Servicio', 'staff_employee', user_manager, current_date + 1, null, onboarding_template, 1, 'in_progress', 40, '[]'::jsonb, 'QA onboarding en curso', null, user_owner),
    (offboarding_process, org_id, loc_kiosko, emp_multi, 'offboarding', 'Servicio', 'staff_employee', user_manager, current_date + 30, null, offboarding_template, 1, 'draft', 0, '[]'::jsonb, 'QA offboarding borrador', 'other', user_owner)
  on conflict (id) do update
  set status = excluded.status, completion_percent = excluded.completion_percent, notes = excluded.notes;

  insert into public.admin_kiosko_staff_process_tasks (id, process_id, organization_id, employee_id, template_version, title, description, task_type, responsible_user_id, due_at, status, mandatory, blocking, requires_evidence, visible_to_employee)
  values
    ('10000000-0000-4000-8000-000000001111', onboarding_process, org_id, emp_kiosko, 1, 'QA revisar documento inicial', 'Tarea QA visible para empleado', 'document', user_manager, now() + interval '2 days', 'waiting_employee', true, true, true, true),
    ('10000000-0000-4000-8000-000000001112', onboarding_process, org_id, emp_kiosko, 1, 'QA validar alta interna', 'Tarea QA administrativa', 'administrative', user_manager, now() + interval '3 days', 'pending', true, false, false, false),
    ('10000000-0000-4000-8000-000000001113', offboarding_process, org_id, emp_multi, 1, 'QA devolver material', 'Tarea QA de salida', 'equipment', user_manager, now() + interval '30 days', 'pending', true, true, false, true)
  on conflict (id) do update
  set status = excluded.status, due_at = excluded.due_at;

  insert into public.admin_kiosko_staff_internal_policies (id, organization_id, location_id, title, code, category, content, version, effective_on, status, requires_read, requires_confirmation, requires_signature, applicable_positions, created_by, published_by, published_at)
  values (policy_internal, org_id, loc_kiosko, 'QA Normas internas', 'QA-NORMAS', 'normas_internas', 'Contenido QA ficticio para validar lectura y aceptación.', 1, current_date, 'published', true, true, false, array['Servicio'], user_owner, user_owner, now())
  on conflict (organization_id, code, version) do update
  set title = excluded.title, content = excluded.content, status = excluded.status;

  insert into public.admin_kiosko_staff_policy_assignments (id, organization_id, policy_id, employee_id, policy_version, status)
  values ('10000000-0000-4000-8000-000000001202', org_id, policy_internal, emp_kiosko, 1, 'delivered')
  on conflict (policy_id, employee_id, policy_version) do update set status = excluded.status;

  insert into public.admin_kiosko_staff_training_catalog (id, organization_id, category, name, provider, default_duration_minutes, validity_months, mandatory, active, created_by)
  values (training_catalog, org_id, 'appcc', 'QA APPCC básico', 'QA interno', 45, 12, true, true, user_owner)
  on conflict (id) do update set name = excluded.name, active = excluded.active;

  insert into public.admin_kiosko_staff_training_assignments (id, organization_id, employee_id, training_id, status, assigned_at, expires_at, provider, duration_minutes, notes, created_by)
  values (training_assignment, org_id, emp_kiosko, training_catalog, 'pending', current_date, current_date + 60, 'QA interno', 45, 'Asignación QA', user_owner)
  on conflict (id) do update set status = excluded.status, expires_at = excluded.expires_at;

  insert into public.admin_kiosko_staff_training_modules (id, organization_id, title, description, content, estimated_minutes, questions, min_score, attempts_allowed, version, status, applicable_positions, created_by, published_by, published_at)
  values (training_module, org_id, 'QA módulo APPCC', 'Módulo interno QA', 'Contenido formativo QA no legal.', 15, '[{"id":"q1","text":"Pregunta QA","options":["A","B"],"correct":"A"}]'::jsonb, 80, 3, 1, 'published', array['Servicio'], user_owner, user_owner, now())
  on conflict (id) do update set status = excluded.status, content = excluded.content;

  insert into public.admin_kiosko_staff_equipment_catalog (id, organization_id, item_type, name, active, created_by)
  values (equipment_item, org_id, 'apron', 'QA delantal', true, user_owner)
  on conflict (id) do update set name = excluded.name, active = excluded.active;

  insert into public.admin_kiosko_staff_equipment_assignments (id, organization_id, employee_id, location_id, item_id, item_name, quantity, size, status, delivered_at, delivered_by, notes)
  values (equipment_assignment, org_id, emp_kiosko, loc_kiosko, equipment_item, 'QA delantal', 1, 'M', 'delivered', now() - interval '1 day', user_manager, 'Entrega QA')
  on conflict (id) do update set status = excluded.status, delivered_at = excluded.delivered_at;

  insert into public.admin_kiosko_staff_access_assignments (id, organization_id, employee_id, location_id, access_type, required, status, requested_at, granted_at, responsible_user_id, external_identifier, notes, created_by)
  values ('10000000-0000-4000-8000-000000001403', org_id, emp_kiosko, loc_kiosko, 'staff_portal', true, 'active', now() - interval '2 days', now() - interval '1 day', user_manager, 'qa_employee_kiosko', 'Acceso QA sin contraseña', user_owner)
  on conflict (id) do update set status = excluded.status, external_identifier = excluded.external_identifier;

  insert into public.admin_kiosko_staff_checklist_templates (id, organization_id, location_id, name, checklist_type, position, role_name, shift_kind, version, status, created_by, published_by, published_at)
  values (checklist_template, org_id, loc_kiosko, 'QA checklist cierre APPCC', 'appcc', 'Servicio', 'staff_employee', 'closing', 1, 'published', user_owner, user_owner, now())
  on conflict (organization_id, location_id, name, version) do update set status = excluded.status;

  insert into public.admin_kiosko_staff_checklist_template_items (id, template_id, organization_id, text, instructions, response_type, mandatory, critical, min_value, max_value, unit, requires_evidence, generates_incident, sort_order, category)
  values (checklist_item, checklist_template, org_id, 'QA temperatura cámara', 'Registrar temperatura QA', 'temperature', true, true, -2, 6, 'ºC', false, true, 1, 'appcc')
  on conflict (id) do update set text = excluded.text, min_value = excluded.min_value, max_value = excluded.max_value;

  insert into public.admin_kiosko_staff_checklist_runs (id, organization_id, location_id, shift_id, employee_id, template_id, template_version, tasks_snapshot, status, due_at, created_by)
  values (checklist_run, org_id, loc_kiosko, shift_published, emp_kiosko, checklist_template, 1, '[{"text":"QA temperatura cámara","critical":true}]'::jsonb, 'pending', now() + interval '1 day', user_manager)
  on conflict (id) do update set status = excluded.status, due_at = excluded.due_at;

  insert into public.admin_kiosko_staff_compliance_alerts (id, organization_id, location_id, employee_id, category, severity, title, description, entity_type, entity_id, responsible_user_id, due_at, status, metadata)
  values ('10000000-0000-4000-8000-000000001601', org_id, loc_kiosko, emp_kiosko, 'qa', 'warning', 'QA tarea pendiente', 'Alerta QA de cumplimiento para validar panel.', 'process_task', '10000000-0000-4000-8000-000000001111', user_manager, now() + interval '2 days', 'open', '{"qa":true}'::jsonb)
  on conflict (id) do update set status = excluded.status, due_at = excluded.due_at;

  insert into public.admin_kiosko_staff_timeline_events (id, organization_id, employee_id, location_id, event_type, title, description, effective_at, actor_user_id, source, entity_type, entity_id, metadata, visible_to_employee, severity)
  values ('10000000-0000-4000-8000-000000001701', org_id, emp_kiosko, loc_kiosko, 'qa_seed', 'QA dataset creado', 'Evento ficticio de validación RRHH.', now(), user_owner, 'qa_seed', 'staff_process', onboarding_process::text, '{"qa":true}'::jsonb, true, 'info')
  on conflict (id) do nothing;

  insert into public.admin_kiosko_staff_audit_log (id, actor_user_id, actor_employee_id, entity_type, entity_id, action, before_data, after_data, metadata)
  values ('10000000-0000-4000-8000-000000001702', user_owner, emp_owner, 'qa_seed', org_id::text, 'qa_seed_prepared', null, '{"dataset":"staff_hr_qa"}'::jsonb, '{"qa":true,"sensitive":false}'::jsonb)
  on conflict (id) do nothing;
end $$;
