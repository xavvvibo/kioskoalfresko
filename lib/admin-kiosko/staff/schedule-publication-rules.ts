export type ScheduleShiftSnapshot = {
  id: string;
  startsAt: string;
  endsAt: string;
  locationId: string;
  employeeId?: string | null;
  roleName?: string | null;
  status: string;
};

export type ScheduleDiffItem = {
  shiftId: string;
  changeType: "shift_created" | "shift_removed" | "time_changed" | "location_changed" | "employee_assigned" | "employee_unassigned" | "employee_replaced" | "role_changed" | "status_changed";
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export function diffScheduleVersions(previous: ScheduleShiftSnapshot[], next: ScheduleShiftSnapshot[]) {
  const changes: ScheduleDiffItem[] = [];
  const previousById = new Map(previous.map((shift) => [shift.id, shift]));
  const nextById = new Map(next.map((shift) => [shift.id, shift]));

  for (const shift of next) {
    const before = previousById.get(shift.id);
    if (!before) {
      changes.push({ shiftId: shift.id, changeType: "shift_created", before: {}, after: shift });
      continue;
    }
    if (before.startsAt !== shift.startsAt || before.endsAt !== shift.endsAt) {
      changes.push({ shiftId: shift.id, changeType: "time_changed", before: { startsAt: before.startsAt, endsAt: before.endsAt }, after: { startsAt: shift.startsAt, endsAt: shift.endsAt } });
    }
    if (before.locationId !== shift.locationId) {
      changes.push({ shiftId: shift.id, changeType: "location_changed", before: { locationId: before.locationId }, after: { locationId: shift.locationId } });
    }
    if (!before.employeeId && shift.employeeId) {
      changes.push({ shiftId: shift.id, changeType: "employee_assigned", before: { employeeId: null }, after: { employeeId: shift.employeeId } });
    } else if (before.employeeId && !shift.employeeId) {
      changes.push({ shiftId: shift.id, changeType: "employee_unassigned", before: { employeeId: before.employeeId }, after: { employeeId: null } });
    } else if (before.employeeId !== shift.employeeId) {
      changes.push({ shiftId: shift.id, changeType: "employee_replaced", before: { employeeId: before.employeeId }, after: { employeeId: shift.employeeId } });
    }
    if (before.roleName !== shift.roleName) {
      changes.push({ shiftId: shift.id, changeType: "role_changed", before: { roleName: before.roleName }, after: { roleName: shift.roleName } });
    }
    if (before.status !== shift.status) {
      changes.push({ shiftId: shift.id, changeType: "status_changed", before: { status: before.status }, after: { status: shift.status } });
    }
  }
  for (const shift of previous) {
    if (!nextById.has(shift.id)) changes.push({ shiftId: shift.id, changeType: "shift_removed", before: shift, after: {} });
  }
  return changes;
}
