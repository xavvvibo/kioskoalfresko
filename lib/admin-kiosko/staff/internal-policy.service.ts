import { patchPolicyAssignment, type StaffPolicyAssignment } from "../repositories/staff-compliance.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { notifyEmployee } from "./notification.service";
import { sanitizeProcessAuditMetadata } from "./process-rules";

export async function acknowledgePolicy(input: {
  actorUserId: string | null;
  assignment: StaffPolicyAssignment;
  signatureId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  confirmedText: string;
}) {
  const status = input.signatureId ? "signed" : "acknowledged";
  const patched = await patchPolicyAssignment(input.assignment.id, {
    status,
    read_at: input.assignment.read_at || new Date().toISOString(),
    acknowledged_at: new Date().toISOString(),
    signature_id: input.signatureId || input.assignment.signature_id,
    ip_address: input.ipAddress || null,
    user_agent: input.userAgent || null,
    confirmed_text: input.confirmedText,
  });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.assignment.employee_id,
    entityType: "staff_policy_assignment",
    entityId: input.assignment.id,
    action: `policy.${status}`,
    afterData: { status, policy_version: input.assignment.policy_version },
    metadata: sanitizeProcessAuditMetadata({ hasSignature: Boolean(input.signatureId) }),
  });
  return patched;
}

export async function notifyPolicyRequired(input: {
  actorUserId: string | null;
  organizationId: string;
  employeeId: string;
  assignmentId: string;
  title: string;
}) {
  return notifyEmployee({
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    recipientEmployeeId: input.employeeId,
    type: "generic",
    title: "Política pendiente",
    message: input.title,
    entityType: "staff_policy_assignment",
    entityId: input.assignmentId,
    metadata: { phase4Type: "policy_acknowledgement_required" },
  });
}
