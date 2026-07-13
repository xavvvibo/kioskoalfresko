import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuditEvent,
  calculateWorkedSeconds,
  canClockIn,
  canClockOut,
  canStartBreak,
  detectShiftConflicts,
  filterByLocation,
  hasOpenBreak,
  shiftDurationMinutes,
  toCsv,
  visiblePublishedShifts,
} from "../lib/admin-kiosko/staff/time.ts";

test("permite fichaje de entrada cuando no hay registro abierto", () => {
  assert.equal(canClockIn({ hasOpenEntry: false, hasOpenBreak: false }), true);
});

test("bloquea doble fichaje de entrada", () => {
  assert.equal(canClockIn({ hasOpenEntry: true, hasOpenBreak: false }), false);
});

test("permite salida si hay registro abierto y sin pausa abierta", () => {
  assert.equal(canClockOut({ hasOpenEntry: true, hasOpenBreak: false }), true);
});

test("permite iniciar pausa con fichaje abierto", () => {
  assert.equal(canStartBreak({ hasOpenEntry: true, hasOpenBreak: false }), true);
});

test("bloquea doble pausa", () => {
  assert.equal(canStartBreak({ hasOpenEntry: true, hasOpenBreak: true }), false);
});

test("bloquea salida con pausa abierta", () => {
  assert.equal(canClockOut({ hasOpenEntry: true, hasOpenBreak: true }), false);
});

test("calcula tiempo efectivo restando pausas no pagadas", () => {
  const worked = calculateWorkedSeconds({
    clockInAt: "2026-07-13T20:00:00.000Z",
    clockOutAt: "2026-07-14T00:00:00.000Z",
    breaks: [
      { startedAt: "2026-07-13T22:00:00.000Z", endedAt: "2026-07-13T22:30:00.000Z", paid: false },
      { startedAt: "2026-07-13T23:00:00.000Z", endedAt: "2026-07-13T23:10:00.000Z", paid: true },
    ],
  });
  assert.equal(worked, 12_600);
});

test("soporta turnos que cruzan medianoche", () => {
  assert.equal(shiftDurationMinutes({
    startsAt: "2026-07-13T21:00:00.000Z",
    endsAt: "2026-07-14T00:30:00.000Z",
  }), 210);
});

test("detecta solape de turnos del mismo empleado", () => {
  const conflicts = detectShiftConflicts([
    { employeeId: "e1", startsAt: "2026-07-13T18:00:00.000Z", endsAt: "2026-07-13T22:00:00.000Z" },
    { employeeId: "e1", startsAt: "2026-07-13T21:30:00.000Z", endsAt: "2026-07-14T00:00:00.000Z" },
  ]);
  assert.equal(conflicts.length, 1);
});

test("solo muestra turnos publicados del empleado", () => {
  const shifts = visiblePublishedShifts("e1", [
    { employeeId: "e1", status: "published", startsAt: "2026-07-13T18:00:00.000Z", endsAt: "2026-07-13T22:00:00.000Z" },
    { employeeId: "e1", status: "draft", startsAt: "2026-07-14T18:00:00.000Z", endsAt: "2026-07-14T22:00:00.000Z" },
    { employeeId: "e2", status: "published", startsAt: "2026-07-15T18:00:00.000Z", endsAt: "2026-07-15T22:00:00.000Z" },
  ]);
  assert.equal(shifts.length, 1);
});

test("aísla datos entre centros", () => {
  const rows = filterByLocation("l1", [{ locationId: "l1" }, { locationId: "l2" }]);
  assert.equal(rows.length, 1);
});

test("detecta pausa abierta", () => {
  assert.equal(hasOpenBreak([{ startedAt: "2026-07-13T22:00:00.000Z", endedAt: null }]), true);
});

test("construye auditoría de rectificación aprobada", () => {
  const event = buildAuditEvent({
    actorUserId: "u1",
    entityType: "staff_time_incident",
    entityId: "i1",
    action: "incident_approve",
    afterData: { status: "approved" },
  });
  assert.equal(event.action, "incident_approve");
  assert.deepEqual(event.after_data, { status: "approved" });
});

test("exporta CSV escapando valores", () => {
  const csv = toCsv(["empleado", "estado"], [["Ana, Turno", "aprobado"]]);
  assert.equal(csv, 'empleado;estado\n"Ana, Turno";aprobado');
});
