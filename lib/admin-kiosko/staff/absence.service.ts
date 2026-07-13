import { createStaffAbsence, createTimelineEvent } from "../repositories/staff-records.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import { validateAbsence } from "./record-rules";

export async function createAbsenceRequest(input: {
  actorUserId: string | null;
  employeeId: string;
  absenceType: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  notes?: string | null;
  status?: "draft" | "requested" | "approved" | "rejected" | "cancelled";
  visibleToEmployee?: boolean;
}) {
  const validation = validateAbsence({ startsAt: input.startsAt, endsAt: input.endsAt });
  if (validation) return { ok: false as const, error: validation };
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return { ok: false as const, error: "Empleado sin organización." };

  const created = await createStaffAbsence({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    absence_type: input.absenceType,
    status: input.status || "requested",
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    reason: input.reason || null,
    notes: input.notes || null,
    requested_by: input.actorUserId,
    visible_to_employee: input.visibleToEmployee !== false,
  });
  if (!created.ok) return created;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_absence",
    entityId: created.data.id,
    action: "absence_create",
    afterData: { id: created.data.id, type: created.data.absence_type, status: created.data.status },
  });
  await createTimelineEvent({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    location_id: employee.data.primary_location_id,
    event_type: "absence",
    title: "Ausencia registrada",
    description: input.reason || "Solicitud o registro de ausencia.",
    effective_at: input.startsAt,
    actor_user_id: input.actorUserId,
    source: "staff_hr",
    entity_type: "staff_absence",
    entity_id: created.data.id,
    metadata: { status: created.data.status, type: created.data.absence_type },
    visible_to_employee: created.data.visible_to_employee,
    severity: "warning",
  });
  return created;
}
