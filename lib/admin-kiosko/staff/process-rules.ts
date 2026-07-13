export type StaffProcessType = "onboarding" | "offboarding";
export type StaffProcessStatus = "draft" | "planned" | "in_progress" | "blocked" | "ready" | "completed" | "cancelled";
export type StaffProcessTaskStatus = "pending" | "available" | "in_progress" | "waiting_employee" | "waiting_manager" | "blocked" | "completed" | "waived" | "cancelled" | "expired";
export type StaffProcessTaskType = "administrative" | "document" | "signature" | "training" | "access" | "equipment" | "uniform" | "prl" | "appcc" | "meeting" | "checklist" | "custom";

export type ProcessTemplateTaskRule = {
  id: string;
  title: string;
  description?: string | null;
  taskType: StaffProcessTaskType;
  dueOffsetDays: number;
  mandatory: boolean;
  blocking: boolean;
  requiresEvidence: boolean;
  requiresDocument: boolean;
  requiresSignature: boolean;
  requiresApproval: boolean;
  visibleToEmployee: boolean;
};

export type GeneratedProcessTask = ProcessTemplateTaskRule & {
  dueAt: string;
  status: StaffProcessTaskStatus;
  templateVersion: number;
};

export const processTransitions: Record<StaffProcessStatus, StaffProcessStatus[]> = {
  draft: ["planned", "cancelled"],
  planned: ["in_progress", "blocked", "cancelled"],
  in_progress: ["blocked", "ready", "completed", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  ready: ["completed", "in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

export const taskTransitions: Record<StaffProcessTaskStatus, StaffProcessTaskStatus[]> = {
  pending: ["available", "blocked", "cancelled", "expired"],
  available: ["in_progress", "waiting_employee", "waiting_manager", "blocked", "completed", "waived", "cancelled", "expired"],
  in_progress: ["waiting_employee", "waiting_manager", "blocked", "completed", "waived", "cancelled", "expired"],
  waiting_employee: ["in_progress", "blocked", "completed", "cancelled", "expired"],
  waiting_manager: ["in_progress", "blocked", "completed", "cancelled", "expired"],
  blocked: ["available", "in_progress", "waived", "cancelled"],
  completed: [],
  waived: [],
  cancelled: [],
  expired: ["available", "waived", "cancelled"],
};

export function canTransitionProcess(current: StaffProcessStatus, next: StaffProcessStatus) {
  return current === next || processTransitions[current]?.includes(next) || false;
}

export function canTransitionTask(current: StaffProcessTaskStatus, next: StaffProcessTaskStatus) {
  return current === next || taskTransitions[current]?.includes(next) || false;
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date.slice(0, 10)}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

export function generateTasksFromTemplate(input: {
  plannedDate: string;
  templateVersion: number;
  tasks: ProcessTemplateTaskRule[];
}) {
  return input.tasks
    .slice()
    .sort((a, b) => a.dueOffsetDays - b.dueOffsetDays)
    .map((task) => ({
      ...task,
      dueAt: addDays(input.plannedDate, task.dueOffsetDays),
      status: "available" as const,
      templateVersion: input.templateVersion,
    }));
}

export function canCompleteProcessTask(input: {
  status: StaffProcessTaskStatus;
  requiresEvidence?: boolean;
  requiresDocument?: boolean;
  requiresSignature?: boolean;
  requiresApproval?: boolean;
  evidence?: Record<string, unknown> | null;
  documentId?: string | null;
  signatureId?: string | null;
  approved?: boolean;
}) {
  const missing: string[] = [];
  if (!canTransitionTask(input.status, "completed")) missing.push("Transición no válida.");
  if (input.requiresEvidence && !input.evidence?.valid) missing.push("Falta evidencia válida.");
  if (input.requiresDocument && !input.documentId) missing.push("Falta documento requerido.");
  if (input.requiresSignature && !input.signatureId) missing.push("Falta firma requerida.");
  if (input.requiresApproval && !input.approved) missing.push("Falta aprobación.");
  return { ok: missing.length === 0, missing };
}

export function calculateProcessProgress(tasks: Array<{ status: StaffProcessTaskStatus; blocking?: boolean }>) {
  if (!tasks.length) return { percent: 0, total: 0, completed: 0, pending: 0, blockingPending: 0, status: "draft" as StaffProcessStatus };
  const completed = tasks.filter((task) => ["completed", "waived"].includes(task.status)).length;
  const blockingPending = tasks.filter((task) => task.blocking && !["completed", "waived", "cancelled"].includes(task.status)).length;
  const percent = Math.round((completed / tasks.length) * 10000) / 100;
  return {
    percent,
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    blockingPending,
    status: blockingPending ? "blocked" as const : completed === tasks.length ? "ready" as const : "in_progress" as const,
  };
}

export function evaluateDocumentRequirement(input: {
  hasDocument: boolean;
  status?: string | null;
  expiresAt?: string | null;
  minimumVersion?: number;
  version?: number | null;
  now?: string;
}) {
  if (!input.hasDocument) return "missing";
  if (input.status === "rejected") return "rejected";
  if (input.status === "replaced") return "superseded";
  if (input.status !== "active") return "pending_validation";
  if ((input.version || 0) < (input.minimumVersion || 1)) return "superseded";
  if (input.expiresAt) {
    const now = new Date(input.now || new Date().toISOString()).getTime();
    const expires = new Date(`${input.expiresAt}T00:00:00.000Z`).getTime();
    if (expires < now) return "expired";
    if (expires - now <= 30 * 86_400_000) return "expiring";
  }
  return "valid";
}

export function sanitizeProcessAuditMetadata(metadata: Record<string, unknown>) {
  const blocked = new Set(["diagnosis", "medicalDetails", "clinicalData", "dni", "nss", "iban", "salary", "documentContent", "password"]);
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, blocked.has(key) ? "[restricted]" : value]));
}
