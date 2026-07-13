import { patchChecklistRun, type StaffChecklistRun } from "../repositories/staff-checklist.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { determineChecklistRunStatus, evaluateChecklistResult, type ChecklistItemRule } from "./checklist-rules";
import { sanitizeProcessAuditMetadata } from "./process-rules";

export function evaluateShiftChecklistItem(input: {
  item: ChecklistItemRule;
  valueText?: string | null;
  valueNumber?: number | null;
  evidence?: Record<string, unknown> | null;
}) {
  return evaluateChecklistResult(input);
}

export async function completeChecklistRun(input: {
  actorUserId: string | null;
  run: StaffChecklistRun;
  results: Array<{ passed: boolean | null; critical: boolean }>;
  evidence?: Record<string, unknown>;
}) {
  const status = determineChecklistRunStatus(input.results);
  const patched = await patchChecklistRun(input.run.id, {
    status,
    completed_at: new Date().toISOString(),
    evidence: input.evidence || input.run.evidence,
  });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.run.employee_id,
    entityType: "staff_checklist_run",
    entityId: input.run.id,
    action: `checklist.${status}`,
    afterData: { status, template_version: input.run.template_version },
    metadata: sanitizeProcessAuditMetadata({ resultCount: input.results.length }),
  });
  return patched;
}
