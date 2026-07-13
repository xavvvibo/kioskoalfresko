import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import {
  listStaffEmployees,
  listStaffLocations,
  listStaffTimeIncidents,
  listStaffWorkEntries,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import { buildWorkEntriesCsv } from "@/lib/admin-kiosko/staff/service";

export async function GET() {
  await requireAdminPermission("staff:reports:export");
  const [employees, locations, entries, incidents] = await Promise.all([
    listStaffEmployees(),
    listStaffLocations(),
    listStaffWorkEntries(500),
    listStaffTimeIncidents(),
  ]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee]));
  const locationById = new Map((locations.ok ? locations.data : []).map((location) => [location.id, location]));
  const incidentCountByEntry = new Map<string, number>();
  if (incidents.ok) {
    for (const incident of incidents.data) {
      if (incident.work_entry_id) incidentCountByEntry.set(incident.work_entry_id, (incidentCountByEntry.get(incident.work_entry_id) || 0) + 1);
    }
  }

  const csv = buildWorkEntriesCsv((entries.ok ? entries.data : []).map((entry) => {
    const employee = employeeById.get(entry.employee_id);
    const location = entry.location_id ? locationById.get(entry.location_id) : null;
    return {
      employeeCode: employee?.employee_code || entry.employee_id,
      name: employee?.display_name || "Sin empleado",
      location: location?.name || "Sin centro",
      date: entry.clock_in_at.slice(0, 10),
      clockIn: entry.clock_in_at,
      clockOut: entry.clock_out_at || "",
      breaks: "",
      workedMinutes: Math.round((entry.worked_seconds || 0) / 60),
      plannedMinutes: 0,
      variance: Math.round((entry.worked_seconds || 0) / 60),
      status: entry.status,
      incidents: String(incidentCountByEntry.get(entry.id) || 0),
    };
  }));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=registro-horario-kiosko-alfresko.csv",
    },
  });
}
