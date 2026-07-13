import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listLeaveBalancePeriods, listLeavePolicies } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { listStaffEmployees, writeStaffAuditLog } from "@/lib/admin-kiosko/repositories/staff.repository";
import { toCsv } from "@/lib/admin-kiosko/staff/time";
import { calculateProjectedBalance } from "@/lib/admin-kiosko/staff/leave-rules";

export async function GET() {
  const session = await requireAdminPermission("staff:reports:export");
  const [employees, policies, periods] = await Promise.all([listStaffEmployees(), listLeavePolicies(), listLeaveBalancePeriods()]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee]));
  const policyById = new Map((policies.ok ? policies.data : []).map((policy) => [policy.id, policy]));
  const csv = toCsv(["empleado", "politica", "inicio", "fin", "devengado", "consumido", "reservado", "disponible", "estado"], (periods.ok ? periods.data : []).map((period) => [
    employeeById.get(period.employee_id)?.employee_code || period.employee_id,
    policyById.get(period.policy_id)?.name || period.policy_id,
    period.starts_on,
    period.ends_on,
    period.accrued_amount,
    period.consumed_amount,
    period.reserved_amount,
    calculateProjectedBalance({
      openingBalance: period.opening_balance,
      accrued: period.accrued_amount,
      consumed: period.consumed_amount,
      reserved: period.reserved_amount,
      adjusted: period.adjusted_amount,
      carriedOver: period.carried_over_amount,
      expired: period.expired_amount,
    }),
    period.status,
  ]));
  await writeStaffAuditLog({ actorUserId: session.id, action: "leave_balances_export", entityType: "staff_leave_balance_period", metadata: { rows: periods.ok ? periods.data.length : 0 } });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=rrhh-saldos.csv" } });
}
