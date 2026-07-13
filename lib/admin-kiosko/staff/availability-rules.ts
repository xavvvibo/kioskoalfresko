import { rangesOverlap } from "./leave-rules.ts";

export type AvailabilityType = "available" | "unavailable" | "positive_preference" | "negative_preference";
export type RestrictionSeverity = "blocking" | "warning" | "informational";

export type OperationalRules = {
  minRestMinutes: number;
  maxDailyMinutes?: number | null;
  maxWeeklyMinutes?: number | null;
  maxConsecutiveDays?: number | null;
  overlapToleranceMinutes: number;
  minNoticeMinutes: number;
  additionalHoursLimitMinutes?: number | null;
};

export type AvailabilityWindow = {
  id: string;
  type: AvailabilityType;
  weekday?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  fullDay?: boolean;
  validFrom?: string;
  validUntil?: string | null;
  priority?: number;
};

export type AvailabilityException = {
  id: string;
  type: "available" | "unavailable";
  startsAt: string;
  endsAt: string;
  status: string;
};

export type CandidateRestriction = {
  code: string;
  severity: RestrictionSeverity;
  message: string;
  source: string;
  blocking: boolean;
};

export type CandidateInput = {
  employeeId: string;
  employeeStatus: string;
  shiftStart: string;
  shiftEnd: string;
  shiftLocationId?: string | null;
  authorizedLocationIds: string[];
  approvedAbsences?: Array<{ id: string; startsAt: string; endsAt: string }>;
  availabilityExceptions?: AvailabilityException[];
  recurringAvailability?: AvailabilityWindow[];
  assignedShifts?: Array<{ id: string; startsAt: string; endsAt: string }>;
  openWorkEntry?: { id: string; clockInAt: string } | null;
  contractWeeklyMinutes?: number | null;
  plannedWeekMinutes?: number;
  roleCompatible?: boolean;
  rules: OperationalRules;
};

export function weekdayInMadrid(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short" }).formatToParts(new Date(iso));
  const value = parts.find((part) => part.type === "weekday")?.value || "Mon";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value);
}

export function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

export function resolveAvailabilityForShift(input: {
  shiftStart: string;
  shiftEnd: string;
  recurring: AvailabilityWindow[];
  exceptions: AvailabilityException[];
}) {
  const activeException = input.exceptions
    .filter((item) => ["approved", "submitted"].includes(item.status))
    .find((item) => rangesOverlap(input.shiftStart, input.shiftEnd, item.startsAt, item.endsAt));
  if (activeException) return { source: "exception", type: activeException.type, id: activeException.id };

  const weekday = weekdayInMadrid(input.shiftStart);
  const shiftTime = input.shiftStart.slice(11, 16);
  const matching = input.recurring
    .filter((item) => item.weekday === weekday)
    .filter((item) => !item.validFrom || input.shiftStart.slice(0, 10) >= item.validFrom)
    .filter((item) => !item.validUntil || input.shiftStart.slice(0, 10) <= item.validUntil)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
  if (!matching) return { source: "none", type: "unknown" as const };
  if (matching.fullDay || (!matching.startsAt && !matching.endsAt)) return { source: "recurring", type: matching.type, id: matching.id };
  if (matching.startsAt && matching.endsAt && shiftTime >= matching.startsAt && shiftTime < matching.endsAt) {
    return { source: "recurring", type: matching.type, id: matching.id };
  }
  return { source: "recurring", type: matching.type === "unavailable" ? "unavailable" : "unknown", id: matching.id };
}

export function detectCandidateRestrictions(input: CandidateInput) {
  const restrictions: CandidateRestriction[] = [];
  if (input.employeeStatus !== "active") {
    restrictions.push({ code: "employee_inactive", severity: "blocking", message: "Empleado no activo.", source: "employee", blocking: true });
  }
  if (input.shiftLocationId && !input.authorizedLocationIds.includes(input.shiftLocationId)) {
    restrictions.push({ code: "location_not_authorized", severity: "blocking", message: "Centro no autorizado.", source: "location", blocking: true });
  }
  if (input.roleCompatible === false) {
    restrictions.push({ code: "role_incompatible", severity: "blocking", message: "Puesto no compatible.", source: "role", blocking: true });
  }
  for (const absence of input.approvedAbsences || []) {
    if (rangesOverlap(input.shiftStart, input.shiftEnd, absence.startsAt, absence.endsAt)) {
      restrictions.push({ code: "approved_absence", severity: "blocking", message: "Ausencia aprobada en el turno.", source: "absence", blocking: true });
    }
  }
  const availability = resolveAvailabilityForShift({
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    recurring: input.recurringAvailability || [],
    exceptions: input.availabilityExceptions || [],
  });
  if (availability.type === "unavailable") {
    restrictions.push({ code: "unavailable", severity: "blocking", message: "Indisponibilidad registrada.", source: availability.source, blocking: true });
  }
  for (const shift of input.assignedShifts || []) {
    if (rangesOverlap(input.shiftStart, input.shiftEnd, shift.startsAt, shift.endsAt)) {
      restrictions.push({ code: "shift_overlap", severity: "blocking", message: "Solapa con otro turno.", source: "shift", blocking: true });
    }
    const beforeRest = minutesBetween(shift.endsAt, input.shiftStart);
    const afterRest = minutesBetween(input.shiftEnd, shift.startsAt);
    if ((beforeRest > 0 && beforeRest < input.rules.minRestMinutes) || (afterRest > 0 && afterRest < input.rules.minRestMinutes)) {
      restrictions.push({ code: "insufficient_rest", severity: "warning", message: "Descanso inferior a la configuración.", source: "rules", blocking: false });
    }
  }
  if (input.openWorkEntry) {
    restrictions.push({ code: "open_work_entry", severity: "blocking", message: "Fichaje abierto incompatible.", source: "time", blocking: true });
  }
  const shiftMinutes = minutesBetween(input.shiftStart, input.shiftEnd);
  if (input.rules.maxDailyMinutes && shiftMinutes > input.rules.maxDailyMinutes) {
    restrictions.push({ code: "daily_limit", severity: "blocking", message: "Supera máximo diario configurado.", source: "rules", blocking: true });
  }
  if (input.rules.maxWeeklyMinutes && (input.plannedWeekMinutes || 0) + shiftMinutes > input.rules.maxWeeklyMinutes) {
    restrictions.push({ code: "weekly_limit", severity: "warning", message: "Supera máximo semanal configurado.", source: "rules", blocking: false });
  }
  if (input.contractWeeklyMinutes && (input.plannedWeekMinutes || 0) + shiftMinutes > input.contractWeeklyMinutes) {
    restrictions.push({ code: "contract_hours_warning", severity: "warning", message: "Supera horas contratadas semanales.", source: "contract", blocking: false });
  }
  const notice = minutesBetween(new Date().toISOString(), input.shiftStart);
  if (notice < input.rules.minNoticeMinutes) {
    restrictions.push({ code: "short_notice", severity: "warning", message: "Aviso inferior al configurado.", source: "rules", blocking: false });
  }
  return restrictions;
}

export function sanitizeOperationalMetadata(metadata: Record<string, unknown>) {
  const blocked = new Set(["diagnosis", "medicalDetails", "dni", "nss", "iban", "salary", "documentContent"]);
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, blocked.has(key) ? "[restricted]" : value]));
}
