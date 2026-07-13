# Runbook QA RRHH

## Objetivo

Validar de forma controlada que las fases RRHH 1-4 funcionan juntas sin mezclar datos reales. Este runbook no sustituye pruebas legales ni operación real: sirve para preparar un entorno QA y recorrer el flujo funcional.

Flujo objetivo:

```text
organización -> centro -> usuario administrador -> empleado -> contrato -> usuario vinculado -> PIN -> turno -> publicación -> notificación -> /staff -> fichaje -> pausa -> salida -> ausencia -> disponibilidad -> cambio de turno -> onboarding -> documento -> política -> formación -> material -> checklist -> offboarding -> auditoría
```

## Requisitos

- Migraciones RRHH 1, 1.5, 2, 3 y 4 aplicadas en el entorno objetivo.
- Variables server disponibles:
  - `SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_KIOSKO_SESSION_SECRET` recomendado para sesiones nominales
  - `STAFF_DOCUMENTS_BUCKET`, opcional; por defecto `staff-private-documents`
- Acceso owner nominal a `/admin-kiosko`.

No ejecutes el seed en producción salvo decisión explícita y documentada. No contiene datos reales, pero crea registros operativos.

## Estado de migraciones

El módulo espera estas migraciones aplicadas:

```bash
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_1.sql
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_1_5.sql
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_2.sql
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_3.sql
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_4.sql
```

Tablas mínimas que deben responder:

```sql
select to_regclass('public.admin_kiosko_staff_employees');
select to_regclass('public.admin_kiosko_staff_organizations');
select to_regclass('public.admin_kiosko_staff_leave_policies');
select to_regclass('public.admin_kiosko_staff_recurring_availability');
select to_regclass('public.admin_kiosko_staff_processes');
```

## Seed QA

Archivo:

```bash
/Users/xavibocanegra/kioskoalfresko/supabase/seeds/admin_kiosko_staff_hr_qa.sql
```

Crea datos ficticios identificables:

- Organización: `QA Alfresko Group`, slug `qa-alfresko-group`.
- Centros: `QA Kiosko Alfresko`, `QA La Picatería`.
- Empleados con `employee_code` prefijo `QA-`.
- Usuarios internos con `username` prefijo `qa_`.

El seed es idempotente y no hace `DROP`, `TRUNCATE` ni borrado.

## Creación de PIN

El PIN no se guarda en claro en el repositorio. Genera el hash localmente:

```bash
cd /Users/xavibocanegra/kioskoalfresko
QA_STAFF_PIN='<PIN_QA>' node scripts/staff-hr-qa-setup.mjs --pin-hash
```

En Supabase SQL Editor, antes del seed:

```sql
set app.qa_staff_pin_hash = '<HASH_GENERADO>';
```

Después pega y ejecuta:

```sql
-- contenido de /Users/xavibocanegra/kioskoalfresko/supabase/seeds/admin_kiosko_staff_hr_qa.sql
```

Si no defines `app.qa_staff_pin_hash`, el seed conservará el `pin_hash` existente y dejará `pin_hash` nulo en empleados nuevos.

## Vinculación de usuario

El portal `/staff` usa auth interno:

```text
admin_users.id -> admin_kiosko_staff_employees.auth_user_id
```

La sesión se guarda en la cookie `admin_kiosko_session`. Un empleado entra en `/staff` si su usuario interno está activo y existe un empleado activo vinculado a ese `admin_users.id`.

Arquitectura vigente tras el hardening:

- `/staff` depende de `admin_users.id`, no de `auth.uid()`.
- `auth_user_id` es un nombre legacy que referencia `admin_users.id`.
- RLS debe bloquear acceso directo `anon/authenticated`.
- La autorización real se hace server-side con `resolveCurrentStaffActor()`.
- El service role se usa únicamente en repositorios server-side después de resolver actor/permisos.

## Comprobaciones SQL

Organización y centros:

```sql
select id, name, slug, active
from public.admin_kiosko_staff_organizations
where slug = 'qa-alfresko-group';

select id, name, slug, organization_id, active, allows_kiosk_clock
from public.admin_kiosko_staff_locations
where slug in ('qa-kiosko-alfresko', 'qa-la-picateria');
```

Empleados, usuario y PIN sin mostrar hash:

```sql
select e.employee_code, e.display_name, e.status, e.auth_user_id is not null as has_user, e.pin_hash is not null as has_pin,
       u.username, u.role, u.status as user_status
from public.admin_kiosko_staff_employees e
left join public.admin_users u on u.id = e.auth_user_id
where e.employee_code like 'QA-%'
order by e.employee_code;
```

Contratos:

```sql
select e.employee_code, c.contract_type, c.weekly_minutes, c.start_date, c.end_date, c.active
from public.admin_kiosko_staff_contracts c
join public.admin_kiosko_staff_employees e on e.id = c.employee_id
where e.employee_code like 'QA-%'
order by e.employee_code, c.start_date;
```

Turnos y publicación:

```sql
select s.id, l.slug, s.shift_date, s.status, s.published_at, s.notes
from public.admin_kiosko_staff_shifts s
join public.admin_kiosko_staff_locations l on l.id = s.location_id
where l.slug like 'qa-%'
order by s.shift_date, s.starts_at;

select id, status, version, shift_ids, affected_employee_ids, notifications_generated
from public.admin_kiosko_staff_schedule_publications
where organization_id = (select id from public.admin_kiosko_staff_organizations where slug = 'qa-alfresko-group');
```

Auditoría:

```sql
select action, entity_type, entity_id, created_at
from public.admin_kiosko_staff_audit_log
where metadata ->> 'qa' = 'true'
order by created_at desc
limit 20;
```

## Script local de diagnóstico

Modo resumen:

```bash
cd /Users/xavibocanegra/kioskoalfresko
node scripts/staff-hr-qa-setup.mjs --check
```

Modo JSON:

```bash
cd /Users/xavibocanegra/kioskoalfresko
node scripts/staff-hr-qa-setup.mjs --report
```

El script solo lee datos. Detecta tablas ausentes, bucket privado, empleados QA sin contrato, organización, centro, usuario, PIN, roles, asignaciones huérfanas, publicaciones sin turnos, procesos sin tareas, rutas privadas inválidas y notificaciones sin destinatario.

## Health check administrativo

Ruta:

```text
/admin-kiosko/personal/qa
```

Requiere permiso `staff:admin` u owner. Muestra:

- conexión;
- tablas RRHH detectadas;
- bucket privado;
- organizaciones y centros;
- empleados activos;
- empleados sin contrato, usuario o PIN;
- turnos futuros y publicados;
- ausencias pendientes;
- procesos bloqueados;
- checklists vencidos;
- incidencias abiertas;
- últimas auditorías.

No muestra PIN, hashes, service role, DNI, NSS, IBAN, rutas privadas de documentos ni datos médicos.

## Flujo admin

1. Entrar como owner nominal en `/admin-kiosko`.
2. Abrir `/admin-kiosko/personal/qa`.
3. Confirmar que no hay alertas críticas.
4. Abrir `/admin-kiosko/personal/empleados` y localizar empleados `QA-*`.
5. Abrir `/admin-kiosko/personal/turnos` y revisar turnos QA.
6. Abrir `/admin-kiosko/personal/ausencias` y revisar solicitud pendiente/aprobada.
7. Abrir `/admin-kiosko/personal/cambios`, `/cobertura`, `/ofertas`, `/onboarding`, `/cumplimiento`, `/checklists` y verificar estados vacíos o QA.

## Flujo empleado

1. Asignar contraseña temporal a un usuario QA desde el panel de usuarios o SQL seguro usando `hashAdminPassword`.
2. Entrar con ese usuario interno.
3. Abrir `/staff`.
4. Confirmar que solo se ven datos del empleado vinculado.
5. Revisar:
   - `/staff/turnos`
   - `/staff/fichajes`
   - `/staff/ausencias`
   - `/staff/disponibilidad`
   - `/staff/cambios`
   - `/staff/ofertas`
   - `/staff/incorporacion`
   - `/staff/politicas`
   - `/staff/formacion`
   - `/staff/material`
   - `/staff/checklists`
   - `/staff/notificaciones`

No uses datos reales ni envíes pedidos, emails o comunicaciones externas.

## Flujo kiosk

1. Generar `pin_hash` con `QA_STAFF_PIN`.
2. Ejecutar seed con `set app.qa_staff_pin_hash`.
3. Abrir `/staff/kiosk`.
4. Seleccionar empleado QA activo.
5. Introducir el PIN QA local.
6. Validar una operación.
7. Confirmar que vuelve a `/staff/kiosk?ok=1` y no conserva sesión completa del empleado.

## Pruebas de fichaje

Secuencia manual:

1. Sin fichaje abierto: `Fichar entrada`.
2. Intentar doble entrada: debe bloquearse por servicio/índice único.
3. Iniciar pausa.
4. Intentar doble pausa: debe bloquearse por servicio/índice único.
5. Finalizar pausa.
6. Fichar salida.
7. Confirmar `worked_seconds` y auditoría.

No marques esta prueba como superada sin ejecutarla contra entorno QA.

## Pruebas de ausencia

1. Ver política `QA Vacaciones`.
2. Ver periodo de saldo.
3. Crear solicitud desde `/staff/ausencias`.
4. Revisar en `/admin-kiosko/personal/ausencias`.
5. Aprobar o rechazar.
6. Confirmar ledger y saldo.
7. Intentar reintento de aprobación y revisar idempotencia.

## Pruebas de turnos

1. Revisar turno draft y publicado.
2. Publicar una semana desde administración.
3. Confirmar publicación y notificación.
4. Modificar turno publicado.
5. Confirmar nueva versión/diff si el flujo administrativo lo ejecuta.

## Pruebas de onboarding

1. Abrir proceso QA en `/admin-kiosko/personal/onboarding`.
2. Confirmar tareas visibles y administrativas.
3. Entrar como empleado y abrir `/staff/incorporacion`.
4. Completar solo tareas visibles permitidas.
5. Confirmar que el empleado no puede aprobar tareas internas.

## Pruebas de checklist

1. Abrir `/staff/checklists`.
2. Revisar checklist QA pendiente.
3. Completar un ítem normal.
4. Simular fallo crítico solo en entorno QA.
5. Confirmar incidencia vinculada y auditoría.

## Pruebas de offboarding

1. Abrir `/admin-kiosko/personal/offboarding`.
2. Revisar proceso QA en borrador.
3. Confirmar tareas de devolución de material.
4. No borrar empleado ni historial.

## Matriz de permisos

Owner:

- Debe ver entidades de la organización QA.
- Debe administrar centros, empleados, ausencias, procesos y auditoría.

Manager:

- Debe ver centros autorizados.
- Debe gestionar turnos y operaciones permitidas.
- No debe ver datos sensibles si no tiene permiso específico.

Empleado:

- Solo debe ver su perfil, turnos, fichajes, ausencias, documentos visibles, ofertas, tareas y notificaciones.
- No debe ver otro empleado, aprobar su ausencia, editar contrato, ver disciplina privada ni auditoría.

Kiosk compartido:

- Debe validar PIN.
- Debe permitir una operación concreta.
- No debe mantener sesión completa.
- Debe impedir doble entrada, doble pausa y salida con pausa abierta.

## Validación RLS

La estrategia elegida es server-side. Después de aplicar:

```text
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_auth_rls_fix.sql
```

la afirmación esperada es:

```text
RLS bloquea acceso directo y la autorización real se hace server-side.
```

Comprobación orientativa:

```sql
select tablename, policyname, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename like 'admin_kiosko_staff_%'
  and roles::text like '%authenticated%'
  and coalesce(qual, '') like '%auth.uid%';
```

Debe devolver cero filas tras aplicar la migración correctiva.

## Tests opcionales de integración

No se ejecutan con `npm test`. Requieren variables y flag:

```bash
cd /Users/xavibocanegra/kioskoalfresko
STAFF_QA_INTEGRATION=1 npm run test:staff:integration
```

## Errores conocidos

- La constraint de `admin_kiosko_staff_notifications.notification_type` contiene los tipos de fase 3. Los tipos nuevos documentados en fase 4 deben añadirse en una migración futura antes de usarlos en seed o UI.
- Antes de aplicar la migración correctiva, pueden existir políticas legacy basadas en `auth.uid()`.
- No hay rate limit persistente de PIN para kiosk.
- El seed crea usuarios QA sin contraseña para no versionar credenciales. Define una contraseña temporal de QA fuera del repositorio si quieres probar login nominal.

## Rollback

No hay rollback automático. Para retirar datos QA, revisa primero dependencias y filtra por:

```sql
select id from public.admin_kiosko_staff_organizations where slug = 'qa-alfresko-group';
select id from public.admin_kiosko_staff_locations where slug like 'qa-%';
select id from public.admin_kiosko_staff_employees where employee_code like 'QA-%';
select id from public.admin_users where username like 'qa_%';
```

No uses borrados masivos sin revisar FKs y auditoría.

## Checklist manual de aceptación

- [ ] Organización QA accesible.
- [ ] Dos centros QA separados.
- [ ] Empleados separados por centro.
- [ ] Empleado multi-centro visible en ambos centros autorizados.
- [ ] Contrato activo.
- [ ] Usuario interno vinculado.
- [ ] PIN funcional en kiosk.
- [ ] Turno publicado.
- [ ] Notificación generada.
- [ ] `/staff` accesible con usuario vinculado.
- [ ] Fichaje completo entrada-pausa-fin pausa-salida.
- [ ] Ausencia aprobada con saldo/ledger.
- [ ] Disponibilidad visible.
- [ ] Cambio de turno controlado.
- [ ] Onboarding visible.
- [ ] Política asignada.
- [ ] Formación visible.
- [ ] Material visible.
- [ ] Checklist visible.
- [ ] Auditoría generada.
- [ ] Acceso cruzado bloqueado.
