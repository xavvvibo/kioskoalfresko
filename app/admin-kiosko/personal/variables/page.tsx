import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listPayrollVariables } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { PayrollVariableList } from "@/components/staff/LeaveAdmin";
import { AdminHeader } from "../../_components/AdminHeader";
import { createPayrollVariableAction } from "../ausencias/actions";

export default async function PayrollVariablesPage() {
  await requireAdminPermission("staff:payroll-variable:read");
  const [employees, variables] = await Promise.all([listStaffEmployees(), listPayrollVariables()]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Variables de nómina" description="Eventos exportables para nómina futura. No calcula importes salariales." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <form action={createPayrollVariableAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-3">
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-3">Nueva variable</h2>
          <select name="employeeId" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950"><option value="">Empleado</option>{employees.ok ? employees.data.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}</option>) : null}</select>
          <select name="concept" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{["ordinary_hours", "additional_hours", "overtime_hours", "night_hours", "holiday_hours", "paid_absence", "unpaid_absence", "temporary_disability", "vacation", "lateness", "clock_incident", "manual_adjustment"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <input name="quantity" type="number" step="0.01" required placeholder="Cantidad" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <select name="unit" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{["hours", "days", "events"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <input name="periodStart" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="periodEnd" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="notes" placeholder="Observaciones" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-3">Crear variable</button>
        </form>
        <PayrollVariableList variables={variables.ok ? variables.data : []} employees={employees.ok ? employees.data : []} />
      </section>
    </main>
  );
}
