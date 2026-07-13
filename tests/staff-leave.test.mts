import assert from "node:assert/strict";
import test from "node:test";
import {
  assertLeaveTransition,
  calculateAvailableAfterReservation,
  calculateCarryover,
  calculateExpiration,
  calculateMonthlyAccrual,
  calculateProjectedBalance,
  calculateProratedAnnualAccrual,
  calculateRequestedAmount,
  daysInYear,
  detectLeaveConflicts,
  roundLeave,
  sanitizeLeaveAuditMetadata,
} from "../lib/admin-kiosko/staff/leave-rules.ts";
import { toCsv } from "../lib/admin-kiosko/staff/time.ts";

test("calcula devengo anual completo", () => {
  assert.equal(calculateProratedAnnualAccrual({ annualAmount: 30, periodStart: "2026-01-01", periodEnd: "2026-12-31" }), 30);
});

test("prorratea alta a mitad de año", () => {
  assert.equal(calculateProratedAnnualAccrual({ annualAmount: 30, periodStart: "2026-01-01", periodEnd: "2026-12-31", employeeStart: "2026-07-01" }), 15.12);
});

test("prorratea baja antes de final de año", () => {
  assert.equal(calculateProratedAnnualAccrual({ annualAmount: 30, periodStart: "2026-01-01", periodEnd: "2026-12-31", employeeEnd: "2026-06-30" }), 14.88);
});

test("soporta año bisiesto", () => {
  assert.equal(daysInYear(2028), 366);
});

test("calcula devengo mensual con redondeo a 2 decimales", () => {
  assert.equal(calculateMonthlyAccrual({ annualAmount: 22, monthsWorked: 5 }), 9.17);
});

test("calcula saldos en horas y reserva", () => {
  const snapshot = { openingBalance: 0, accrued: 80, consumed: 8, reserved: 4, adjusted: 0, carriedOver: 0, expired: 0 };
  assert.equal(calculateProjectedBalance(snapshot), 68);
  assert.equal(calculateAvailableAfterReservation(snapshot, 10), 58);
});

test("calcula arrastre y expiración", () => {
  assert.equal(calculateCarryover({ available: 8, enabled: true, maxCarryover: 5 }), 5);
  assert.equal(calculateExpiration({ carriedOver: 5, usedCarryover: 2 }), 3);
});

test("valida transiciones de aprobación, rechazo y cancelación", () => {
  assert.equal(assertLeaveTransition("submitted", "approved"), true);
  assert.equal(assertLeaveTransition("approved", "draft"), false);
  assert.equal(assertLeaveTransition("approved", "cancelled"), true);
});

test("calcula aprobación parcial por horas", () => {
  assert.equal(calculateRequestedAmount({ startsAt: "2026-07-13T10:00:00.000Z", endsAt: "2026-07-13T14:00:00.000Z", unit: "hours", partialMode: "hours" }), 4);
});

test("detecta saldo insuficiente, periodo bloqueado y solape", () => {
  const conflicts = detectLeaveConflicts({
    requestStart: "2026-07-13T10:00:00.000Z",
    requestEnd: "2026-07-14T10:00:00.000Z",
    requestedAmount: 4,
    availableBalance: 1,
    negativeAllowed: false,
    negativeLimit: 0,
    minNoticeDays: 0,
    periodLocked: true,
    existingAbsences: [{ id: "a1", startsAt: "2026-07-13T12:00:00.000Z", endsAt: "2026-07-13T18:00:00.000Z", status: "approved" }],
    publishedShifts: [{ id: "s1", startsAt: "2026-07-13T20:00:00.000Z", endsAt: "2026-07-13T23:00:00.000Z" }],
  });
  assert.equal(conflicts.filter((conflict) => conflict.severity === "blocking").length, 3);
  assert.equal(conflicts.some((conflict) => conflict.code === "published_shift_affected"), true);
});

test("detecta turno afectado", () => {
  const conflicts = detectLeaveConflicts({
    requestStart: "2026-07-13T20:00:00.000Z",
    requestEnd: "2026-07-13T23:00:00.000Z",
    requestedAmount: 1,
    availableBalance: 10,
    negativeAllowed: false,
    negativeLimit: 0,
    minNoticeDays: 0,
    publishedShifts: [{ id: "s1", startsAt: "2026-07-13T21:00:00.000Z", endsAt: "2026-07-13T22:00:00.000Z" }],
  });
  assert.equal(conflicts.some((conflict) => conflict.code === "published_shift_affected"), true);
});

test("redondea e idempotencia se representa con claves estables", () => {
  assert.equal(roundLeave(1.005), 1.01);
  assert.equal(`reservation:req-1`, `reservation:${"req-1"}`);
});

test("exporta CSV y sanea auditoría", () => {
  assert.equal(toCsv(["concepto", "cantidad"], [["vacaciones", 2]]), "concepto;cantidad\nvacaciones;2");
  assert.deepEqual(sanitizeLeaveAuditMetadata({ diagnosis: "x", comment: "ok", salary: 1 }), { diagnosis: "[restricted]", comment: "ok", salary: "[restricted]" });
});
