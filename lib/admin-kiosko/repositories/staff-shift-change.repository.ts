import { phase3Request } from "./staff-availability.repository";

export type ShiftChangeRequestRecord = {
  id: string;
  organization_id: string;
  location_id: string | null;
  requester_employee_id: string;
  original_shift_id: string;
  request_type: "give_away" | "swap" | "release" | "change_time" | "change_location" | "request_cover";
  reason: string;
  notes: string | null;
  proposed_employee_id: string | null;
  proposed_shift_id: string | null;
  proposed_starts_at: string | null;
  proposed_ends_at: string | null;
  proposed_location_id: string | null;
  status: "draft" | "submitted" | "searching_candidate" | "candidate_proposed" | "candidate_accepted" | "pending_manager" | "approved" | "rejected" | "cancelled" | "expired" | "executed";
  deadline_at: string | null;
  requires_manager_approval: boolean;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  history: Array<Record<string, unknown>>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ShiftChangeParticipant = {
  id: string;
  request_id: string;
  organization_id: string;
  employee_id: string;
  role: "requester" | "candidate" | "manager";
  response: "pending" | "accepted" | "declined" | "cancelled" | "expired" | null;
  responded_at: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export async function listShiftChangeRequests(employeeId?: string) {
  const filter = employeeId ? `&or=(requester_employee_id.eq.${encodeURIComponent(employeeId)},proposed_employee_id.eq.${encodeURIComponent(employeeId)})` : "";
  return phase3Request<ShiftChangeRequestRecord[]>("admin_kiosko_staff_shift_change_requests", {
    method: "GET",
    query: `?select=*${filter}&order=created_at.desc`,
  });
}

export async function getShiftChangeRequestById(id: string) {
  const result = await phase3Request<ShiftChangeRequestRecord[]>("admin_kiosko_staff_shift_change_requests", {
    method: "GET",
    query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] || null };
}

export async function createShiftChangeRequest(input: {
  organizationId: string;
  locationId?: string | null;
  requesterEmployeeId: string;
  originalShiftId: string;
  requestType: ShiftChangeRequestRecord["request_type"];
  reason: string;
  notes?: string | null;
  proposedEmployeeId?: string | null;
  proposedShiftId?: string | null;
  deadlineAt?: string | null;
  actorUserId?: string | null;
}) {
  const result = await phase3Request<ShiftChangeRequestRecord[]>("admin_kiosko_staff_shift_change_requests", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      location_id: input.locationId || null,
      requester_employee_id: input.requesterEmployeeId,
      original_shift_id: input.originalShiftId,
      request_type: input.requestType,
      reason: input.reason,
      notes: input.notes || null,
      proposed_employee_id: input.proposedEmployeeId || null,
      proposed_shift_id: input.proposedShiftId || null,
      status: input.proposedEmployeeId ? "candidate_proposed" : "submitted",
      deadline_at: input.deadlineAt || null,
      created_by: input.actorUserId || null,
      updated_by: input.actorUserId || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchShiftChangeRequest(id: string, payload: Partial<ShiftChangeRequestRecord>) {
  const result = await phase3Request<ShiftChangeRequestRecord[]>("admin_kiosko_staff_shift_change_requests", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listShiftChangeParticipants(requestId?: string) {
  const filter = requestId ? `&request_id=eq.${encodeURIComponent(requestId)}` : "";
  return phase3Request<ShiftChangeParticipant[]>("admin_kiosko_staff_shift_change_participants", {
    method: "GET",
    query: `?select=*${filter}&order=created_at.asc`,
  });
}

export async function upsertShiftChangeParticipant(input: {
  requestId: string;
  organizationId: string;
  employeeId: string;
  role: ShiftChangeParticipant["role"];
  response?: ShiftChangeParticipant["response"];
  comment?: string | null;
}) {
  const result = await phase3Request<ShiftChangeParticipant[]>("admin_kiosko_staff_shift_change_participants", {
    method: "POST",
    query: "?on_conflict=request_id,employee_id,role",
    body: JSON.stringify({
      request_id: input.requestId,
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      role: input.role,
      response: input.response || "pending",
      responded_at: input.response && input.response !== "pending" ? new Date().toISOString() : null,
      comment: input.comment || null,
    }),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
