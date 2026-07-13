import { patchAccessAssignment, type StaffAccessAssignment } from "../repositories/staff-equipment.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { sanitizeProcessAuditMetadata } from "./process-rules";

export async function updateOperationalAccess(input: {
  actorUserId: string | null;
  assignment: StaffAccessAssignment;
  status: StaffAccessAssignment["status"];
  externalIdentifier?: string | null;
}) {
  const now = new Date().toISOString();
  const patched = await patchAccessAssignment(input.assignment.id, {
    status: input.status,
    requested_at: input.status === "requested" ? now : input.assignment.requested_at,
    granted_at: input.status === "active" ? now : input.assignment.granted_at,
    revoked_at: input.status === "revoked" ? now : input.assignment.revoked_at,
    external_identifier: input.externalIdentifier || input.assignment.external_identifier,
  });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.assignment.employee_id,
    entityType: "staff_access_assignment",
    entityId: input.assignment.id,
    action: `access.${input.status}`,
    afterData: { access_type: input.assignment.access_type, status: input.status },
    metadata: sanitizeProcessAuditMetadata({ externalIdentifier: Boolean(input.externalIdentifier) }),
  });
  return patched;
}
