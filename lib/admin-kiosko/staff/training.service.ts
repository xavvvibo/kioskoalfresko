import {
  createTimelineEvent,
  createTrainingAssignment,
  createTrainingCatalogItem,
} from "../repositories/staff-records.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import { isCertificateExpiring, isExpired, validateTrainingCertificate } from "./record-rules";

export function getTrainingAlert(status: string, expiresAt?: string | null, mandatory = false) {
  if (status === "expired" || isExpired(expiresAt)) return "Certificado caducado";
  if (isCertificateExpiring(expiresAt)) return "Certificado próximo a caducar";
  if (mandatory && status === "pending") return "Formación obligatoria pendiente";
  return null;
}

export async function createTrainingCatalogItemService(input: {
  actorUserId: string | null;
  organizationId?: string | null;
  category: string;
  name: string;
  provider?: string | null;
  mandatory?: boolean;
}) {
  const created = await createTrainingCatalogItem({
    organization_id: input.organizationId || null,
    category: input.category,
    name: input.name,
    provider: input.provider || null,
    mandatory: Boolean(input.mandatory),
    created_by: input.actorUserId,
  });
  if (!created.ok) return created;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_training_catalog",
    entityId: created.data.id,
    action: "training_catalog_create",
    afterData: created.data,
  });
  return created;
}

export async function assignTrainingToEmployee(input: {
  actorUserId: string | null;
  employeeId: string;
  trainingId?: string | null;
  status?: "pending" | "in_progress" | "completed" | "expired" | "cancelled";
  assignedAt?: string;
  completedAt?: string | null;
  expiresAt?: string | null;
  provider?: string | null;
  durationMinutes?: number | null;
  result?: string | null;
  notes?: string | null;
  certificateDocumentId?: string | null;
}) {
  const validation = validateTrainingCertificate({ completedAt: input.completedAt, expiresAt: input.expiresAt });
  if (validation) return { ok: false as const, error: validation };

  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return { ok: false as const, error: "Empleado sin organización." };

  const assignment = await createTrainingAssignment({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    training_id: input.trainingId || null,
    status: input.status || "pending",
    assigned_at: input.assignedAt || new Date().toISOString().slice(0, 10),
    completed_at: input.completedAt || null,
    expires_at: input.expiresAt || null,
    provider: input.provider || null,
    duration_minutes: input.durationMinutes || null,
    result: input.result || null,
    notes: input.notes || null,
    certificate_document_id: input.certificateDocumentId || null,
    created_by: input.actorUserId,
  });
  if (!assignment.ok) return assignment;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_training_assignment",
    entityId: assignment.data.id,
    action: "training_assign",
    afterData: assignment.data,
  });
  await createTimelineEvent({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    location_id: employee.data.primary_location_id,
    event_type: "training",
    title: "Formación asignada",
    description: input.notes || "Asignación de formación.",
    effective_at: new Date().toISOString(),
    actor_user_id: input.actorUserId,
    source: "staff_hr",
    entity_type: "staff_training_assignment",
    entity_id: assignment.data.id,
    metadata: { status: assignment.data.status },
    visible_to_employee: true,
    severity: assignment.data.status === "completed" ? "positive" : "info",
  });
  return assignment;
}
