# RRHH fase 1 - Kiosko Admin

## Alcance

Esta fase incorpora un módulo funcional de personal dentro de `admin-kiosko` y un portal operativo `/staff`. Cubre empleados, contratos, centros, turnos, publicación de cuadrantes, fichajes, pausas, incidencias, rectificaciones, auditoría y exportes CSV.

No implementa nómina legal, Seguridad Social, SILTRA, modelos tributarios, firma avanzada, biometría, geolocalización obligatoria ni app móvil nativa.

## Arquitectura

- Datos en Supabase con tablas específicas `admin_kiosko_staff_*`.
- Repositorio server-side en `lib/admin-kiosko/repositories/staff.repository.ts`.
- Reglas de dominio en `lib/admin-kiosko/staff/time.ts` y `lib/admin-kiosko/staff/service.ts`.
- Server actions en `app/staff/actions.ts` y `app/admin-kiosko/personal/actions.ts`.
- Componentes reutilizables en `components/staff`.
- Portal empleado en `/staff`.
- Administración en `/admin-kiosko/personal`.

## Modelo de datos

Entidades principales:

- `admin_kiosko_staff_employees`
- `admin_kiosko_staff_contracts`
- `admin_kiosko_staff_locations`
- `admin_kiosko_staff_employee_roles`
- `admin_kiosko_staff_shift_templates`
- `admin_kiosko_staff_shifts`
- `admin_kiosko_staff_shift_assignments`
- `admin_kiosko_staff_work_entries`
- `admin_kiosko_staff_break_entries`
- `admin_kiosko_staff_time_incidents`
- `admin_kiosko_staff_audit_log`

`salary_reference` queda como dato administrativo restringido, no como base de cálculo de nómina.

## Flujos

Empleado:

1. Entra en `/staff` con usuario interno nominal.
2. Ve turno de hoy, próximos turnos y resumen semanal.
3. Ficha entrada, inicia/finaliza pausa y ficha salida.
4. Comunica incidencias desde `/staff/incidencias`.

Kiosko compartido:

1. Entra en `/staff/kiosk`.
2. Selecciona empleado y valida PIN.
3. Realiza una operación.
4. La sesión temporal se cierra tras redirección.

Administración:

1. Crea empleados y contratos.
2. Crea turnos en borrador.
3. Publica turnos.
4. Duplica semanas.
5. Revisa fichajes e incidencias.
6. Exporta CSV.

## Permisos

Roles preparados en datos:

- `staff_employee`
- `staff_shift_lead`
- `staff_location_manager`
- `staff_hr`
- `admin`

Permisos de aplicación añadidos:

- `staff:admin`
- `staff:hr`
- `staff:shifts:manage`
- `staff:shifts:publish`
- `staff:time:review`
- `staff:reports:export`
- `staff:contracts:manage`

El owner interno hereda acceso completo. El empleado interno no obtiene permisos RRHH administrativos.

## Rutas

Administración:

- `/admin-kiosko/personal`
- `/admin-kiosko/personal/empleados`
- `/admin-kiosko/personal/empleados/[employeeId]`
- `/admin-kiosko/personal/turnos`
- `/admin-kiosko/personal/fichajes`
- `/admin-kiosko/personal/incidencias`
- `/admin-kiosko/personal/informes`

Empleado:

- `/staff`
- `/staff/turnos`
- `/staff/fichajes`
- `/staff/incidencias`
- `/staff/kiosk`

Exportes:

- `/admin-kiosko/personal/informes/registro-horario.csv`
- `/admin-kiosko/personal/informes/turnos.csv`

## Reglas de negocio

- Un empleado no puede tener dos fichajes abiertos.
- No se puede iniciar pausa sin fichaje abierto.
- No se puede abrir una segunda pausa.
- No se puede fichar salida con pausa abierta.
- Las pausas no pagadas se descuentan del tiempo trabajado.
- Los turnos publicados son los únicos visibles para el empleado.
- Los turnos que cruzan medianoche se guardan con `starts_at` y `ends_at` UTC.
- Las rectificaciones no borran datos originales: quedan en incidencia y auditoría.
- La auditoría de RRHH es inmutable mediante trigger SQL.

## Migraciones

Ejecutar en Supabase SQL Editor:

```sql
-- supabase/admin_kiosko_staff_hr_phase_1.sql
```

Seed demo opcional, solo en entornos de prueba:

```sql
-- supabase/seeds/admin_kiosko_staff_hr_demo.sql
```

## RLS

La migración activa RLS en todas las tablas. Existen políticas para:

- `service_role`, usado por los repositorios server-side.
- empleados autenticados por `auth.uid()` cuando el proyecto migre a Supabase Auth o sincronice `auth_user_id`.
- managers/HR por roles en `admin_kiosko_staff_employee_roles`.

## Instrucciones de despliegue

1. Aplicar `supabase/admin_kiosko_staff_hr_phase_1.sql`.
2. Opcionalmente aplicar `supabase/seeds/admin_kiosko_staff_hr_demo.sql` en staging.
3. Crear empleados reales desde `/admin-kiosko/personal/empleados`.
4. Vincular `auth_user_id` al `id` de `admin_users` para que `/staff` funcione con usuario nominal.
5. Si se usa `/staff/kiosk`, generar `pin_hash` fuera del repo con `hashStaffPin` y actualizar la ficha.

## Limitaciones

- No hay cálculo legal de nómina.
- No hay bloqueo de periodos.
- No hay geolocalización obligatoria.
- El kiosko requiere `pin_hash`; el seed demo no incluye PINs.
- Los exportes son CSV básicos; PDF y Excel quedan preparados como fase posterior.

## Siguientes fases

- Vacaciones y ausencias.
- Saldos de vacaciones.
- Documentos y firma.
- Onboarding/offboarding.
- Formación.
- Variables de nómina.
- Bloqueo de periodos.
- Webhooks y notificaciones.
- Cambios de turno y disponibilidad.
- Forecast de demanda e integración TPV.
- Tareas APPCC asociadas al turno.
