import {
  createShiftChangeRequest,
  getShiftChangeRequestById,
  listShiftChangeRequests,
  patchShiftChangeRequest,
  upsertShiftChangeParticipant,
} from "../repositories/staff-shift-change.repository";
import { getStaffEmployeeById, listPublishedShiftsForEmployee, writeStaffAuditLog } from "../repositories/staff.repository";
import { canTransitionShiftChange, detectActiveOperationConflict, isExpired, type ShiftChangeStatus, type ShiftChangeType } from "./shift-change-rules";
import { sanitizeOperationalMetadata } from "./availability-rules";

function fail(error: string) {
  return { ok: false as const, error };
}

export async function submitShiftChangeRequest(input: {
  actorUserId: string | null;
  employeeId: string;
  originalShiftId: string;
  requestType: ShiftChangeType;
  reason: string;
  notes?: string | null;
  proposedEmployeeId?: string | null;
  proposedShiftId?: string | null;
  deadlineAt?: string | null;
}) {
  if (input.reason.trim().length < 4) return fail("El motivo es obligatorio.");
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return fail("Empleado sin organización.");
  const shifts = await listPublishedShiftsForEmployee(input.employeeId);
  if (!shifts.ok) return shifts;
  const originalShift = shifts.data.find((shift) => shift.id === input.originalShiftId);
  if (!originalShift) return fail("El turno no está asignado o no está publicado.");
  const active = await listShiftChangeRequests();
  if (!active.ok) return active;
  const conflict = detectActiveOperationConflict({
    targetShiftIds: [input.originalShiftId, input.proposedShiftId].filter(Boolean) as string[],
    activeRequests: active.data.map((request) => ({
      id: request.id,
      originalShiftId: request.original_shift_id,
      proposedShiftId: request.proposed_shift_id,
      status: request.status,
    })),
  });
  if (conflict) return fail("Ya existe una operación activa sobre este turno.");
  const created = await createShiftChangeRequest({
    organizationId: employee.data.organization_id,
    locationId: originalShift.location_id,
    requesterEmployeeId: input.employeeId,
    originalShiftId: input.originalShiftId,
    requestType: input.requestType,
    reason: input.reason.trim(),
    notes: input.notes || null,
    proposedEmployeeId: input.proposedEmployeeId || null,
    proposedShiftId: input.proposedShiftId || null,
    deadlineAt: input.deadlineAt || null,
    actorUserId: input.actorUserId,
  });
  if (!created.ok) return created;
  await upsertShiftChangeParticipant({
    requestId: created.data.id,
    organizationId: employee.data.organization_id,
    employeeId: input.employeeId,
    role: "requester",
    response: "accepted",
  });
  if (input.proposedEmployeeId) {
    await upsertShiftChangeParticipant({
      requestId: created.data.id,
      organizationId: employee.data.organization_id,
      employeeId: input.proposedEmployeeId,
      role: "candidate",
      response: "pending",
    });
  }
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_shift_change_request",
    entityId: created.data.id,
    action: "shift_change.create",
    afterData: { request_type: input.requestType, status: created.data.status, original_shift_id: input.originalShiftId },
    metadata: sanitizeOperationalMetadata({ hasCandidate: Boolean(input.proposedEmployeeId) }),
  });
  return created;
}

export async function respondToShiftChange(input: {
  actorUserId: string | null;
  employeeId: string;
  requestId: string;
  response: "accepted" | "declined";
  comment?: string | null;
}) {
  const request = await getShiftChangeRequestById(input.requestId);
  if (!request.ok) return request;
  if (!request.data) return fail("Solicitud no encontrada.");
  if (request.data.proposed_employee_id !== input.employeeId && request.data.requester_employee_id !== input.employeeId) {
    return fail("No participas en esta solicitud.");
  }
  if (isExpired(request.data.deadline_at)) return fail("La solicitud ha expirado.");
  const participant = await upsertShiftChangeParticipant({
    requestId: input.requestId,
    organizationId: request.data.organization_id,
    employeeId: input.employeeId,
    role: request.data.requester_employee_id === input.employeeId ? "requester" : "candidate",
    response: input.response,
    comment: input.comment || null,
  });
  if (!participant.ok) return participant;
  const nextStatus: ShiftChangeStatus = input.response === "accepted" ? "candidate_accepted" : "rejected";
  if (canTransitionShiftChange(request.data.status, nextStatus)) {
    await patchShiftChangeRequest(input.requestId, {
      status: nextStatus,
      updated_by: input.actorUserId,
      history: [...request.data.history, { at: new Date().toISOString(), actor: input.employeeId, response: input.response }],
    });
  }
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_shift_change_request",
    entityId: input.requestId,
    action: `shift_change.${input.response}`,
    afterData: { response: input.response },
    metadata: sanitizeOperationalMetadata({ comment: input.comment || null }),
  });
  return participant;
}

export async function decideShiftChangeRequest(input: {
  actorUserId: string | null;
  requestId: string;
  decision: "approve" | "reject" | "cancel";
  resolution: string;
}) {
  const request = await getShiftChangeRequestById(input.requestId);
  if (!request.ok) return request;
  if (!request.data) return fail("Solicitud no encontrada.");
  const nextStatus: ShiftChangeStatus = input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "cancelled";
  if (!canTransitionShiftChange(request.data.status, nextStatus)) return fail("Transición no válida.");
  const patched = await patchShiftChangeRequest(input.requestId, {
    status: nextStatus,
    resolution: input.resolution,
    resolved_by: input.actorUserId,
    resolved_at: new Date().toISOString(),
    updated_by: input.actorUserId,
    history: [...request.data.history, { at: new Date().toISOString(), actor: input.actorUserId, decision: input.decision }],
  });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_shift_change_request",
    entityId: input.requestId,
    action: `shift_change.${input.decision}`,
    beforeData: { status: request.data.status },
    afterData: { status: nextStatus },
    metadata: sanitizeOperationalMetadata({ resolution: input.resolution }),
  });
  return patched;
}
