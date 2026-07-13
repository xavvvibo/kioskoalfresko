import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees, listStaffLocations } from "@/lib/admin-kiosko/repositories/staff.repository";
import { AdminHeader } from "../../_components/AdminHeader";
import { createStaffEmployeeAction } from "../actions";

export default async function StaffEmployeesPage() {
  await requireAdminPermission("staff:hr");
  const [employees, locations] = await Promise.all([listStaffEmployees(), listStaffLocations()]);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Empleados" description="Ficha maestra, vinculación con usuario interno y centro principal." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <form action={createStaffEmployeeAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em] md:col-span-2">Crear empleado</h2>
          <input name="employeeCode" required placeholder="Código empleado" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="displayName" required placeholder="Nombre visible" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="firstName" required placeholder="Nombre" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="lastName" required placeholder="Apellidos" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="email" type="email" placeholder="Email" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="phone" placeholder="Teléfono" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="hireDate" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <select name="primaryLocationId" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
            <option value="">Centro principal</option>
            {locations.ok ? locations.data.map((location) => <option key={location.id} value={location.id}>{location.name}</option>) : null}
          </select>
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] md:col-span-2">Crear empleado</button>
        </form>

        <section className="grid gap-3">
          {employees.ok && employees.data.length ? employees.data.map((employee) => (
            <Link key={employee.id} href={`/admin-kiosko/personal/empleados/${employee.id}`} className="rounded-2xl border border-white/10 bg-[#151515] p-4 transition hover:border-[#d94b2b]">
              <p className="font-black text-white">{employee.display_name}</p>
              <p className="mt-1 text-sm text-stone-300">{employee.employee_code} · {employee.status} · {employee.email || "sin email"}</p>
            </Link>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay empleados.</p>}
        </section>
      </section>
    </main>
  );
}
