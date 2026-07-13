-- Seed demo opcional para RRHH fase 1.
-- No ejecutar automáticamente en producción. No contiene PINs ni contraseñas en claro.

with locations as (
  insert into public.admin_kiosko_staff_locations (name, slug, timezone, address, active, allows_kiosk_clock)
  values
    ('Kiosko Alfresko', 'kiosko-alfresko', 'Europe/Madrid', 'Parque San Sebastián, Ogíjares, Granada', true, true),
    ('La Picatería', 'la-picateria', 'Europe/Madrid', null, true, true)
  on conflict (slug) do update
  set name = excluded.name,
      timezone = excluded.timezone,
      address = excluded.address,
      active = excluded.active,
      allows_kiosk_clock = excluded.allows_kiosk_clock
  returning id, slug
),
employees as (
  insert into public.admin_kiosko_staff_employees (
    employee_code,
    first_name,
    last_name,
    display_name,
    email,
    phone,
    status,
    hire_date,
    primary_location_id
  )
  values
    (
      'DEMO-ALF-001',
      'Demo',
      'Alfresko',
      'Demo Alfresko',
      'demo.alfresko@example.invalid',
      null,
      'active',
      current_date - 30,
      (select id from locations where slug = 'kiosko-alfresko')
    ),
    (
      'DEMO-PIC-001',
      'Demo',
      'Picatería',
      'Demo Picatería',
      'demo.picateria@example.invalid',
      null,
      'active',
      current_date - 30,
      (select id from locations where slug = 'la-picateria')
    )
  on conflict (employee_code) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      display_name = excluded.display_name,
      email = excluded.email,
      status = excluded.status,
      hire_date = excluded.hire_date,
      primary_location_id = excluded.primary_location_id
  returning id, employee_code, primary_location_id
),
roles as (
  insert into public.admin_kiosko_staff_employee_roles (employee_id, location_id, role, active)
  select id, primary_location_id, 'staff_employee', true
  from employees
  on conflict (employee_id, location_id, role) do update
  set active = excluded.active
  returning id
),
contracts as (
  insert into public.admin_kiosko_staff_contracts (
    employee_id,
    contract_type,
    start_date,
    weekly_minutes,
    annual_minutes,
    workday_distribution,
    job_title,
    collective_agreement,
    salary_reference,
    active
  )
  select
    id,
    'demo',
    current_date - 30,
    1800,
    null,
    '{"days":["martes","miercoles","jueves","viernes","sabado"],"notes":"Demo no contractual"}'::jsonb,
    'Personal demo',
    null,
    null,
    true
  from employees
  on conflict do nothing
  returning id
),
templates as (
  insert into public.admin_kiosko_staff_shift_templates (
    location_id,
    name,
    start_time,
    end_time,
    default_break_minutes,
    color_key,
    active
  )
  values
    ((select id from locations where slug = 'kiosko-alfresko'), 'Servicio noche', '20:30', '00:30', 20, 'red', true),
    ((select id from locations where slug = 'kiosko-alfresko'), 'Cierre fin de semana', '20:30', '02:00', 30, 'amber', true),
    ((select id from locations where slug = 'la-picateria'), 'Servicio tarde', '19:30', '23:30', 20, 'stone', true)
  returning id, location_id, name
),
shifts as (
  insert into public.admin_kiosko_staff_shifts (
    location_id,
    template_id,
    shift_date,
    starts_at,
    ends_at,
    status,
    published_at,
    notes
  )
  select
    t.location_id,
    t.id,
    current_date + 1,
    ((current_date + 1)::timestamp + t.start_time) at time zone 'Europe/Madrid',
    case
      when t.end_time <= t.start_time
        then ((current_date + 2)::timestamp + t.end_time) at time zone 'Europe/Madrid'
      else ((current_date + 1)::timestamp + t.end_time) at time zone 'Europe/Madrid'
    end,
    'published',
    now(),
    'Turno demo publicado'
  from templates t
  where t.name in ('Servicio noche', 'Servicio tarde')
  returning id, location_id
)
insert into public.admin_kiosko_staff_shift_assignments (shift_id, employee_id, role_name, assignment_status)
select s.id, e.id, 'Servicio', 'assigned'
from shifts s
join employees e on e.primary_location_id = s.location_id
on conflict (shift_id, employee_id) do update
set role_name = excluded.role_name,
    assignment_status = excluded.assignment_status;
