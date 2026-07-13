import { createDisciplinaryCase, createTimelineEvent } from "../repositories/staff-records.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";

export async function createDisciplinaryCaseService(input: {
  actorUserId: string | null;
  employeeId: string;
  caseType: string;
  title: string;
  facts: string;
  factsDate?: string | null;
  instructor?: string | null;
  visibleToEmployee?: boolean;
  signatureRequired?: boolean;
}) {
  if (!input.title.trim() || !input.facts.trim()) return { ok: false as const, error: "Faltan título o hechos." };
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return { ok: false as const, error: "Empleado sin organización." };

  const created = await createDisciplinaryCase({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    case_type: input.caseType,
    title: input.title.trim(),
    facts: input.facts.trim(),
    facts_date: input.factsDate || null,
    instructor: input.instructor || null,
    visible_to_employee: Boolean(input.visibleToEmployee),
    signature_required: Boolean(input.signatureRequired),
    created_by: input.actorUserId,
  });
  if (!created.ok) return created;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_disciplinary_case",
    entityId: created.data.id,
    action: "disciplinary_create",
    afterData: {
      id: created.data.id,
      employee_id: created.data.employee_id,
      case_type: created.data.case_type,
      status: created.data.status,
      confidentiality_level: created.data.confidentiality_level,
    },
  });
  await createTimelineEvent({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    location_id: employee.data.primary_location_id,
    event_type: "disciplinary",
    title: "Comunicación disciplinaria",
    description: created.data.visible_to_employee ? created.data.title : "Evento restringido de RRHH.",
    effective_at: new Date().toISOString(),
    actor_user_id: input.actorUserId,
    source: "staff_hr",
    entity_type: "staff_disciplinary_case",
    entity_id: created.data.id,
    metadata: { caseType: created.data.case_type, restricted: true },
    visible_to_employee: created.data.visible_to_employee,
    severity: "critical",
  });
  return created;
}
