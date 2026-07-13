export type StaffClockSource = "employee_web" | "shared_kiosk" | "manager_assisted" | "system_import";
export type StaffWorkEntryStatus = "open" | "completed" | "pending_review" | "approved" | "locked";
export type StaffShiftStatus = "draft" | "published" | "cancelled" | "completed";

export type StaffBreakPeriod = {
  startedAt: string | Date;
  endedAt?: string | Date | null;
  paid?: boolean;
};

export type StaffWorkPeriod = {
  clockInAt: string | Date;
  clockOutAt?: string | Date | null;
  breaks?: StaffBreakPeriod[];
};

export type StaffShiftPeriod = {
  id?: string;
  employeeId?: string;
  locationId?: string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  starts_at?: string | Date;
  ends_at?: string | Date;
  status?: StaffShiftStatus;
};

export type ClockState = {
  hasOpenEntry: boolean;
  hasOpenBreak: boolean;
};

export function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function secondsBetween(start: string | Date, end: string | Date) {
  return Math.max(0, Math.floor((toDate(end).getTime() - toDate(start).getTime()) / 1000));
}

export function calculateBreakSeconds(breaks: StaffBreakPeriod[] = [], includePaid = false) {
  return breaks.reduce((total, item) => {
    if (!item.endedAt) return total;
    if (!includePaid && item.paid) return total;
    return total + secondsBetween(item.startedAt, item.endedAt);
  }, 0);
}

export function calculateWorkedSeconds(period: StaffWorkPeriod) {
  if (!period.clockOutAt) return 0;
  const gross = secondsBetween(period.clockInAt, period.clockOutAt);
  return Math.max(0, gross - calculateBreakSeconds(period.breaks || [], false));
}

export function hasOpenBreak(breaks: StaffBreakPeriod[] = []) {
  return breaks.some((item) => !item.endedAt);
}

export function canClockIn(state: ClockState) {
  return !state.hasOpenEntry;
}

export function canStartBreak(state: ClockState) {
  return state.hasOpenEntry && !state.hasOpenBreak;
}

export function canClockOut(state: ClockState) {
  return state.hasOpenEntry && !state.hasOpenBreak;
}

export function shiftDurationMinutes(shift: StaffShiftPeriod) {
  return Math.round(secondsBetween(shift.startsAt || shift.starts_at || new Date(), shift.endsAt || shift.ends_at || new Date()) / 60);
}

export function hasShiftOverlap(a: StaffShiftPeriod, b: StaffShiftPeriod) {
  const aStarts = a.startsAt || a.starts_at || new Date();
  const aEnds = a.endsAt || a.ends_at || new Date();
  const bStarts = b.startsAt || b.starts_at || new Date();
  const bEnds = b.endsAt || b.ends_at || new Date();
  return toDate(aStarts).getTime() < toDate(bEnds).getTime()
    && toDate(bStarts).getTime() < toDate(aEnds).getTime();
}

export function detectShiftConflicts(shifts: StaffShiftPeriod[]) {
  const conflicts: Array<{ first: StaffShiftPeriod; second: StaffShiftPeriod }> = [];
  const sorted = [...shifts].sort((a, b) => {
    const aStarts = a.startsAt || a.starts_at || new Date();
    const bStarts = b.startsAt || b.starts_at || new Date();
    return toDate(aStarts).getTime() - toDate(bStarts).getTime();
  });

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
      const next = sorted[nextIndex];
      if (current.employeeId && next.employeeId && current.employeeId !== next.employeeId) continue;
      if (!hasShiftOverlap(current, next)) break;
      conflicts.push({ first: current, second: next });
    }
  }

  return conflicts;
}

export function visiblePublishedShifts<T extends StaffShiftPeriod>(employeeId: string, shifts: T[]) {
  return shifts.filter((shift) => shift.employeeId === employeeId && shift.status === "published");
}

export function filterByLocation<T extends { locationId?: string }>(locationId: string, rows: T[]) {
  return rows.filter((row) => row.locationId === locationId);
}

export function calculatePlannedMinutes(shifts: StaffShiftPeriod[]) {
  return shifts.reduce((total, shift) => total + shiftDurationMinutes(shift), 0);
}

export function calculateWorkedMinutes(entries: Array<{ workedSeconds?: number | null }>) {
  return Math.round(entries.reduce((total, entry) => total + (entry.workedSeconds || 0), 0) / 60);
}

export function calculateWeeklyVariance(input: {
  plannedMinutes: number;
  workedMinutes: number;
  contractedMinutes?: number | null;
}) {
  return {
    plannedVsWorkedMinutes: input.workedMinutes - input.plannedMinutes,
    plannedVsContractMinutes: input.contractedMinutes == null ? null : input.plannedMinutes - input.contractedMinutes,
  };
}

export function buildAuditEvent(input: {
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    actor_user_id: input.actorUserId || null,
    actor_employee_id: input.actorEmployeeId || null,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    action: input.action,
    before_data: input.beforeData || null,
    after_data: input.afterData || null,
    metadata: input.metadata || {},
  };
}

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r;]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>) {
  return [
    headers.map(csvEscape).join(";"),
    ...rows.map((row) => row.map(csvEscape).join(";")),
  ].join("\n");
}
