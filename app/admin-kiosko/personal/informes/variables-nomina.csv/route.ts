import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listPayrollVariables } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { writeStaffAuditLog } from "@/lib/admin-kiosko/repositories/staff.repository";
import { toCsv } from "@/lib/admin-kiosko/staff/time";

export async function GET() {
  const session = await requireAdminPermission("staff:payroll-variable:export");
  const variables = await listPayrollVariables();
  const csv = toCsv(["empleado", "periodo inicio", "periodo fin", "concepto", "cantidad", "unidad", "estado", "origen"], (variables.ok ? variables.data : []).map((variable) => [
    variable.employee_id,
    variable.period_start,
    variable.period_end,
    variable.concept,
    variable.quantity,
    variable.unit,
    variable.status,
    variable.source,
  ]));
  await writeStaffAuditLog({ actorUserId: session.id, action: "payroll_variables_export", entityType: "staff_payroll_variable", metadata: { rows: variables.ok ? variables.data.length : 0 } });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=rrhh-variables-nomina.csv" } });
}
