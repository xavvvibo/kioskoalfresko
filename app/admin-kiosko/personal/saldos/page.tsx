import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listLeaveBalancePeriods, listLeavePolicies } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { LeaveBalanceCards } from "@/components/staff/LeaveAdmin";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function LeaveBalancesPage() {
  await requireAdminPermission("staff:balance:read");
  const [employees, periods, policies] = await Promise.all([listStaffEmployees(), listLeaveBalancePeriods(), listLeavePolicies()]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Saldos" description="Periodos de saldo, reservas, consumos y disponibilidad calculada." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <LeaveBalanceCards periods={periods.ok ? periods.data : []} policies={policies.ok ? policies.data : []} employees={employees.ok ? employees.data : []} />
      </section>
    </main>
  );
}
