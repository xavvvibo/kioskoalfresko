import assert from "node:assert/strict";
import test from "node:test";
import {
  detectCandidateRestrictions,
  resolveAvailabilityForShift,
  sanitizeOperationalMetadata,
} from "../lib/admin-kiosko/staff/availability-rules.ts";
import { canRespondToOffer, buildNotificationIdempotencyKey, prepareNotificationMetadata } from "../lib/admin-kiosko/staff/notification-rules.ts";
import { diffScheduleVersions } from "../lib/admin-kiosko/staff/schedule-publication-rules.ts";
import {
  canTransitionShiftChange,
  detectActiveOperationConflict,
  isExpired,
  validateSwapReadiness,
} from "../lib/admin-kiosko/staff/shift-change-rules.ts";
import { rankCandidates, scoreCandidate } from "../lib/admin-kiosko/staff/workload-rules.ts";

const rules = {
  minRestMinutes: 720,
  overlapToleranceMinutes: 0,
  minNoticeMinutes: 0,
  maxDailyMinutes: 600,
  maxWeeklyMinutes: 2400,
};

test("resuelve disponibilidad recurrente", () => {
  const availability = resolveAvailabilityForShift({
    shiftStart: "2026-07-14T10:00:00.000Z",
    shiftEnd: "2026-07-14T14:00:00.000Z",
    recurring: [{ id: "r1", weekday: 2, type: "available", startsAt: "09:00", endsAt: "18:00", validFrom: "2026-01-01" }],
    exceptions: [],
  });
  assert.equal(availability.type, "available");
});

test("la excepción puntual prevalece sobre la recurrente", () => {
  const availability = resolveAvailabilityForShift({
    shiftStart: "2026-07-14T10:00:00.000Z",
    shiftEnd: "2026-07-14T14:00:00.000Z",
    recurring: [{ id: "r1", weekday: 2, type: "available", startsAt: "09:00", endsAt: "18:00", validFrom: "2026-01-01" }],
    exceptions: [{ id: "e1", type: "unavailable", startsAt: "2026-07-14T08:00:00.000Z", endsAt: "2026-07-14T18:00:00.000Z", status: "approved" }],
  });
  assert.equal(availability.source, "exception");
  assert.equal(availability.type, "unavailable");
});

test("distingue preferencia frente a restricción", () => {
  const restrictions = detectCandidateRestrictions({
    employeeId: "e1",
    employeeStatus: "active",
    shiftStart: "2026-07-14T10:00:00.000Z",
    shiftEnd: "2026-07-14T14:00:00.000Z",
    shiftLocationId: "l1",
    authorizedLocationIds: ["l1"],
    recurringAvailability: [{ id: "p1", weekday: 2, type: "positive_preference", startsAt: "09:00", endsAt: "18:00", validFrom: "2026-01-01" }],
    rules,
  });
  assert.equal(restrictions.some((restriction) => restriction.blocking), false);
});

test("bloquea empleado incompatible y centro no autorizado", () => {
  const restrictions = detectCandidateRestrictions({
    employeeId: "e1",
    employeeStatus: "inactive",
    shiftStart: "2026-07-14T10:00:00.000Z",
    shiftEnd: "2026-07-14T14:00:00.000Z",
    shiftLocationId: "l2",
    authorizedLocationIds: ["l1"],
    roleCompatible: false,
    rules,
  });
  assert.equal(restrictions.filter((restriction) => restriction.blocking).length, 3);
});

test("bloquea ausencia aprobada y solape de turno", () => {
  const restrictions = detectCandidateRestrictions({
    employeeId: "e1",
    employeeStatus: "active",
    shiftStart: "2026-07-14T10:00:00.000Z",
    shiftEnd: "2026-07-14T14:00:00.000Z",
    shiftLocationId: "l1",
    authorizedLocationIds: ["l1"],
    approvedAbsences: [{ id: "a1", startsAt: "2026-07-14T09:00:00.000Z", endsAt: "2026-07-14T11:00:00.000Z" }],
    assignedShifts: [{ id: "s1", startsAt: "2026-07-14T12:00:00.000Z", endsAt: "2026-07-14T16:00:00.000Z" }],
    rules,
  });
  assert.equal(restrictions.some((restriction) => restriction.code === "approved_absence"), true);
  assert.equal(restrictions.some((restriction) => restriction.code === "shift_overlap"), true);
});

test("advierte descanso insuficiente", () => {
  const restrictions = detectCandidateRestrictions({
    employeeId: "e1",
    employeeStatus: "active",
    shiftStart: "2026-07-14T10:00:00.000Z",
    shiftEnd: "2026-07-14T14:00:00.000Z",
    shiftLocationId: "l1",
    authorizedLocationIds: ["l1"],
    assignedShifts: [{ id: "s1", startsAt: "2026-07-13T20:00:00.000Z", endsAt: "2026-07-14T02:00:00.000Z" }],
    rules,
  });
  assert.equal(restrictions.some((restriction) => restriction.code === "insufficient_rest" && !restriction.blocking), true);
});

test("valida intercambio y transición", () => {
  assert.equal(canTransitionShiftChange("candidate_accepted", "pending_manager"), true);
  assert.equal(canTransitionShiftChange("executed", "approved"), false);
  const readiness = validateSwapReadiness({
    requesterAccepted: true,
    candidateAccepted: true,
    managerApproved: true,
    requestExpired: false,
    originalRestrictions: [],
    candidateRestrictions: [],
  });
  assert.equal(readiness.ready, true);
});

test("detecta intercambio inválido y solicitud expirada", () => {
  assert.equal(isExpired("2020-01-01T00:00:00.000Z"), true);
  const readiness = validateSwapReadiness({
    requesterAccepted: true,
    candidateAccepted: false,
    managerApproved: false,
    requestExpired: true,
    originalRestrictions: [{ code: "x", severity: "blocking", message: "Bloqueo", source: "test", blocking: true }],
    candidateRestrictions: [],
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.blockers.length, 4);
});

test("detecta operación activa sobre los mismos turnos", () => {
  const conflict = detectActiveOperationConflict({
    targetShiftIds: ["s1"],
    activeRequests: [{ id: "r1", originalShiftId: "s1", status: "pending_manager" }],
  });
  assert.equal(conflict?.id, "r1");
});

test("puntúa candidatos de forma explicable", () => {
  const score = scoreCandidate({
    employeeId: "e1",
    employeeStatus: "active",
    shiftStart: "2026-07-14T10:00:00.000Z",
    shiftEnd: "2026-07-14T14:00:00.000Z",
    shiftLocationId: "l1",
    authorizedLocationIds: ["l1"],
    recurringAvailability: [{ id: "r1", weekday: 2, type: "available", startsAt: "09:00", endsAt: "18:00", validFrom: "2026-01-01" }],
    rules,
    contractWeeklyMinutes: 1200,
    plannedWeekMinutes: 300,
    acceptsUrgentCoverage: true,
  });
  assert.equal(score.eligible, true);
  assert.equal(score.positiveFactors.includes("Disponibilidad declarada."), true);
});

test("ordena candidatos y deja bloqueados abajo", () => {
  const ranked = rankCandidates([
    { employeeId: "blocked", employeeStatus: "inactive", shiftStart: "2026-07-14T10:00:00.000Z", shiftEnd: "2026-07-14T14:00:00.000Z", shiftLocationId: "l1", authorizedLocationIds: ["l1"], rules },
    { employeeId: "ok", employeeStatus: "active", shiftStart: "2026-07-14T10:00:00.000Z", shiftEnd: "2026-07-14T14:00:00.000Z", shiftLocationId: "l1", authorizedLocationIds: ["l1"], rules },
  ]);
  assert.equal(ranked[0].employeeId, "ok");
});

test("bloquea respuesta duplicada u oferta cancelada", () => {
  assert.equal(canRespondToOffer({ offerStatus: "cancelled", response: "accepted" }).ok, false);
  assert.equal(canRespondToOffer({ offerStatus: "published", response: "accepted", alreadyResponded: true }).ok, false);
  assert.equal(canRespondToOffer({ offerStatus: "published", response: "accepted" }).ok, true);
});

test("crea idempotencia de notificación y sanea metadatos", () => {
  assert.equal(buildNotificationIdempotencyKey({ recipientEmployeeId: "e1", type: "coverage_offer", entityType: "offer", entityId: "o1", version: 2 }), "e1:coverage_offer:offer:o1:2");
  assert.deepEqual(prepareNotificationMetadata({ dni: "123", ok: true }), { dni: "[restricted]", ok: true });
});

test("genera diff de publicación de cuadrante", () => {
  const changes = diffScheduleVersions(
    [{ id: "s1", startsAt: "2026-07-14T10:00:00.000Z", endsAt: "2026-07-14T14:00:00.000Z", locationId: "l1", employeeId: "e1", roleName: "sala", status: "published" }],
    [{ id: "s1", startsAt: "2026-07-14T11:00:00.000Z", endsAt: "2026-07-14T15:00:00.000Z", locationId: "l1", employeeId: "e2", roleName: "sala", status: "published" }],
  );
  assert.equal(changes.some((change) => change.changeType === "time_changed"), true);
  assert.equal(changes.some((change) => change.changeType === "employee_replaced"), true);
});

test("sanea auditoría operativa", () => {
  assert.deepEqual(sanitizeOperationalMetadata({ diagnosis: "x", salary: "1000", note: "ok" }), { diagnosis: "[restricted]", salary: "[restricted]", note: "ok" });
});
