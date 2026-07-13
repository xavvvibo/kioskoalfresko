import {
  createLeaveDecision,
  createLeaveRequest,
  createShiftAbsenceImpact,
  getLeavePolicyById,
  getLeaveRequestById,
  listLeaveBalancePeriods,
  listLeaveRequests,
  patchLeaveRequest,
  type LeaveRequest,
} from "../repositories/staff-leave.repository";
import { getStaffEmployeeById, listPublishedShiftsForEmployee, listStaffWorkEntries, writeStaffAuditLog } from "../repositories/staff.repository";
import { createTimelineEvent } from "../repositories/staff-records.repository";
import { getAvailableBalance, postLeaveLedgerMovement } from "./leave-balance.service";
import {
  assertLeaveTransition,
  calculateRequestedAmount,
  detectLeaveConflicts,
  roundLeave,
  sanitizeLeaveAuditMetadata,
} from "./leave-rules";

function fail(error: string) {
  return { ok: false as const, error };
}

export async function createEmployeeLeaveRequest(input: {
  actorUserId: string | null;
  employeeId: string;
  policyId: string;
  startsAt: string;
  endsAt: string;
  partialMode?: "full_day" | "half_day" | "hours";
  hours?: number | null;
  reason?: string | null;
  employeeNotes?: string | null;
  submit?: boolean;
}) {
  const [employee, policy] = await Promise.all([getStaffEmployeeById(input.employeeId), getLeavePolicyById(input.policyId)]);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return fail("Empleado sin organización.");
  if (!policy.ok) return policy;
  if (!policy.data || policy.data.organization_id !== employee.data.organization_id) return fail("Política no válida para el empleado.");
  const policyData = policy.data;

  const periods = await listLeaveBalancePeriods(input.employeeId);
  if (!periods.ok) return periods;
  const period = periods.data.find((item) => item.policy_id === policyData.id && item.status === "open");
  if (!period) return fail("No hay periodo de saldo abierto para esta política.");

  const requestedAmount = calculateRequestedAmount({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    unit: policyData.unit,
    hours: input.hours,
    partialMode: input.partialMode || "full_day",
  });
  const existingRequests = await listLeaveRequests({ employeeId: input.employeeId });
  if (!existingRequests.ok) return existingRequests;
  const shifts = await listPublishedShiftsForEmployee(input.employeeId);
  if (!shifts.ok) return shifts;
  const workEntries = await listStaffWorkEntries(500);
  if (!workEntries.ok) return workEntries;
  const conflicts = detectLeaveConflicts({
    requestStart: input.startsAt,
    requestEnd: input.endsAt,
    requestedAmount,
    availableBalance: getAvailableBalance(period),
    negativeAllowed: policyData.negative_balance_allowed,
    negativeLimit: policyData.negative_limit,
    minNoticeDays: policyData.min_notice_days,
    maxDuration: policyData.max_duration,
    existingAbsences: existingRequests.data.map((request) => ({ id: request.id, startsAt: request.starts_at, endsAt: request.ends_at, status: request.status })),
    existingWorkEntries: workEntries.data.filter((entry) => entry.employee_id === input.employeeId).map((entry) => ({ id: entry.id, startsAt: entry.clock_in_at, endsAt: entry.clock_out_at })),
    publishedShifts: shifts.data.map((shift) => ({ id: shift.id, startsAt: shift.starts_at, endsAt: shift.ends_at })),
    hireDate: employee.data.hire_date,
    terminationDate: employee.data.termination_date,
  });
  if (conflicts.some((conflict) => conflict.severity === "blocking")) {
    return fail(conflicts.filter((conflict) => conflict.severity === "blocking").map((conflict) => conflict.message).join(" "));
  }

  const created = await createLeaveRequest({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    location_id: employee.data.primary_location_id,
    policy_id: policyData.id,
    absence_type: policyData.absence_type,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    partial_mode: input.partialMode || "full_day",
    requested_amount: requestedAmount,
    requested_unit: policyData.unit,
    reason: input.reason || null,
    employee_notes: input.employeeNotes || null,
    status: input.submit ? "submitted" : "draft",
    submitted_at: input.submit ? new Date().toISOString() : null,
    conflict_summary: conflicts,
    created_by: input.actorUserId,
  });
  if (!created.ok) return created;

  if (input.submit && policyData.requires_approval) {
    await postLeaveLedgerMovement({
      actorUserId: input.actorUserId,
      period,
      policy: policyData,
      movementType: "reservation",
      amount: requestedAmount,
      effectiveOn: input.startsAt.slice(0, 10),
      source: "leave_request",
      referenceType: "staff_leave_request",
      referenceId: created.data.id,
      reason: "Reserva de saldo por solicitud enviada.",
      idempotencyKey: `reservation:${created.data.id}`,
      metadata: { conflictCount: conflicts.length },
    });
    await patchLeaveRequest(created.data.id, { reserved_amount: requestedAmount });
  }

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_leave_request",
    entityId: created.data.id,
    action: "leave_request_create",
    afterData: { id: created.data.id, status: created.data.status, requested_amount: requestedAmount },
    metadata: sanitizeLeaveAuditMetadata({ conflictCount: conflicts.length }),
  });
  return created;
}

export async function decideLeaveRequest(input: {
  actorUserId: string | null;
  requestId: string;
  decision: "approve" | "partially_approve" | "reject" | "request_documentation" | "return_to_draft" | "cancel_approval";
  comment: string;
  approvedStartsAt?: string | null;
  approvedEndsAt?: string | null;
  approvedAmount?: number | null;
}) {
  const request = await getLeaveRequestById(input.requestId);
  if (!request.ok) return request;
  if (!request.data) return fail("Solicitud no encontrada.");
  const requestData = request.data;
  const policy = await getLeavePolicyById(requestData.policy_id);
  if (!policy.ok || !policy.data) return fail("Política no encontrada.");
  const policyData = policy.data;
  const periods = await listLeaveBalancePeriods(requestData.employee_id);
  if (!periods.ok) return periods;
  const period = periods.data.find((item) => item.policy_id === requestData.policy_id && item.status === "open");
  if (!period) return fail("No hay periodo abierto.");

  const nextStatus = decisionToStatus(input.decision);
  if (!assertLeaveTransition(requestData.status, nextStatus)) return fail("Transición de estado no permitida.");
  const approvedAmount = roundLeave(input.approvedAmount ?? requestData.requested_amount);
  const patch: Partial<LeaveRequest> = {
    status: nextStatus,
    resolved_at: new Date().toISOString(),
    resolved_by: input.actorUserId,
    resolution_reason: input.comment,
  };
  if (nextStatus === "approved" || nextStatus === "partially_approved") {
    patch.approved_starts_at = input.approvedStartsAt || requestData.starts_at;
    patch.approved_ends_at = input.approvedEndsAt || requestData.ends_at;
    patch.approved_amount = approvedAmount;
    patch.consumed_amount = approvedAmount;
  }
  const updated = await patchLeaveRequest(requestData.id, patch);
  if (!updated.ok) return updated;

  await createLeaveDecision({
    request_id: requestData.id,
    organization_id: requestData.organization_id,
    decision: input.decision,
    approved_starts_at: patch.approved_starts_at || null,
    approved_ends_at: patch.approved_ends_at || null,
    approved_amount: patch.approved_amount || null,
    previous_status: requestData.status,
    next_status: nextStatus,
    comment: input.comment,
    actor_user_id: input.actorUserId,
  });

  if (nextStatus === "approved" || nextStatus === "partially_approved") {
    if (requestData.reserved_amount) {
      await postLeaveLedgerMovement({
        actorUserId: input.actorUserId,
        period,
        policy: policyData,
        movementType: "release",
        amount: requestData.reserved_amount,
        effectiveOn: requestData.starts_at.slice(0, 10),
        source: "leave_approval",
        referenceType: "staff_leave_request",
        referenceId: requestData.id,
        reason: "Liberación de reserva previa a consumo.",
        idempotencyKey: `release:${requestData.id}`,
      });
    }
    await postLeaveLedgerMovement({
      actorUserId: input.actorUserId,
      period,
      policy: policyData,
      movementType: "consumption",
      amount: approvedAmount,
      effectiveOn: (patch.approved_starts_at || requestData.starts_at).slice(0, 10),
      source: "leave_approval",
      referenceType: "staff_leave_request",
      referenceId: requestData.id,
      reason: input.comment,
      idempotencyKey: `consumption:${requestData.id}:${nextStatus}`,
    });
    await createShiftImpactProposals({ actorUserId: input.actorUserId, request: updated.data });
  }
  if (nextStatus === "rejected" && requestData.reserved_amount) {
    await postLeaveLedgerMovement({
      actorUserId: input.actorUserId,
      period,
      policy: policyData,
      movementType: "release",
      amount: requestData.reserved_amount,
      effectiveOn: requestData.starts_at.slice(0, 10),
      source: "leave_rejection",
      referenceType: "staff_leave_request",
      referenceId: requestData.id,
      reason: input.comment,
      idempotencyKey: `release-rejected:${requestData.id}`,
    });
  }

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_leave_request",
    entityId: requestData.id,
    action: `leave_request_${input.decision}`,
    beforeData: { status: requestData.status },
    afterData: { status: nextStatus, approvedAmount },
    metadata: sanitizeLeaveAuditMetadata({ comment: input.comment }),
  });
  await createTimelineEvent({
    organization_id: requestData.organization_id,
    employee_id: requestData.employee_id,
    location_id: requestData.location_id,
    event_type: "leave_request",
    title: "Solicitud de ausencia resuelta",
    description: nextStatus,
    effective_at: new Date().toISOString(),
    actor_user_id: input.actorUserId,
    source: "staff_hr",
    entity_type: "staff_leave_request",
    entity_id: requestData.id,
    metadata: { status: nextStatus },
    visible_to_employee: true,
    severity: nextStatus === "rejected" ? "warning" : "positive",
  });
  return updated;
}

function decisionToStatus(decision: string): LeaveRequest["status"] {
  if (decision === "approve") return "approved";
  if (decision === "partially_approve") return "partially_approved";
  if (decision === "reject") return "rejected";
  if (decision === "return_to_draft") return "draft";
  if (decision === "cancel_approval") return "cancelled";
  return "under_review";
}

async function createShiftImpactProposals(input: { actorUserId: string | null; request: LeaveRequest }) {
  const shifts = await listPublishedShiftsForEmployee(input.request.employee_id);
  if (!shifts.ok) return shifts;
  const affected = shifts.data.filter((shift) => new Date(shift.starts_at).getTime() < new Date(input.request.ends_at).getTime()
    && new Date(input.request.starts_at).getTime() < new Date(shift.ends_at).getTime());
  for (const shift of affected) {
    await createShiftAbsenceImpact({
      organization_id: input.request.organization_id,
      request_id: input.request.id,
      shift_id: shift.id,
      employee_id: input.request.employee_id,
      impact_type: "absence_overlap",
      proposed_action: "resolve_later",
      resolution_status: "pending",
      previous_data: { shift },
      after_data: {},
      reason: "Turno afectado por ausencia aprobada.",
      actor_user_id: input.actorUserId,
    });
  }
  return { ok: true as const, data: affected };
}
