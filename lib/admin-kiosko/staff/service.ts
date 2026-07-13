import {
  calculateEntryWorkedSeconds,
  createStaffBreakEntry,
  createStaffShift,
  createStaffShiftAssignment,
  createStaffTimeIncident,
  createStaffWorkEntry,
  getOpenWorkEntry,
  listBreaksForWorkEntry,
  listStaffAssignments,
  listOpenBreaks,
  listPublishedShiftsForEmployee,
  listStaffShifts,
  patchStaffBreakEntry,
  patchStaffShift,
  patchStaffTimeIncident,
  patchStaffWorkEntry,
  writeStaffAuditLog,
  type StaffEmployee,
  type StaffShift,
  type StaffTimeIncident,
  type StaffWorkEntry,
} from "../repositories/staff.repository";
import {
  calculatePlannedMinutes,
  calculateWeeklyVariance,
  detectShiftConflicts,
  secondsBetween,
  toCsv,
} from "./time";

type DomainResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): DomainResult<never> {
  return { ok: false, error };
}

function isWithinShiftWindow(shift: StaffShift, now: Date) {
  const starts = new Date(shift.starts_at).getTime() - 6 * 60 * 60 * 1000;
  const ends = new Date(shift.ends_at).getTime() + 6 * 60 * 60 * 1000;
  return now.getTime() >= starts && now.getTime() <= ends;
}

export async function matchWorkEntryToShift(employeeId: string, now = new Date()) {
  const shifts = await listPublishedShiftsForEmployee(employeeId);
  if (!shifts.ok) return shifts;
  return {
    ok: true as const,
    data: shifts.data.find((shift) => isWithinShiftWindow(shift, now)) || null,
  };
}

export async function clockIn(input: {
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  employee: StaffEmployee;
  source: StaffWorkEntry["clock_in_source"];
  device?: string | null;
}) {
  if (input.employee.status !== "active") return fail("El empleado no está activo.");

  const openEntry = await getOpenWorkEntry(input.employee.id);
  if (!openEntry.ok) return openEntry;
  if (openEntry.data) return fail("Ya existe un fichaje abierto.");

  const matchedShift = await matchWorkEntryToShift(input.employee.id);
  if (!matchedShift.ok) return matchedShift;

  const entry = await createStaffWorkEntry({
    employeeId: input.employee.id,
    shiftId: matchedShift.data?.id || null,
    locationId: matchedShift.data?.location_id || input.employee.primary_location_id,
    source: input.source,
    device: input.device,
    status: matchedShift.data ? "open" : "pending_review",
  });
  if (!entry.ok) return entry;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.actorEmployeeId || input.employee.id,
    entityType: "staff_work_entry",
    entityId: entry.data.id,
    action: "clock_in",
    afterData: entry.data,
    metadata: { source: input.source, matchedShift: Boolean(matchedShift.data) },
  });

  if (!matchedShift.data) {
    await createStaffTimeIncident({
      employeeId: input.employee.id,
      workEntryId: entry.data.id,
      incidentType: "other",
      description: "Fichaje sin turno publicado asociado. Requiere revisión administrativa.",
      requestedChange: { reason: "no_published_shift_matched" },
    });
  }

  return entry;
}

export async function startBreak(input: {
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  employeeId: string;
  breakType?: string;
  paid?: boolean;
}) {
  const openEntry = await getOpenWorkEntry(input.employeeId);
  if (!openEntry.ok) return openEntry;
  if (!openEntry.data) return fail("No hay fichaje abierto.");

  const openBreaks = await listOpenBreaks(openEntry.data.id);
  if (!openBreaks.ok) return openBreaks;
  if (openBreaks.data.length) return fail("Ya existe una pausa abierta.");

  const created = await createStaffBreakEntry({
    workEntryId: openEntry.data.id,
    breakType: input.breakType || "rest",
    paid: input.paid || false,
  });
  if (!created.ok) return created;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.actorEmployeeId || input.employeeId,
    entityType: "staff_break_entry",
    entityId: created.data.id,
    action: "break_start",
    afterData: created.data,
  });

  return created;
}

export async function endBreak(input: {
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  employeeId: string;
}) {
  const openEntry = await getOpenWorkEntry(input.employeeId);
  if (!openEntry.ok) return openEntry;
  if (!openEntry.data) return fail("No hay fichaje abierto.");

  const openBreaks = await listOpenBreaks(openEntry.data.id);
  if (!openBreaks.ok) return openBreaks;
  const openBreak = openBreaks.data[0];
  if (!openBreak) return fail("No hay pausa abierta.");

  const endedAt = new Date().toISOString();
  const patched = await patchStaffBreakEntry(openBreak.id, {
    ended_at: endedAt,
    duration_seconds: secondsBetween(openBreak.started_at, endedAt),
  });
  if (!patched.ok) return patched;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.actorEmployeeId || input.employeeId,
    entityType: "staff_break_entry",
    entityId: patched.data.id,
    action: "break_end",
    beforeData: openBreak,
    afterData: patched.data,
  });

  return patched;
}

export async function clockOut(input: {
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  employeeId: string;
  source: StaffWorkEntry["clock_in_source"];
  device?: string | null;
}) {
  const openEntry = await getOpenWorkEntry(input.employeeId);
  if (!openEntry.ok) return openEntry;
  if (!openEntry.data) return fail("No hay fichaje abierto.");

  const openBreaks = await listOpenBreaks(openEntry.data.id);
  if (!openBreaks.ok) return openBreaks;
  if (openBreaks.data.length) return fail("No se puede fichar salida con una pausa abierta.");

  const breaks = await listBreaksForWorkEntry(openEntry.data.id);
  if (!breaks.ok) return breaks;

  const clockOutAt = new Date().toISOString();
  const workedSeconds = calculateEntryWorkedSeconds({ ...openEntry.data, clock_out_at: clockOutAt }, breaks.data);
  const patched = await patchStaffWorkEntry(openEntry.data.id, {
    clock_out_at: clockOutAt,
    clock_out_source: input.source,
    clock_out_device: input.device || null,
    worked_seconds: workedSeconds,
    status: openEntry.data.status === "pending_review" ? "pending_review" : "completed",
  });
  if (!patched.ok) return patched;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.actorEmployeeId || input.employeeId,
    entityType: "staff_work_entry",
    entityId: patched.data.id,
    action: "clock_out",
    beforeData: openEntry.data,
    afterData: patched.data,
    metadata: { source: input.source, workedSeconds },
  });

  return patched;
}

export async function createTimeIncident(input: {
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  employeeId: string;
  workEntryId?: string | null;
  shiftId?: string | null;
  incidentType: StaffTimeIncident["incident_type"];
  description: string;
  requestedChange?: Record<string, unknown>;
}) {
  const incident = await createStaffTimeIncident(input);
  if (!incident.ok) return incident;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.actorEmployeeId || input.employeeId,
    entityType: "staff_time_incident",
    entityId: incident.data.id,
    action: "incident_create",
    afterData: incident.data,
  });

  return incident;
}

export async function approveTimeCorrection(input: { actorUserId: string | null; incidentId: string; resolution: string }) {
  const patched = await patchStaffTimeIncident(input.incidentId, {
    status: "approved",
    resolution: input.resolution,
    resolved_by: input.actorUserId,
    resolved_at: new Date().toISOString(),
  });
  if (!patched.ok) return patched;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_time_incident",
    entityId: patched.data.id,
    action: "incident_approve",
    afterData: patched.data,
  });

  return patched;
}

export async function rejectTimeCorrection(input: { actorUserId: string | null; incidentId: string; resolution: string }) {
  const patched = await patchStaffTimeIncident(input.incidentId, {
    status: "rejected",
    resolution: input.resolution,
    resolved_by: input.actorUserId,
    resolved_at: new Date().toISOString(),
  });
  if (!patched.ok) return patched;

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_time_incident",
    entityId: patched.data.id,
    action: "incident_reject",
    afterData: patched.data,
  });

  return patched;
}

export async function publishSchedule(input: { actorUserId: string | null; shiftIds: string[] }) {
  const results = [];
  for (const shiftId of input.shiftIds) {
    const result = await patchStaffShift(shiftId, {
      status: "published",
      published_at: new Date().toISOString(),
      published_by: input.actorUserId,
    });
    if (!result.ok) return result;
    results.push(result.data);
    await writeStaffAuditLog({
      actorUserId: input.actorUserId,
      entityType: "staff_shift",
      entityId: shiftId,
      action: "shift_publish",
      afterData: result.data,
    });
  }
  return { ok: true as const, data: results };
}

export async function duplicateScheduleWeek(input: {
  actorUserId: string | null;
  fromDate: string;
  toDate: string;
  targetStartDate: string;
}) {
  const source = await listStaffShifts(input.fromDate, input.toDate);
  if (!source.ok) return source;
  const assignments = await listStaffAssignments();
  if (!assignments.ok) return assignments;
  const start = new Date(`${input.fromDate}T00:00:00.000Z`);
  const target = new Date(`${input.targetStartDate}T00:00:00.000Z`);
  const offsetMs = target.getTime() - start.getTime();
  const created = [];

  for (const shift of source.data) {
    const newStart = new Date(new Date(shift.starts_at).getTime() + offsetMs);
    const newEnd = new Date(new Date(shift.ends_at).getTime() + offsetMs);
    const newShiftDate = newStart.toISOString().slice(0, 10);
    const result = await createStaffShift({
      locationId: shift.location_id,
      templateId: shift.template_id,
      shiftDate: newShiftDate,
      startsAt: newStart.toISOString(),
      endsAt: newEnd.toISOString(),
      notes: shift.notes ? `Duplicado: ${shift.notes}` : "Duplicado de semana",
    });
    if (!result.ok) return result;
    created.push(result.data);
    const sourceAssignments = assignments.data.filter((assignment) => assignment.shift_id === shift.id);
    for (const assignment of sourceAssignments) {
      const assignmentResult = await createStaffShiftAssignment({
        shiftId: result.data.id,
        employeeId: assignment.employee_id,
        roleName: assignment.role_name,
      });
      if (!assignmentResult.ok) return assignmentResult;
    }
  }

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_shift",
    action: "schedule_duplicate_week",
    afterData: { count: created.length },
    metadata: input,
  });

  return { ok: true as const, data: created };
}

export { calculatePlannedMinutes, calculateWeeklyVariance, detectShiftConflicts };

export function buildWorkEntriesCsv(rows: Array<{
  employeeCode: string;
  name: string;
  location: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breaks: string;
  workedMinutes: number;
  plannedMinutes: number;
  variance: number;
  status: string;
  incidents: string;
}>) {
  return toCsv(
    ["código empleado", "nombre", "centro", "fecha", "entrada", "salida", "pausas", "minutos trabajados", "minutos planificados", "diferencia", "estado", "incidencias"],
    rows.map((row) => [
      row.employeeCode,
      row.name,
      row.location,
      row.date,
      row.clockIn,
      row.clockOut,
      row.breaks,
      row.workedMinutes,
      row.plannedMinutes,
      row.variance,
      row.status,
      row.incidents,
    ]),
  );
}

export function buildShiftsCsv(rows: Array<{
  employee: string;
  location: string;
  date: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
  status: string;
}>) {
  return toCsv(
    ["empleado", "centro", "fecha", "inicio", "fin", "minutos", "estado de publicación"],
    rows.map((row) => [row.employee, row.location, row.date, row.startsAt, row.endsAt, row.minutes, row.status]),
  );
}
