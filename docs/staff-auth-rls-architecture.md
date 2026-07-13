# Arquitectura de identidad y RLS RRHH

## Problema encontrado

El módulo RRHH tenía dos modelos de identidad:

```text
Aplicación real
cookie admin_kiosko_session -> admin_users.id

Políticas SQL de empleado
auth.uid() -> Supabase Auth UUID
```

La ficha de empleado usa:

```text
admin_kiosko_staff_employees.auth_user_id -> admin_users.id
```

Por tanto, `auth.uid()` no representa al usuario real de `/staff` salvo una coincidencia accidental. Mantener políticas `authenticated` basadas en `auth.uid()` daba una falsa sensación de seguridad.

## Estrategia elegida

Estrategia A: autorización server-side como fuente de verdad.

```text
cookie interna firmada
-> admin_users.id
-> admin_kiosko_staff_employees.auth_user_id
-> roles RRHH, organización y centros
-> permisos server-side
-> repositorios con service_role
```

No se introduce Supabase Auth para empleados. No se crea un híbrido. RLS queda para bloquear acceso directo desde `anon`/`authenticated`; la autorización real ocurre en servidor antes de usar `service_role`.

## Cookie

Cookie:

```text
admin_kiosko_session
```

Propiedades:

- `httpOnly`
- `sameSite: strict`
- `secure` en producción
- `path: /`
- `maxAge` 8 horas

Formato nominal:

```text
user.<payload_base64url>.<hmac>
```

El payload contiene `userId`, `role` y `createdAt`, pero el servidor reconsulta `admin_users` en cada resolución y rechaza usuarios desactivados.

## Usuarios internos

Tabla:

```text
public.admin_users
```

Roles actuales:

```text
owner
employee
```

La tabla sigue siendo la identidad real de la aplicación. No se guardan permisos completos en cookie.

## Vinculación con empleado

Columna existente:

```text
admin_kiosko_staff_employees.auth_user_id
```

Decisión: se mantiene por compatibilidad, pero queda documentada como nombre legacy. Referencia `public.admin_users(id)`, no `auth.uid()`.

Herramienta administrativa:

```text
/admin-kiosko/personal/empleados/[employeeId]
```

Permiso:

```text
staff:identity:write
```

Permite vincular y desvincular usuario interno activo, impidiendo vinculación duplicada simple. No crea contraseñas ni muestra credenciales.

## Resolución del actor

Helper central:

```text
lib/admin-kiosko/auth/staff-actor.ts
```

Funciones:

- `resolveCurrentStaffActor()`
- `requireAdminActor()`
- `requireStaffEmployeeActor()`
- `requireStaffManagerActor()`
- `requireStaffPermission(permission)`
- `requireOrganizationAccess(organizationId)`
- `requireLocationAccess(locationId)`
- `requireEmployeeAccess(employeeId)`

Objeto devuelto:

```ts
{
  adminUserId,
  employeeId,
  employee,
  organizationIds,
  locationIds,
  staffRoles,
  role,
  permissions,
  isOwner,
  isManager,
  isEmployee,
  legacy
}
```

## Owner

`owner` puede administrar RRHH aunque no tenga empleado vinculado. Si tiene empleado vinculado inactivo, se bloquea `/staff`, pero no se bloquea su capacidad administrativa por rol owner.

## Manager

Manager se resuelve por roles RRHH:

```text
staff_location_manager
staff_shift_lead
staff_hr
admin
```

Debe quedar limitado por `organization_id` y `location_id`. Las acciones críticas deben validar centro y empleado antes de llamar al repositorio.

## Empleado

`/staff` exige:

- sesión interna válida;
- `admin_users.status = active`;
- empleado vinculado;
- empleado activo;
- acceso solo a su propio `employeeId`.

El empleado no puede seleccionar identidad por formulario.

## Kiosk compartido

`/staff/kiosk` no crea sesión persistente de empleado.

Flujo:

```text
selección empleado activo
-> PIN
-> panel temporal
-> PIN requerido de nuevo por operación
-> fichaje con source shared_kiosk
-> redirección a estado neutro
```

Limitación: no hay rate limit persistente distribuido. Si se despliega con múltiples instancias, debe añadirse una tabla o proveedor central de intentos.

## Service role

Los repositorios RRHH usan `SUPABASE_SERVICE_ROLE_KEY` server-side. El service role no debe importarse en componentes cliente ni viajar en props.

La regla operativa es:

```text
resolver actor y permisos primero
consultar repositorio después
```

## RLS

Después de aplicar:

```text
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_auth_rls_fix.sql
```

la afirmación correcta será:

```text
RLS bloquea acceso directo y la autorización real se hace server-side.
```

La migración:

- mantiene RLS activado;
- revoca acceso directo a `anon` y `authenticated`;
- mantiene `service_role`;
- elimina políticas de empleado basadas en `auth.uid()`;
- comenta `auth_user_id` como legacy de `admin_users.id`.

## Matriz RLS resumida

| Tabla | anon | authenticated | service_role | autorización app |
| --- | --- | --- | --- | --- |
| `admin_kiosko_staff_employees` | denegado | denegado | permitido | actor server-side |
| `admin_kiosko_staff_contracts` | denegado | denegado | permitido | permisos RRHH |
| `admin_kiosko_staff_documents` | denegado | denegado | permitido | actor + visibilidad + permiso |
| `admin_kiosko_staff_work_entries` | denegado | denegado | permitido | actor + empleado/centro |
| `admin_kiosko_staff_leave_requests` | denegado | denegado | permitido | actor + empleado/centro |
| `admin_kiosko_staff_notifications` | denegado | denegado | permitido | actor + destinatario |
| `admin_kiosko_staff_processes` | denegado | denegado | permitido | actor + empleado/centro |
| `admin_kiosko_staff_checklist_runs` | denegado | denegado | permitido | actor + empleado/centro |

## Documentos

Las URLs firmadas se generan solo en servidor. Antes de entregarlas debe validarse:

- actor;
- empleado;
- organización;
- visibilidad para empleado o permiso de documento;
- categoría sensible.

## Exportaciones

Las rutas CSV deben requerir permisos administrativos y no incluir datos sensibles innecesarios. El acceso debe auditarse en fase posterior si se requiere trazabilidad legal completa de descargas.

## Auditoría

Registrar de forma saneada:

- vinculación/desvinculación usuario-empleado;
- acceso a documentos;
- exportaciones;
- intentos denegados relevantes;
- cambios de permisos.

No registrar cookie, token, service role, PIN, hash, DNI completo, NSS, IBAN ni contenido documental.

## Amenazas cubiertas

- Cookie manipulada: HMAC y relectura de `admin_users`.
- Usuario desactivado: sesión rechazada.
- Empleado no vinculado: `/staff` bloqueado.
- Empleado inactivo: `/staff` bloqueado.
- `employeeId` manipulado: se resuelve actor server-side en acciones reforzadas.
- Acceso directo Supabase: RLS cerrado tras migración correctiva.
- Kiosk persistente: operación requiere PIN de nuevo y no crea sesión de empleado.

## Limitaciones

- Quedan páginas administrativas heredadas que listan datos globales para owner/RRHH; deben ir migrando a repositorios con actor obligatorio.
- La migración correctiva no se ha aplicado desde Codex.
- No hay rate limit persistente de PIN.
- No se ha migrado a Supabase Auth.

## Despliegue

1. Validar localmente.
2. Aplicar migración correctiva en staging:

```bash
cd /Users/xavibocanegra/kioskoalfresko
```

Ejecutar en Supabase SQL Editor:

```text
/Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_auth_rls_fix.sql
```

3. Abrir `/admin-kiosko/personal/qa`.
4. Confirmar estrategia `Server-side` y cero políticas directas `authenticated/auth.uid()` detectadas.
5. Ejecutar checklist manual del runbook.

## Rollback

Rollback razonable: reejecutar las migraciones RRHH previas que crean políticas `authenticated`, o restaurar políticas desde control de versiones. No borrar datos.

## Pruebas

Tests añadidos:

```text
tests/staff-auth-rls.test.mts
```

Cubren acceso owner/empleado/manager, permiso sensible, vínculo duplicado, PIN incorrecto y saneado de auditoría.
