# RRHH fase 4: onboarding, offboarding, formación, PRL y APPCC

## Alcance

La fase 4 añade procesos de incorporación y salida, plantillas, tareas, documentación obligatoria, políticas internas, confirmaciones, formación interna, seguimiento administrativo PRL, material, accesos, checklists por turno, incidencias y alertas de cumplimiento.

No implementa nómina legal, prevención externalizada real, integraciones de terceros ni mensajería externa.

## Arquitectura

- Migración: `supabase/admin_kiosko_staff_hr_phase_4.sql`.
- Repositorios: `staff-process`, `staff-compliance`, `staff-equipment`, `staff-checklist`.
- Servicios: `process`, `onboarding`, `offboarding`, `internal-policy`, `training-module`, `prl`, `equipment`, `access`, `checklist`, `compliance`.
- Reglas puras: `process-rules`, `training-module-rules`, `checklist-rules`.
- Componentes: progreso, tareas, alertas, políticas, formación, material, accesos y checklists.

## Procesos y plantillas

Se usa un motor genérico:

- `admin_kiosko_staff_process_templates`
- `admin_kiosko_staff_process_template_tasks`
- `admin_kiosko_staff_processes`
- `admin_kiosko_staff_process_tasks`

`process_type` diferencia `onboarding` y `offboarding`. Las tareas generadas guardan la versión de plantilla para preservar histórico.

## Onboarding

Rutas:

- `/admin-kiosko/personal/onboarding`
- `/admin-kiosko/personal/onboarding/plantillas`
- `/admin-kiosko/personal/onboarding/[processId]`
- `/staff/incorporacion`

El empleado solo ve tareas `visible_to_employee`.

## Offboarding

Rutas:

- `/admin-kiosko/personal/offboarding`
- `/admin-kiosko/personal/offboarding/plantillas`
- `/admin-kiosko/personal/offboarding/[processId]`
- `/staff/salida`

No borra empleado, fichajes, documentos, firmas ni historial.

## Documentos

`admin_kiosko_staff_document_requirements` define requisitos por organización, centro, puesto y rol. Reutiliza `admin_kiosko_staff_documents`; no crea otro sistema de archivos ni buckets.

## Políticas y firmas

`admin_kiosko_staff_internal_policies` guarda políticas versionadas. `admin_kiosko_staff_policy_assignments` registra entrega, lectura, aceptación o firma. Las firmas siguen usando `admin_kiosko_staff_signatures`.

## Formación

Se reutiliza el catálogo de formación existente y se añaden:

- `admin_kiosko_staff_training_requirements`
- `admin_kiosko_staff_training_modules`
- `admin_kiosko_staff_training_attempts`

Las respuestas correctas no deben exponerse antes de terminar el intento.

## PRL

`admin_kiosko_staff_prl_records` registra seguimiento administrativo. No guarda diagnósticos ni historia clínica. Aptitud médica solo usa estados administrativos.

## Material y accesos

`admin_kiosko_staff_equipment_assignments` registra entregas/devoluciones sin cobros automáticos. `admin_kiosko_staff_access_assignments` registra accesos sin contraseñas.

## APPCC y checklists

Los checklists por turno se modelan con plantillas versionadas, ejecuciones, resultados e incidencias. No duplican registros sanitarios existentes; sirven como capa de asignación, responsabilidad y evidencia.

## Permisos

Se añaden permisos de onboarding, offboarding, políticas, formación, PRL, material, accesos, checklists y cumplimiento. Las acciones sensibles deben validarse server-side.

## RLS

Todas las tablas nuevas tienen RLS y política `service_role`. El empleado solo ve su proceso/tareas visibles, políticas asignadas, material y checklists propios. RRHH/manager accede por permisos y centro.

## Despliegue

Aplicar manualmente:

```bash
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_4.sql
```

Validar:

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

No hay cambios destructivos. Para rollback, retirar navegación/rutas phase 4 y dejar las tablas sin uso. Si se elimina SQL, exportar antes auditoría/procesos y borrar tablas nuevas en orden inverso de dependencias.

## Limitaciones

- No sustituye formación legal externa.
- No bloquea fichajes por tareas pendientes.
- No envía notificaciones externas.
- No almacena datos clínicos.
- No automatiza nómina ni descuentos.

## Trabajo futuro

- Generador visual de plantillas.
- Asignación automática avanzada por puesto.
- Evaluaciones con UI completa.
- Integración documental más profunda.
- Notificaciones externas configurables.
- APPCC predictivo y tareas ligadas a forecast.
