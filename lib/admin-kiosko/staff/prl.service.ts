import { writeStaffAuditLog } from "../repositories/staff.repository";
import type { StaffPrlRecord } from "../repositories/staff-compliance.repository";
import { sanitizeProcessAuditMetadata } from "./process-rules";

export function sanitizePrlRecord(record: StaffPrlRecord) {
  return {
    ...record,
    notes: record.record_type === "medical_fitness" ? null : record.notes,
  };
}

export async function auditPrlAction(input: { actorUserId: string | null; record: StaffPrlRecord; action: string }) {
  return writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.record.employee_id,
    entityType: "staff_prl_record",
    entityId: input.record.id,
    action: input.action,
    afterData: { record_type: input.record.record_type, status: input.record.status, medical_fitness_status: input.record.medical_fitness_status },
    metadata: sanitizeProcessAuditMetadata({ hasDocument: Boolean(input.record.document_id) }),
  });
}
