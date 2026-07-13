import { createPayrollVariable } from "../repositories/staff-leave.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";

export async function createPayrollVariableService(input: {
  actorUserId: string | null;
  organizationId: string;
  employeeId: string;
  locationId?: string | null;
  periodStart: string;
  periodEnd: string;
  concept: string;
  quantity: number;
  unit: "hours" | "days" | "events";
  source?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
}) {
  if (input.quantity < 0) return { ok: false as const, error: "La cantidad no puede ser negativa." };
  const created = await createPayrollVariable({
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    location_id: input.locationId || null,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    concept: input.concept,
    quantity: input.quantity,
    unit: input.unit,
    source: input.source || "staff_hr",
    reference_type: input.referenceType || null,
    reference_id: input.referenceId || null,
    notes: input.notes || null,
    created_by: input.actorUserId,
  });
  if (!created.ok) return created;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_payroll_variable",
    entityId: created.data.id,
    action: "payroll_variable_create",
    afterData: { concept: created.data.concept, quantity: created.data.quantity, unit: created.data.unit, status: created.data.status },
  });
  return created;
}
