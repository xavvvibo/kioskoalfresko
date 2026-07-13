import { createProcessTasks, createStaffProcess, listTemplateTasks, patchProcessTask, patchStaffProcess, type StaffProcessTask } from "../repositories/staff-process.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import { createTimelineEvent } from "../repositories/staff-records.repository";
import { calculateProcessProgress, canCompleteProcessTask, generateTasksFromTemplate, sanitizeProcessAuditMetadata, type StaffProcessType } from "./process-rules";

function fail(error: string) {
  return { ok: false as const, error };
}

export async function createProcessFromTemplate(input: {
  actorUserId: string | null;
  employeeId: string;
  processType: StaffProcessType;
  templateId?: string | null;
  templateVersion?: number | null;
  plannedDate: string;
  position?: string | null;
  roleName?: string | null;
  exitReason?: string | null;
}) {
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return fail("Empleado sin organización.");
  const employeeData = employee.data;
  const organizationId = employeeData.organization_id as string;
  const locationId = employeeData.primary_location_id || null;
  const process = await createStaffProcess({
    organization_id: organizationId,
    location_id: locationId,
    employee_id: input.employeeId,
    process_type: input.processType,
    position: input.position || null,
    role_name: input.roleName || null,
    planned_date: input.plannedDate,
    template_id: input.templateId || null,
    template_version: input.templateVersion || null,
    status: "planned",
    exit_reason: input.exitReason || null,
    created_by: input.actorUserId,
  });
  if (!process.ok) return process;
  if (input.templateId) {
    const templateTasks = await listTemplateTasks(input.templateId);
    if (!templateTasks.ok) return templateTasks;
    const generated = generateTasksFromTemplate({
      plannedDate: input.plannedDate,
      templateVersion: input.templateVersion || 1,
      tasks: templateTasks.data.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        taskType: task.task_type as never,
        dueOffsetDays: task.due_offset_days,
        mandatory: task.mandatory,
        blocking: task.blocking,
        requiresEvidence: task.requires_evidence,
        requiresDocument: task.requires_document,
        requiresSignature: task.requires_signature,
        requiresApproval: task.requires_approval,
        visibleToEmployee: task.visible_to_employee,
      })),
    });
    await createProcessTasks(generated.map((task) => ({
      process_id: process.data.id,
      organization_id: organizationId,
      employee_id: input.employeeId,
      template_task_id: task.id,
      template_version: task.templateVersion,
      title: task.title,
      description: task.description || null,
      task_type: task.taskType,
      due_at: task.dueAt,
      status: task.status,
      mandatory: task.mandatory,
      blocking: task.blocking,
      requires_evidence: task.requiresEvidence,
      requires_document: task.requiresDocument,
      requires_signature: task.requiresSignature,
      requires_approval: task.requiresApproval,
      visible_to_employee: task.visibleToEmployee,
    })));
  }
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_process",
    entityId: process.data.id,
    action: `${input.processType}.create`,
    afterData: { process_type: input.processType, status: "planned" },
    metadata: sanitizeProcessAuditMetadata({ templateId: input.templateId || null }),
  });
  await createTimelineEvent({
    organization_id: organizationId,
    employee_id: input.employeeId,
    location_id: locationId,
    event_type: `${input.processType}_started`,
    title: input.processType === "onboarding" ? "Inicio de incorporación" : "Inicio de salida",
    description: null,
    effective_at: input.plannedDate,
    actor_user_id: input.actorUserId,
    source: "staff_hr_phase_4",
    entity_type: "staff_process",
    entity_id: process.data.id,
    metadata: {},
    visible_to_employee: true,
    severity: "info",
  });
  return process;
}

export async function completeProcessTask(input: {
  actorUserId: string | null;
  task: StaffProcessTask;
  evidence?: Record<string, unknown>;
  documentId?: string | null;
  signatureId?: string | null;
  approved?: boolean;
  result?: string | null;
}) {
  const validation = canCompleteProcessTask({
    status: input.task.status,
    requiresEvidence: input.task.requires_evidence,
    requiresDocument: input.task.requires_document,
    requiresSignature: input.task.requires_signature,
    requiresApproval: input.task.requires_approval,
    evidence: input.evidence || input.task.evidence,
    documentId: input.documentId || input.task.document_id,
    signatureId: input.signatureId || input.task.signature_id,
    approved: input.approved,
  });
  if (!validation.ok) return fail(validation.missing.join(" "));
  const patched = await patchProcessTask(input.task.id, {
    status: "completed",
    evidence: input.evidence || input.task.evidence,
    document_id: input.documentId || input.task.document_id,
    signature_id: input.signatureId || input.task.signature_id,
    result: input.result || input.task.result,
    completed_by: input.actorUserId,
    completed_at: new Date().toISOString(),
    history: [...input.task.history, { at: new Date().toISOString(), action: "completed", actor: input.actorUserId }],
  });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.task.employee_id,
    entityType: "staff_process_task",
    entityId: input.task.id,
    action: "process_task.complete",
    afterData: { status: "completed", task_type: input.task.task_type },
    metadata: sanitizeProcessAuditMetadata({ hasEvidence: Boolean(input.evidence), hasDocument: Boolean(input.documentId), hasSignature: Boolean(input.signatureId) }),
  });
  return patched;
}

export async function refreshProcessProgress(input: { actorUserId: string | null; processId: string; tasks: StaffProcessTask[] }) {
  const progress = calculateProcessProgress(input.tasks);
  return patchStaffProcess(input.processId, {
    completion_percent: progress.percent,
    status: progress.status,
    blockers: progress.blockingPending ? [{ blockingPending: progress.blockingPending }] : [],
  });
}
