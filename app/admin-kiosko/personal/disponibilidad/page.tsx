import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listAvailabilityExceptions, listRecurringAvailability } from "@/lib/admin-kiosko/repositories/staff-availability.repository";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function StaffAvailabilityAdminPage() {
  await requireAdminPermission("staff:availability:read");
  const [employees, recurring, exceptions] = await Promise.all([
    listStaffEmployees(),
    listRecurringAvailability(),
    listAvailabilityExceptions(),
  ]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee.display_name]));
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Disponibilidad" description="Disponibilidad recurrente, excepciones puntuales y preferencias declaradas." />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-2">
        {(recurring.ok ? recurring.data : []).map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{employeeById.get(item.employee_id) || item.employee_id} · Día {item.weekday}</p>
            <p className="mt-1 text-sm text-stone-300">{item.availability_type} · {item.full_day ? "jornada completa" : `${item.starts_at || "--"} - ${item.ends_at || "--"}`}</p>
          </article>
        ))}
        {(exceptions.ok ? exceptions.data : []).map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{employeeById.get(item.employee_id) || item.employee_id} · {item.availability_type} · {item.status}</p>
            <p className="mt-1 text-sm text-stone-300">{new Date(item.starts_at).toLocaleString("es-ES")} - {new Date(item.ends_at).toLocaleString("es-ES")}</p>
          </article>
        ))}
        {(!recurring.ok || !recurring.data.length) && (!exceptions.ok || !exceptions.data.length) ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300 md:col-span-2">Sin disponibilidad registrada.</p> : null}
      </section>
    </main>
  );
}
