# RRHH fase 3: disponibilidad, cambios, cobertura y notificaciones

## Alcance

La fase 3 añade operativa diaria de personal sobre las fases 1, 1.5 y 2: disponibilidad recurrente, indisponibilidades puntuales, preferencias, cambios de turno, cesiones, intercambios, vacantes, cobertura urgente, ofertas internas, notificaciones, lectura y publicación versionada de cuadrantes.

No implementa optimización automática, IA, mensajería externa, SMS, WhatsApp, email, push ni decisiones legales automáticas.

## Arquitectura

- Migración: `supabase/admin_kiosko_staff_hr_phase_3.sql`.
- Repositorios: `lib/admin-kiosko/repositories/staff-availability.repository.ts`, `staff-shift-change.repository.ts`, `staff-coverage.repository.ts`, `staff-notifications.repository.ts`, `staff-schedule.repository.ts`.
- Dominio: `lib/admin-kiosko/staff/*rules.ts`.
- Servicios: `availability.service.ts`, `shift-change.service.ts`, `coverage.service.ts`, `candidate-ranking.service.ts`, `notification.service.ts`, `schedule-publication.service.ts`.
- Portal: `/staff/disponibilidad`, `/staff/cambios`, `/staff/ofertas`, `/staff/notificaciones`.
- Administración: `/admin-kiosko/personal/disponibilidad`, `/cambios`, `/cambios/[requestId]`, `/cobertura`, `/ofertas`, `/notificaciones`.

## Disponibilidad

`admin_kiosko_staff_recurring_availability` guarda disponibilidad recurrente por empleado, día de semana, tramo horario, centro opcional, vigencia, prioridad y origen. `admin_kiosko_staff_availability_exceptions` guarda excepciones puntuales. Las excepciones prevalecen sobre la disponibilidad recurrente.

No se deben guardar diagnósticos ni información médica en motivos u observaciones.

## Preferencias

`admin_kiosko_staff_work_preferences` guarda preferencias no vinculantes: turno preferido, días libres preferidos, puestos, evitar partidos, horas adicionales y cobertura urgente. El motor de candidatos las usa para puntuar, no para bloquear.

## Restricciones

Las reglas duras se centralizan en `availability-rules.ts`: contrato/empleado inactivo, centro no autorizado, ausencia aprobada, indisponibilidad aprobada, solape, fichaje abierto, descanso mínimo, límites configurados y puesto incompatible. Cada resultado devuelve código, severidad, fuente y si bloquea.

## Cambios, intercambios y cesiones

`admin_kiosko_staff_shift_change_requests` gestiona `give_away`, `swap`, `release`, `change_time`, `change_location` y `request_cover`. Los participantes se guardan en `admin_kiosko_staff_shift_change_participants`. La ejecución real debe ser atómica y requiere aceptación y aprobación administrativa.

## Cobertura, vacantes y ofertas

`admin_kiosko_staff_shift_vacancies` representa vacantes sin modificar destructivamente el estado del turno. `admin_kiosko_staff_coverage_requests` gestiona cobertura urgente. `admin_kiosko_staff_shift_offers` y `admin_kiosko_staff_shift_offer_recipients` gestionan ofertas internas y respuestas.

La primera aceptación no adjudica automáticamente salvo que una fase posterior lo configure explícitamente.

## Motor de candidatos

`candidate-ranking.service.ts` usa funciones deterministas para filtrar restricciones duras y puntuar con factores explicables: disponibilidad, preferencias, centro, rol, horas planificadas, contrato, urgencia y avisos. No usa IA ni proveedores externos.

## Notificaciones

`admin_kiosko_staff_notifications` almacena notificaciones internas idempotentes. Permite marcar una o todas como leídas. No envía mensajes externos. Los metadatos se sanean para evitar DNI, NSS, IBAN, salario, diagnósticos o contenido documental.

## Publicación y versionado de cuadrantes

`admin_kiosko_staff_schedule_publications` guarda versiones formales. `admin_kiosko_staff_schedule_publication_changes` conserva diffs legibles: turno creado, eliminado, horario, centro, empleado, puesto o estado. Las publicaciones generan notificaciones internas.

## Confirmación de lectura

`admin_kiosko_staff_read_confirmations` registra entrega, lectura y confirmación explícita de comunicaciones internas. No se presenta como firma electrónica cualificada.

## Permisos

Permisos añadidos:

- `staff:availability:read/write/approve`
- `staff:shift-change:read/write/approve/execute`
- `staff:coverage:read/write/assign`
- `staff:shift-offer:read/write/respond`
- `staff:notification:read/write`
- `staff:schedule-publication:read/write/publish`

Owner recibe todos los permisos. El portal de empleado valida empleado vinculado antes de escribir.

## RLS

Todas las tablas nuevas tienen RLS. `service_role` conserva acceso operativo. Las políticas permiten al empleado ver/modificar sus propios registros permitidos y a RRHH/manager ver ámbitos autorizados. La autorización server-side sigue siendo obligatoria.

## Despliegue

Aplicar manualmente en Supabase SQL Editor:

```bash
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_3.sql
```

Después validar:

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
git status --short
```

## Rollback

No hay migración destructiva. Para rollback operativo, retirar navegación/rutas phase 3 y dejar las tablas sin uso. Si se requiere rollback SQL, hacerlo en ventana controlada eliminando primero políticas y después tablas phase 3, preservando auditoría exportada.

## Limitaciones

- No ejecuta reasignaciones automáticas.
- No calcula legalmente descansos ni convenio.
- No envía notificaciones externas.
- No optimiza cuadrantes.
- No implementa proveedor de calendario externo.

## Trabajo futuro

- Ejecución transaccional completa de swaps/reasignaciones con RPC.
- Disponibilidad declarada por rangos más complejos.
- Confirmación obligatoria de cuadrante por empleado.
- Reglas por puesto.
- Notificaciones externas configurables.
- Forecast de demanda e integración TPV.
