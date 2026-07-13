import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listLeaveRequests } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function LeaveCalendarPage() {
  await requireAdminPermission("staff:absence:read");
  const [employees, requests] = await Promise.all([listStaffEmployees(), listLeaveRequests()]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee.display_name]));
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Calendario de ausencias" description="Vista operativa de ausencias, conflictos y cobertura pendiente." />
      <section className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:px-6 md:grid-cols-2">
        {requests.ok && requests.data.length ? requests.data.map((request) => (
          <article key={request.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{employeeById.get(request.employee_id) || request.employee_id}</p>
            <p className="mt-1 text-sm text-stone-300">{request.absence_type} · {request.status} · {new Date(request.starts_at).toLocaleDateString("es-ES")} - {new Date(request.ends_at).toLocaleDateString("es-ES")}</p>
            <p className="mt-2 text-xs font-bold text-[#f2c6bb]">Cobertura: {request.shift_impact_summary.length ? "pendiente de revisión" : "sin impacto detectado"}</p>
          </article>
        )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin ausencias en calendario.</p>}
      </section>
    </main>
  );
}
