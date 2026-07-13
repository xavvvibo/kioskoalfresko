import { phase3Request } from "./staff-availability.repository";

export type ShiftVacancy = {
  id: string;
  organization_id: string;
  shift_id: string;
  location_id: string;
  role_name: string | null;
  vacancy_status: "draft" | "open" | "coverage_requested" | "covered" | "cancelled" | "expired";
  previous_assignment_id: string | null;
  reason: string | null;
  deadline_at: string | null;
  created_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CoverageRequest = {
  id: string;
  organization_id: string;
  shift_id: string | null;
  vacancy_id: string | null;
  location_id: string | null;
  reason: string;
  urgency: "low" | "normal" | "high" | "critical";
  deadline_at: string | null;
  status: "draft" | "open" | "notified" | "responses_received" | "assigned" | "expired" | "cancelled";
  assigned_employee_id: string | null;
  manager_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ShiftOffer = {
  id: string;
  organization_id: string;
  shift_id: string | null;
  coverage_request_id: string | null;
  location_id: string | null;
  title: string;
  role_name: string | null;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  deadline_at: string | null;
  status: "draft" | "published" | "closed" | "cancelled" | "expired" | "assigned";
  priority: "low" | "normal" | "high" | "urgent";
  created_by: string | null;
  assigned_employee_id: string | null;
  offer_version: number;
  history: Array<Record<string, unknown>>;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ShiftOfferRecipient = {
  id: string;
  offer_id: string;
  organization_id: string;
  employee_id: string;
  response: "pending" | "accepted" | "declined" | "interested" | "unavailable" | "expired";
  responded_at: string | null;
  comment: string | null;
  offer_version: number;
  shift_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CandidateScoreRecord = {
  id: string;
  organization_id: string;
  entity_type: "coverage_request" | "shift_offer" | "shift_change";
  entity_id: string;
  employee_id: string;
  eligible: boolean;
  score: number;
  blocking_reasons: string[];
  warnings: string[];
  positive_factors: string[];
  planned_minutes: number;
  contract_minutes: number | null;
  generated_at: string;
  idempotency_key: string;
};

export async function listShiftVacancies() {
  return phase3Request<ShiftVacancy[]>("admin_kiosko_staff_shift_vacancies", { method: "GET", query: "?select=*&order=created_at.desc" });
}

export async function createShiftVacancy(input: {
  organizationId: string;
  shiftId: string;
  locationId: string;
  roleName?: string | null;
  previousAssignmentId?: string | null;
  reason?: string | null;
  deadlineAt?: string | null;
  actorUserId?: string | null;
}) {
  const result = await phase3Request<ShiftVacancy[]>("admin_kiosko_staff_shift_vacancies", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      shift_id: input.shiftId,
      location_id: input.locationId,
      role_name: input.roleName || null,
      vacancy_status: "open",
      previous_assignment_id: input.previousAssignmentId || null,
      reason: input.reason || null,
      deadline_at: input.deadlineAt || null,
      created_by: input.actorUserId || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listCoverageRequests() {
  return phase3Request<CoverageRequest[]>("admin_kiosko_staff_coverage_requests", { method: "GET", query: "?select=*&order=created_at.desc" });
}

export async function createCoverageRequest(input: {
  organizationId: string;
  shiftId?: string | null;
  vacancyId?: string | null;
  locationId?: string | null;
  reason: string;
  urgency?: CoverageRequest["urgency"];
  deadlineAt?: string | null;
  actorUserId?: string | null;
}) {
  const result = await phase3Request<CoverageRequest[]>("admin_kiosko_staff_coverage_requests", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      shift_id: input.shiftId || null,
      vacancy_id: input.vacancyId || null,
      location_id: input.locationId || null,
      reason: input.reason,
      urgency: input.urgency || "normal",
      deadline_at: input.deadlineAt || null,
      status: "open",
      created_by: input.actorUserId || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listShiftOffers(employeeId?: string) {
  if (!employeeId) {
    return phase3Request<ShiftOffer[]>("admin_kiosko_staff_shift_offers", { method: "GET", query: "?select=*&order=starts_at.asc" });
  }
  const recipients = await listOfferRecipients(employeeId);
  if (!recipients.ok || !recipients.data.length) return { ok: true as const, data: [] as ShiftOffer[] };
  const offerIds = recipients.data.map((recipient) => recipient.offer_id).join(",");
  return phase3Request<ShiftOffer[]>("admin_kiosko_staff_shift_offers", {
    method: "GET",
    query: `?select=*&id=in.(${offerIds})&order=starts_at.asc`,
  });
}

export async function createShiftOffer(input: {
  organizationId: string;
  shiftId?: string | null;
  coverageRequestId?: string | null;
  locationId?: string | null;
  title: string;
  roleName?: string | null;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
  deadlineAt?: string | null;
  priority?: ShiftOffer["priority"];
  actorUserId?: string | null;
  idempotencyKey?: string | null;
}) {
  const result = await phase3Request<ShiftOffer[]>("admin_kiosko_staff_shift_offers", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      shift_id: input.shiftId || null,
      coverage_request_id: input.coverageRequestId || null,
      location_id: input.locationId || null,
      title: input.title,
      role_name: input.roleName || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      notes: input.notes || null,
      deadline_at: input.deadlineAt || null,
      status: "published",
      priority: input.priority || "normal",
      created_by: input.actorUserId || null,
      idempotency_key: input.idempotencyKey || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listOfferRecipients(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase3Request<ShiftOfferRecipient[]>("admin_kiosko_staff_shift_offer_recipients", {
    method: "GET",
    query: `?select=*${filter}&order=created_at.desc`,
  });
}

export async function upsertOfferRecipient(input: {
  offerId: string;
  organizationId: string;
  employeeId: string;
  response?: ShiftOfferRecipient["response"];
  comment?: string | null;
  offerVersion?: number;
  shiftSnapshot?: Record<string, unknown>;
}) {
  const result = await phase3Request<ShiftOfferRecipient[]>("admin_kiosko_staff_shift_offer_recipients", {
    method: "POST",
    query: "?on_conflict=offer_id,employee_id",
    body: JSON.stringify({
      offer_id: input.offerId,
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      response: input.response || "pending",
      responded_at: input.response && input.response !== "pending" ? new Date().toISOString() : null,
      comment: input.comment || null,
      offer_version: input.offerVersion || 1,
      shift_snapshot: input.shiftSnapshot || {},
    }),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listCandidateScores(entityType?: CandidateScoreRecord["entity_type"], entityId?: string) {
  const filter = entityType && entityId ? `&entity_type=eq.${entityType}&entity_id=eq.${encodeURIComponent(entityId)}` : "";
  return phase3Request<CandidateScoreRecord[]>("admin_kiosko_staff_candidate_scores", {
    method: "GET",
    query: `?select=*${filter}&order=score.desc`,
  });
}
