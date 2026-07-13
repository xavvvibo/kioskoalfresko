# RRHH fase 2 - Vacaciones, ausencias, saldos y aprobaciones

## Alcance

Fase 2 añade políticas configurables, periodos de saldo, ledger inmutable, solicitudes de empleado, aprobación/rechazo/parcial, calendario, impactos de turno, bloqueos operativos, regularizaciones y variables preparatorias de nómina.

No implementa nómina completa ni reglas legales universales. Las políticas deben configurarse por organización y opcionalmente por centro.

## Arquitectura

- Migración: `supabase/admin_kiosko_staff_hr_phase_2.sql`.
- Repositorio: `lib/admin-kiosko/repositories/staff-leave.repository.ts`.
- Dominio puro: `lib/admin-kiosko/staff/leave-rules.ts`.
- Servicios:
  - `leave-balance.service.ts`
  - `leave-accrual.service.ts`
  - `leave-request.service.ts`
  - `period-lock.service.ts`
  - `payroll-variable.service.ts`
- UI admin: `/admin-kiosko/personal/ausencias`, `/saldos`, `/politicas`, `/calendario`, `/periodos`, `/variables`.
- Portal empleado ampliado: `/staff/ausencias`.

## Políticas

Las políticas se guardan en `admin_kiosko_staff_leave_policies` y permiten:

- unidad: días naturales, laborables u horas;
- devengo anual, mensual, proporcional o manual;
- prorrateo;
- arrastre;
- saldo negativo controlado;
- justificante;
- aprobación;
- medias jornadas y horas.

## Devengo

El motor puro redondea a 2 decimales. Soporta:

- año completo;
- meses trabajados;
- alta/baja dentro del periodo;
- año bisiesto;
- arrastre y expiración.

No asume 30 días naturales si la política no lo define.

## Saldos y ledger

`admin_kiosko_staff_leave_balance_periods` materializa totales. La fuente auditable es:

```text
admin_kiosko_staff_leave_balance_ledger
```

El ledger es inmutable por trigger SQL. Las correcciones se hacen con movimientos `reversal` o `adjustment` con idempotency key.

## Solicitudes y aprobaciones

`admin_kiosko_staff_leave_requests` gestiona estados:

```text
draft, submitted, under_review, approved, rejected, cancelled, withdrawn, partially_approved
```

Las decisiones se registran en `admin_kiosko_staff_leave_request_decisions`.

La aprobación consume saldo; el rechazo libera reservas. La aprobación parcial conserva rango/cantidad aprobada.

## Impacto en turnos

Al aprobar, se identifican turnos publicados solapados y se crean propuestas en:

```text
admin_kiosko_staff_shift_absence_impacts
```

No se borran ni modifican turnos automáticamente.

## Bloqueos

`admin_kiosko_staff_period_locks` soporta:

- `open`
- `soft_locked`
- `hard_locked`
- `closed`

Aplica a fichajes, ausencias, saldos y variables.

## Variables de nómina

`admin_kiosko_staff_payroll_variables` registra conceptos exportables sin importes salariales:

- horas ordinarias;
- extras;
- nocturnidad;
- festivos;
- vacaciones;
- ausencias;
- retrasos;
- incidencias;
- ajustes.

## Permisos

Añadidos:

- `staff:absence:read`
- `staff:absence:write`
- `staff:absence:approve`
- `staff:balance:read`
- `staff:balance:adjust`
- `staff:policy:read`
- `staff:policy:write`
- `staff:period:lock`
- `staff:payroll-variable:read`
- `staff:payroll-variable:write`
- `staff:payroll-variable:export`

## RLS y amenazas

RLS está activo en tablas nuevas. El empleado solo debe ver sus solicitudes/saldos. Las aprobaciones, ajustes, bloqueos y exportaciones requieren permisos administrativos.

Amenazas contempladas:

- acceso horizontal entre empleados;
- acceso cruzado entre organizaciones;
- saldo negativo sin permiso;
- edición de periodo cerrado;
- doble contabilización por reintentos;
- exportación de datos sensibles innecesarios.

## Despliegue

Ejecutar manualmente en Supabase SQL Editor:

```sql
-- /Users/xavibocanegra/kioskoalfresko/supabase/admin_kiosko_staff_hr_phase_2.sql
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

1. Crear políticas en `/admin-kiosko/personal/politicas`.
2. Crear periodos/saldos por empleado y política.
3. El empleado solicita en `/staff/ausencias`.
4. Admin revisa en `/admin-kiosko/personal/ausencias`.
5. Admin resuelve y revisa impactos de turno.
6. RRHH exporta CSV desde `/admin-kiosko/personal/informes`.

## Rollback

No borrar ledger ni solicitudes. Para rollback funcional:

1. ocultar rutas phase 2;
2. no aplicar migración;
3. si ya se aplicó, dejar tablas sin uso;
4. conservar ledger para trazabilidad.

## Limitaciones

- No modifica turnos automáticamente.
- No calcula importes salariales.
- No interpreta diagnósticos médicos.
- No implementa Excel/PDF.
- Cobertura disponible es una ayuda administrativa, no decisión automática.
