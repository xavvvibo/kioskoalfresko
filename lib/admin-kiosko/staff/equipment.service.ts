import { patchEquipmentAssignment, type StaffEquipmentAssignment } from "../repositories/staff-equipment.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { sanitizeProcessAuditMetadata } from "./process-rules";

export async function markEquipmentDelivered(input: { actorUserId: string | null; assignment: StaffEquipmentAssignment; signatureId?: string | null }) {
  const patched = await patchEquipmentAssignment(input.assignment.id, {
    status: "delivered",
    delivered_at: new Date().toISOString(),
    delivered_by: input.actorUserId,
    signature_id: input.signatureId || input.assignment.signature_id,
  });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.assignment.employee_id,
    entityType: "staff_equipment_assignment",
    entityId: input.assignment.id,
    action: "equipment.delivered",
    afterData: { item_name: input.assignment.item_name, status: "delivered" },
    metadata: sanitizeProcessAuditMetadata({ hasSignature: Boolean(input.signatureId) }),
  });
  return patched;
}

export async function markEquipmentReturned(input: { actorUserId: string | null; assignment: StaffEquipmentAssignment; returnStatus?: string | null }) {
  const patched = await patchEquipmentAssignment(input.assignment.id, {
    status: "returned",
    returned_at: new Date().toISOString(),
    return_status: input.returnStatus || "returned",
  });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.assignment.employee_id,
    entityType: "staff_equipment_assignment",
    entityId: input.assignment.id,
    action: "equipment.returned",
    afterData: { item_name: input.assignment.item_name, status: "returned" },
    metadata: sanitizeProcessAuditMetadata({ returnStatus: input.returnStatus || "returned" }),
  });
  return patched;
}
