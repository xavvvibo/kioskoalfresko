import type { CandidateRestriction } from "./availability-rules.ts";

export type ShiftChangeType = "give_away" | "swap" | "release" | "change_time" | "change_location" | "request_cover";
export type ShiftChangeStatus =
  | "draft"
  | "submitted"
  | "searching_candidate"
  | "candidate_proposed"
  | "candidate_accepted"
  | "pending_manager"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "executed";

export const shiftChangeTransitions: Record<ShiftChangeStatus, ShiftChangeStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["searching_candidate", "candidate_proposed", "pending_manager", "rejected", "cancelled", "expired"],
  searching_candidate: ["candidate_proposed", "rejected", "cancelled", "expired"],
  candidate_proposed: ["candidate_accepted", "rejected", "cancelled", "expired"],
  candidate_accepted: ["pending_manager", "approved", "rejected", "cancelled", "expired"],
  pending_manager: ["approved", "rejected", "cancelled", "expired"],
  approved: ["executed", "cancelled"],
  rejected: [],
  cancelled: [],
  expired: [],
  executed: [],
};

export function canTransitionShiftChange(current: ShiftChangeStatus, next: ShiftChangeStatus) {
  return current === next || shiftChangeTransitions[current]?.includes(next) || false;
}

export function detectActiveOperationConflict(input: {
  targetShiftIds: string[];
  activeRequests: Array<{ id: string; originalShiftId: string; proposedShiftId?: string | null; status: ShiftChangeStatus }>;
  currentRequestId?: string | null;
}) {
  const activeStates = new Set<ShiftChangeStatus>(["submitted", "searching_candidate", "candidate_proposed", "candidate_accepted", "pending_manager", "approved"]);
  return input.activeRequests.find((request) => {
    if (request.id === input.currentRequestId || !activeStates.has(request.status)) return false;
    return input.targetShiftIds.includes(request.originalShiftId) || (request.proposedShiftId ? input.targetShiftIds.includes(request.proposedShiftId) : false);
  }) || null;
}

export function validateSwapReadiness(input: {
  requesterAccepted: boolean;
  candidateAccepted: boolean;
  managerApproved: boolean;
  requestExpired: boolean;
  originalRestrictions: CandidateRestriction[];
  candidateRestrictions: CandidateRestriction[];
}) {
  const blockers: string[] = [];
  if (!input.requesterAccepted) blockers.push("Falta aceptación del solicitante.");
  if (!input.candidateAccepted) blockers.push("Falta aceptación del candidato.");
  if (!input.managerApproved) blockers.push("Falta aprobación administrativa.");
  if (input.requestExpired) blockers.push("La solicitud ha expirado.");
  for (const restriction of [...input.originalRestrictions, ...input.candidateRestrictions]) {
    if (restriction.blocking) blockers.push(restriction.message);
  }
  return { ready: blockers.length === 0, blockers };
}

export function isExpired(deadlineAt?: string | null, now = new Date()) {
  return Boolean(deadlineAt && new Date(deadlineAt).getTime() < now.getTime());
}
