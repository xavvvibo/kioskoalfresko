import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees, listStaffWorkEntries } from "@/lib/admin-kiosko/repositories/staff.repository";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function StaffWorkEntriesAdminPage() {
  await requireAdminPermission("staff:time:review");
  const [employees, entries] = await Promise.all([listStaffEmployees(), listStaffWorkEntries(250)]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee]));

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Fichajes" description="Registro horario, revisiones pendientes y horas reales frente a planificación." />
      <section className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:px-6">
        {entries.ok && entries.data.length ? entries.data.map((entry) => {
          const employee = employeeById.get(entry.employee_id);
          return (
            <article key={entry.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{employee?.display_name || entry.employee_id} · {entry.status}</p>
              <p className="mt-1 text-sm text-stone-300">
                {new Date(entry.clock_in_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
                {" -> "}
                {entry.clock_out_at ? new Date(entry.clock_out_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }) : "abierto"}
                {" · "}
                {Math.round((entry.worked_seconds || 0) / 60)} min
              </p>
            </article>
          );
        }) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay fichajes.</p>}
      </section>
    </main>
  );
}
