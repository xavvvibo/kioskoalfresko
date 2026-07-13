export type LeaveUnit = "natural_days" | "working_days" | "hours";
export type LeaveAccrualMethod = "annual" | "monthly" | "proportional" | "manual";
export type LeaveRequestStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "cancelled" | "withdrawn" | "partially_approved";
export type ConflictSeverity = "blocking" | "warning" | "informational";

export type LeavePolicyRule = {
  annualAmount: number;
  unit: LeaveUnit;
  accrualMethod: LeaveAccrualMethod;
  prorateEnabled: boolean;
  carryoverEnabled: boolean;
  maxCarryover: number;
  negativeBalanceAllowed: boolean;
  negativeLimit: number;
  minNoticeDays: number;
  minDuration: number;
  maxDuration?: number | null;
  allowsHalfDays: boolean;
  allowsHours: boolean;
};

export type LeaveBalanceSnapshot = {
  openingBalance: number;
  accrued: number;
  consumed: number;
  reserved: number;
  adjusted: number;
  carriedOver: number;
  expired: number;
};

export type LeaveConflict = {
  code: string;
  severity: ConflictSeverity;
  message: string;
  referenceId?: string;
};

export const leaveTransitions: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "withdrawn", "approved", "rejected", "partially_approved"],
  under_review: ["approved", "rejected", "partially_approved", "draft"],
  approved: ["cancelled"],
  partially_approved: ["cancelled"],
  rejected: ["draft"],
  cancelled: [],
  withdrawn: ["draft"],
};

export function roundLeave(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function daysInclusive(start: string, end: string) {
  const startDate = new Date(`${start.slice(0, 10)}T00:00:00.000Z`);
  const endDate = new Date(`${end.slice(0, 10)}T00:00:00.000Z`);
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
}

export function daysInYear(year: number) {
  return new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365;
}

export function calculateProratedAnnualAccrual(input: {
  annualAmount: number;
  periodStart: string;
  periodEnd: string;
  employeeStart?: string | null;
  employeeEnd?: string | null;
}) {
  const periodDays = daysInclusive(input.periodStart, input.periodEnd);
  const effectiveStart = input.employeeStart && input.employeeStart > input.periodStart ? input.employeeStart : input.periodStart;
  const effectiveEnd = input.employeeEnd && input.employeeEnd < input.periodEnd ? input.employeeEnd : input.periodEnd;
  const activeDays = daysInclusive(effectiveStart, effectiveEnd);
  if (!periodDays || !activeDays) return 0;
  return roundLeave(input.annualAmount * (activeDays / periodDays));
}

export function calculateMonthlyAccrual(input: {
  annualAmount: number;
  monthsWorked: number;
}) {
  return roundLeave((input.annualAmount / 12) * Math.max(0, Math.min(12, input.monthsWorked)));
}

export function calculateCarryover(input: {
  available: number;
  enabled: boolean;
  maxCarryover: number;
}) {
  if (!input.enabled) return 0;
  return roundLeave(Math.max(0, Math.min(input.available, input.maxCarryover)));
}

export function calculateExpiration(input: {
  carriedOver: number;
  usedCarryover: number;
}) {
  return roundLeave(Math.max(0, input.carriedOver - input.usedCarryover));
}

export function calculateProjectedBalance(snapshot: LeaveBalanceSnapshot) {
  return roundLeave(
    snapshot.openingBalance
    + snapshot.accrued
    + snapshot.adjusted
    + snapshot.carriedOver
    - snapshot.consumed
    - snapshot.reserved
    - snapshot.expired,
  );
}

export function calculateAvailableAfterReservation(snapshot: LeaveBalanceSnapshot, requestedAmount: number) {
  return roundLeave(calculateProjectedBalance(snapshot) - requestedAmount);
}

export function assertLeaveTransition(current: LeaveRequestStatus, next: LeaveRequestStatus) {
  return current === next || leaveTransitions[current]?.includes(next) || false;
}

export function calculateRequestedAmount(input: {
  startsAt: string;
  endsAt: string;
  unit: LeaveUnit;
  hours?: number | null;
  partialMode?: "full_day" | "half_day" | "hours";
}) {
  if (input.unit === "hours") return roundLeave(input.hours || (new Date(input.endsAt).getTime() - new Date(input.startsAt).getTime()) / 3_600_000);
  const days = daysInclusive(input.startsAt, input.endsAt);
  if (input.partialMode === "half_day") return roundLeave(days * 0.5);
  return roundLeave(days);
}

export function detectLeaveConflicts(input: {
  requestStart: string;
  requestEnd: string;
  requestedAmount: number;
  availableBalance: number;
  negativeAllowed: boolean;
  negativeLimit: number;
  minNoticeDays: number;
  maxDuration?: number | null;
  existingAbsences?: Array<{ id: string; startsAt: string; endsAt: string; status: string }>;
  existingWorkEntries?: Array<{ id: string; startsAt: string; endsAt: string | null }>;
  publishedShifts?: Array<{ id: string; startsAt: string; endsAt: string }>;
  periodLocked?: boolean;
  hireDate?: string | null;
  terminationDate?: string | null;
}) {
  const conflicts: LeaveConflict[] = [];
  const starts = new Date(input.requestStart).getTime();
  const ends = new Date(input.requestEnd).getTime();
  if (ends <= starts) conflicts.push({ code: "invalid_dates", severity: "blocking", message: "La fecha de fin debe ser posterior." });
  if (input.periodLocked) conflicts.push({ code: "period_locked", severity: "blocking", message: "El periodo está bloqueado." });
  if (input.hireDate && input.requestStart.slice(0, 10) < input.hireDate) conflicts.push({ code: "before_hire", severity: "blocking", message: "La solicitud es anterior al alta." });
  if (input.terminationDate && input.requestEnd.slice(0, 10) > input.terminationDate) conflicts.push({ code: "after_termination", severity: "blocking", message: "La solicitud es posterior a la baja." });
  const balanceAfter = roundLeave(input.availableBalance - input.requestedAmount);
  if (balanceAfter < 0 && (!input.negativeAllowed || Math.abs(balanceAfter) > input.negativeLimit)) {
    conflicts.push({ code: "insufficient_balance", severity: "blocking", message: "Saldo insuficiente." });
  }
  const noticeDays = Math.floor((starts - Date.now()) / 86_400_000);
  if (noticeDays < input.minNoticeDays) conflicts.push({ code: "min_notice", severity: "warning", message: "Antelación inferior a la configurada." });
  if (input.maxDuration != null && input.requestedAmount > input.maxDuration) conflicts.push({ code: "max_duration", severity: "blocking", message: "Duración superior al máximo configurado." });
  for (const absence of input.existingAbsences || []) {
    if (["approved", "submitted", "under_review", "partially_approved"].includes(absence.status) && rangesOverlap(input.requestStart, input.requestEnd, absence.startsAt, absence.endsAt)) {
      conflicts.push({ code: "absence_overlap", severity: "blocking", message: "Solapa con otra ausencia.", referenceId: absence.id });
    }
  }
  for (const entry of input.existingWorkEntries || []) {
    if (entry.endsAt && rangesOverlap(input.requestStart, input.requestEnd, entry.startsAt, entry.endsAt)) {
      conflicts.push({ code: "work_entry_overlap", severity: "warning", message: "Solapa con fichajes existentes.", referenceId: entry.id });
    }
  }
  for (const shift of input.publishedShifts || []) {
    if (rangesOverlap(input.requestStart, input.requestEnd, shift.startsAt, shift.endsAt)) {
      conflicts.push({ code: "published_shift_affected", severity: "informational", message: "Hay turno publicado afectado.", referenceId: shift.id });
    }
  }
  return conflicts;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart).getTime() < new Date(bEnd).getTime()
    && new Date(bStart).getTime() < new Date(aEnd).getTime();
}

export function sanitizeLeaveAuditMetadata(metadata: Record<string, unknown>) {
  const blocked = new Set(["diagnosis", "medicalDetails", "dni", "nss", "iban", "salary"]);
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, blocked.has(key) ? "[restricted]" : value]));
}
