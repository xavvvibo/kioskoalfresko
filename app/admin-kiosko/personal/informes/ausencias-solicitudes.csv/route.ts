import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listLeaveRequests } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { listStaffEmployees, writeStaffAuditLog } from "@/lib/admin-kiosko/repositories/staff.repository";
import { toCsv } from "@/lib/admin-kiosko/staff/time";

export async function GET() {
  const session = await requireAdminPermission("staff:reports:export");
  const [employees, requests] = await Promise.all([listStaffEmployees(), listLeaveRequests()]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee]));
  const csv = toCsv(["empleado", "tipo", "inicio", "fin", "cantidad", "unidad", "estado", "resuelto"], (requests.ok ? requests.data : []).map((request) => [
    employeeById.get(request.employee_id)?.employee_code || request.employee_id,
    request.absence_type,
    request.starts_at,
    request.ends_at,
    request.requested_amount,
    request.requested_unit,
    request.status,
    request.resolved_at || "",
  ]));
  await writeStaffAuditLog({ actorUserId: session.id, action: "leave_requests_export", entityType: "staff_leave_request", metadata: { rows: requests.ok ? requests.data.length : 0 } });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=rrhh-solicitudes-ausencia.csv" } });
}
