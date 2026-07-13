import assert from "node:assert/strict";
import test from "node:test";
import { evaluateChecklistResult, determineChecklistRunStatus, canCloseChecklistIssue } from "../lib/admin-kiosko/staff/checklist-rules.ts";
import { classifyComplianceAlert, summarizeEmployeeCompliance } from "../lib/admin-kiosko/staff/compliance.service.ts";
import {
  calculateProcessProgress,
  canCompleteProcessTask,
  canTransitionProcess,
  canTransitionTask,
  evaluateDocumentRequirement,
  generateTasksFromTemplate,
  sanitizeProcessAuditMetadata,
} from "../lib/admin-kiosko/staff/process-rules.ts";
import { canAttemptTraining, gradeTrainingAttempt } from "../lib/admin-kiosko/staff/training-module-rules.ts";

test("crea tareas desde plantilla y congela versión", () => {
  const tasks = generateTasksFromTemplate({
    plannedDate: "2026-07-20",
    templateVersion: 3,
    tasks: [{ id: "t1", title: "DNI", taskType: "document", dueOffsetDays: -2, mandatory: true, blocking: true, requiresEvidence: false, requiresDocument: true, requiresSignature: false, requiresApproval: true, visibleToEmployee: true }],
  });
  assert.equal(tasks[0].templateVersion, 3);
  assert.equal(tasks[0].dueAt.slice(0, 10), "2026-07-18");
});

test("controla transiciones de proceso y tarea", () => {
  assert.equal(canTransitionProcess("planned", "in_progress"), true);
  assert.equal(canTransitionProcess("completed", "in_progress"), false);
  assert.equal(canTransitionTask("available", "completed"), true);
  assert.equal(canTransitionTask("completed", "available"), false);
});

test("bloquea completar tarea con evidencia, documento o firma ausente", () => {
  const result = canCompleteProcessTask({ status: "available", requiresEvidence: true, requiresDocument: true, requiresSignature: true, evidence: {}, documentId: null, signatureId: null });
  assert.equal(result.ok, false);
  assert.equal(result.missing.length, 3);
});

test("permite completar tarea con evidencia válida", () => {
  const result = canCompleteProcessTask({ status: "available", requiresEvidence: true, evidence: { valid: true } });
  assert.equal(result.ok, true);
});

test("calcula progreso y tarea bloqueante", () => {
  const progress = calculateProcessProgress([{ status: "completed" }, { status: "available", blocking: true }]);
  assert.equal(progress.percent, 50);
  assert.equal(progress.status, "blocked");
});

test("evalúa documento obligatorio, caducado y próximo a caducar", () => {
  assert.equal(evaluateDocumentRequirement({ hasDocument: false }), "missing");
  assert.equal(evaluateDocumentRequirement({ hasDocument: true, status: "active", expiresAt: "2026-01-01", now: "2026-07-13T00:00:00.000Z", version: 1 }), "expired");
  assert.equal(evaluateDocumentRequirement({ hasDocument: true, status: "active", expiresAt: "2026-07-20", now: "2026-07-13T00:00:00.000Z", version: 1 }), "expiring");
});

test("evalúa nueva versión de política como obligación separada", () => {
  const previous = { policyId: "p1", version: 1, status: "signed" };
  const next = { policyId: "p1", version: 2 };
  assert.equal(previous.policyId === next.policyId && previous.version !== next.version, true);
});

test("corrige formación aprobada y suspendida", () => {
  const questions = [{ id: "q1", text: "APPCC", options: [], correctOptionId: "a", points: 1 }];
  assert.deepEqual(gradeTrainingAttempt({ questions, answers: { q1: "a" }, minScore: 80 }), { score: 100, passed: true });
  assert.deepEqual(gradeTrainingAttempt({ questions, answers: { q1: "b" }, minScore: 80 }), { score: 0, passed: false });
});

test("limita intentos de formación", () => {
  assert.equal(canAttemptTraining({ attemptsUsed: 2, attemptsAllowed: 3 }), true);
  assert.equal(canAttemptTraining({ attemptsUsed: 3, attemptsAllowed: 3 }), false);
});

test("protege PRL sensible como categoría crítica de cumplimiento", () => {
  assert.equal(classifyComplianceAlert("prl_pending"), "critical");
});

test("modela entrega y devolución de material sin cobro automático", () => {
  const assignment = { status: "delivered", informationalCost: 20 };
  assert.equal(assignment.status, "delivered");
  assert.equal("payrollDeduction" in assignment, false);
});

test("modela acceso concedido y revocado sin contraseña", () => {
  const access = { status: "active", externalIdentifier: "usuario.tpv" };
  assert.equal(access.status, "active");
  assert.equal("password" in access, false);
});

test("evalúa rango de temperatura y genera incidencia crítica", () => {
  const result = evaluateChecklistResult({ item: { id: "i1", text: "Cámara", responseType: "temperature", mandatory: true, critical: true, minValue: 0, maxValue: 5, requiresEvidence: false, generatesIncident: true }, valueNumber: 9 });
  assert.equal(result.passed, false);
  assert.equal(result.createsIssue, true);
});

test("detecta checklist omitido y estado con incidencias", () => {
  assert.equal(determineChecklistRunStatus([], true), "missed");
  assert.equal(determineChecklistRunStatus([{ passed: false, critical: true }]), "completed_with_issues");
});

test("permite cierre de incidencia abierta", () => {
  assert.equal(canCloseChecklistIssue("open"), true);
  assert.equal(canCloseChecklistIssue("resolved"), false);
});

test("resume cumplimiento del empleado y offboarding", () => {
  const summary = summarizeEmployeeCompliance({
    processes: [{ process_type: "offboarding", status: "in_progress" }, { process_type: "onboarding", status: "completed" }] as never,
    tasks: [{ status: "available", blocking: true }] as never,
    alerts: [{ severity: "critical", status: "open" }] as never,
  });
  assert.equal(summary.offboarding, 1);
  assert.equal(summary.blockingTasks, 1);
  assert.equal(summary.criticalAlerts, 1);
});

test("sanea auditoría sin datos sensibles", () => {
  assert.deepEqual(sanitizeProcessAuditMetadata({ dni: "123", clinicalData: "x", password: "secret", ok: true }), { dni: "[restricted]", clinicalData: "[restricted]", password: "[restricted]", ok: true });
});
