# RRHH fase 1.5 - Expediente completo del empleado

## Alcance

La fase 1.5 amplía RRHH fase 1 con expediente laboral completo: datos personales/laborales, documentos privados, formación, ausencias, disciplina, firma manuscrita, historial y auditoría filtrable.

No implementa motor legal de vacaciones, nóminas, firma electrónica cualificada, PRL avanzada, bloqueo de periodos ni integración con Seguridad Social.

## Arquitectura

- Migración: `supabase/admin_kiosko_staff_hr_phase_1_5.sql`.
- Repositorio expediente: `lib/admin-kiosko/repositories/staff-records.repository.ts`.
- Servicios:
  - `lib/admin-kiosko/staff/profile.service.ts`
  - `lib/admin-kiosko/staff/documents.service.ts`
  - `lib/admin-kiosko/staff/training.service.ts`
  - `lib/admin-kiosko/staff/absence.service.ts`
  - `lib/admin-kiosko/staff/disciplinary.service.ts`
  - `lib/admin-kiosko/staff/signature.service.ts`
- Reglas y protección:
  - `lib/admin-kiosko/staff/record-rules.ts`
  - `lib/admin-kiosko/staff/sensitive.ts`
- UI:
  - `components/staff/EmployeeRecord.tsx`
  - `components/staff/SignatureCanvas.tsx`

## Modelo de datos

Nuevas entidades:

- `admin_kiosko_staff_organizations`
- `admin_kiosko_staff_employee_private_profiles`
- `admin_kiosko_staff_employee_authorized_locations`
- `admin_kiosko_staff_documents`
- `admin_kiosko_staff_training_catalog`
- `admin_kiosko_staff_training_assignments`
- `admin_kiosko_staff_absences`
- `admin_kiosko_staff_disciplinary_cases`
- `admin_kiosko_staff_signatures`
- `admin_kiosko_staff_timeline_events`

Se añade `organization_id` de forma compatible a centros, empleados, contratos, turnos y fichajes existentes.

## Permisos

Permisos añadidos:

- `staff:read`
- `staff:write`
- `staff:sensitive:read`
- `staff:documents:read`
- `staff:documents:write`
- `staff:disciplinary:read`
- `staff:disciplinary:write`
- `staff:audit:read`
- `staff:signatures:manage`

Owner conserva acceso completo por la regla central existente.

## Protección de datos sensibles

Datos sensibles tratados:

- DNI/NIE.
- NSS.
- IBAN.
- domicilio.
- fecha de nacimiento.
- documentos.
- salarios/coste empresa.
- contacto de emergencia.

Reglas:

- los listados generales no exponen valores completos;
- DNI, NSS e IBAN se enmascaran cuando no hay permiso sensible;
- la auditoría registra campos cambiados, no valores completos;
- las URLs de documento son firmadas y de corta duración;
- rutas privadas de Storage no se muestran al empleado.

## Storage

Bucket esperado:

```text
staff-private-documents
```

Configuración:

- privado;
- límite 10 MB;
- MIME permitidos: PDF, JPEG, PNG, WebP y texto plano;
- acceso exclusivamente server-side con `SUPABASE_SERVICE_ROLE_KEY`;
- URLs firmadas de 120 segundos.

La migración incluye `insert into storage.buckets`, pero debe ejecutarse en Supabase con permisos suficientes.

## Firma manuscrita

Se implementa captura Canvas en `components/staff/SignatureCanvas.tsx`.

La firma guarda:

- firmante;
- empleado;
- entidad/documento;
- versión;
- hash de contenido;
- hash de firma;
- consentimiento;
- texto mostrado;
- actor;
- evidencia técnica.

No se presenta como firma electrónica cualificada.

## Timeline

La línea temporal se guarda en `admin_kiosko_staff_timeline_events` y permite eventos visibles o internos:

- perfil;
- contratos;
- documentos;
- formación;
- ausencias;
- disciplina;
- firmas;
- correcciones.

## Despliegue

Desde Supabase SQL Editor:

```sql
-- /Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_1_5.sql
```

Validación local:

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

## Operación diaria

1. RRHH entra en `/admin-kiosko/personal/empleados/[employeeId]`.
2. Actualiza expediente personal/laboral.
3. Sube documentos privados y marca visibilidad/firma si procede.
4. Asigna formación.
5. Registra ausencias.
6. Registra comunicaciones disciplinarias solo con permiso específico.
7. Consulta auditoría filtrable en `/admin-kiosko/personal/informes`.

Empleado:

- `/staff/perfil`
- `/staff/documentos`
- `/staff/formacion`
- `/staff/ausencias`
- `/staff/firmas`
- `/staff/historial`

## RLS y amenazas

La migración activa RLS en tablas nuevas con políticas:

- `service_role` total para server-side;
- empleado autenticado limitado a su `auth_user_id -> employee_id`;
- HR/manager por roles fase 1;
- documentos visibles solo si `visible_to_employee = true`.

Amenazas cubiertas por diseño:

- acceso horizontal entre empleados;
- acceso cruzado de documentos;
- firma de documentos ajenos;
- exposición accidental de rutas privadas;
- auditoría con datos sensibles.

## Rollback

No hay borrado automático. Para rollback funcional:

1. retirar enlaces UI a expediente 1.5;
2. no aplicar la migración;
3. si ya se aplicó, dejar tablas inactivas sin borrar documentos;
4. revocar acceso al bucket `staff-private-documents` si se necesita detener descargas.

## Variables de entorno

No se añaden variables nuevas.

Se reutilizan:

- `SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Limitaciones

- No se calculan saldos legales de vacaciones.
- No se generan nóminas.
- No hay PDF/Excel de expediente.
- La firma manuscrita es evidencia interna, no firma cualificada.
- Los documentos privados dependen de que el bucket exista y sea privado.
