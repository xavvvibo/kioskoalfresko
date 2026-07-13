import {
  createTimelineEvent,
  upsertStaffPrivateProfile,
  type StaffPrivateProfile,
} from "../repositories/staff-records.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import { buildSensitiveChangeMetadata, sanitizeAuditData } from "./sensitive";

export async function updateEmployeePrivateProfile(input: {
  actorUserId: string | null;
  employeeId: string;
  payload: Partial<StaffPrivateProfile>;
}) {
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data) return { ok: false as const, error: "Empleado no encontrado." };

  const payload = {
    ...input.payload,
    employee_id: input.employeeId,
    organization_id: employee.data.organization_id || input.payload.organization_id || null,
    updated_by: input.actorUserId,
  };
  const result = await upsertStaffPrivateProfile(payload);
  if (!result.ok) return result;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_private_profile",
    entityId: input.employeeId,
    action: "employee_profile_update",
    afterData: sanitizeAuditData(payload),
    metadata: buildSensitiveChangeMetadata(null, payload),
  });

  await createTimelineEvent({
    organization_id: employee.data.organization_id || null,
    employee_id: input.employeeId,
    location_id: employee.data.primary_location_id,
    event_type: "profile_update",
    title: "Perfil actualizado",
    description: "Se actualizó el expediente del empleado.",
    effective_at: new Date().toISOString(),
    actor_user_id: input.actorUserId,
    source: "staff_hr",
    entity_type: "staff_private_profile",
    entity_id: input.employeeId,
    metadata: { changedFields: Object.keys(input.payload) },
    visible_to_employee: false,
    severity: "info",
  });

  return result;
}
