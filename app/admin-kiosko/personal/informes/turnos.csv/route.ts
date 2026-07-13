import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import {
  listStaffEmployees,
  listStaffAssignments,
  listStaffLocations,
  listStaffShifts,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import { buildShiftsCsv } from "@/lib/admin-kiosko/staff/service";
import { shiftDurationMinutes } from "@/lib/admin-kiosko/staff/time";

export async function GET() {
  await requireAdminPermission("staff:reports:export");
  const [employees, assignments, locations, shifts] = await Promise.all([
    listStaffEmployees(),
    listStaffAssignments(),
    listStaffLocations(),
    listStaffShifts(),
  ]);
  const locationById = new Map((locations.ok ? locations.data : []).map((location) => [location.id, location]));
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee]));
  const assignmentByShift = new Map((assignments.ok ? assignments.data : []).map((assignment) => [assignment.shift_id, assignment]));

  const csv = buildShiftsCsv((shifts.ok ? shifts.data : []).map((shift) => ({
    employee: employeeById.get(assignmentByShift.get(shift.id)?.employee_id || "")?.display_name || "Sin asignar",
    location: locationById.get(shift.location_id)?.name || "Sin centro",
    date: shift.shift_date,
    startsAt: shift.starts_at,
    endsAt: shift.ends_at,
    minutes: shiftDurationMinutes(shift),
    status: shift.status,
  })));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=turnos-kiosko-alfresko.csv",
    },
  });
}
