import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees, listStaffShifts } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listLeaveRequests } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { listAvailabilityExceptions } from "@/lib/admin-kiosko/repositories/staff-availability.repository";
import { listCoverageRequests, listShiftOffers, listShiftVacancies } from "@/lib/admin-kiosko/repositories/staff-coverage.repository";
import { listShiftChangeRequests } from "@/lib/admin-kiosko/repositories/staff-shift-change.repository";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function LeaveCalendarPage() {
  await requireAdminPermission("staff:absence:read");
  const [employees, requests, shifts, exceptions, changes, vacancies, coverage, offers] = await Promise.all([
    listStaffEmployees(),
    listLeaveRequests(),
    listStaffShifts(),
    listAvailabilityExceptions(),
    listShiftChangeRequests(),
    listShiftVacancies(),
    listCoverageRequests(),
    listShiftOffers(),
  ]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((employee) => [employee.id, employee.display_name]));
  const events = [
    ...(shifts.ok ? shifts.data.map((shift) => ({ id: shift.id, title: "Turno", detail: `${shift.status} · ${new Date(shift.starts_at).toLocaleString("es-ES")}`, kind: "turno" })) : []),
    ...(requests.ok ? requests.data.map((request) => ({ id: request.id, title: employeeById.get(request.employee_id) || "Ausencia", detail: `${request.absence_type} · ${request.status} · ${new Date(request.starts_at).toLocaleDateString("es-ES")}`, kind: "ausencia" })) : []),
    ...(exceptions.ok ? exceptions.data.map((item) => ({ id: item.id, title: employeeById.get(item.employee_id) || "Indisponibilidad", detail: `${item.availability_type} · ${item.status} · ${new Date(item.starts_at).toLocaleDateString("es-ES")}`, kind: "indisponibilidad" })) : []),
    ...(changes.ok ? changes.data.map((item) => ({ id: item.id, title: "Cambio pendiente", detail: `${item.request_type} · ${item.status}`, kind: "cambio" })) : []),
    ...(vacancies.ok ? vacancies.data.map((item) => ({ id: item.id, title: "Vacante", detail: `${item.role_name || "turno"} · ${item.vacancy_status}`, kind: "vacante" })) : []),
    ...(coverage.ok ? coverage.data.map((item) => ({ id: item.id, title: "Cobertura", detail: `${item.urgency} · ${item.status}`, kind: "cobertura" })) : []),
    ...(offers.ok ? offers.data.map((item) => ({ id: item.id, title: "Oferta", detail: `${item.title} · ${item.status}`, kind: "oferta" })) : []),
  ];
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Calendario operativo" description="Turnos, ausencias, indisponibilidades, vacantes, ofertas y conflictos." />
      <section className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:px-6 md:grid-cols-2">
        {events.length ? events.map((event) => (
          <article key={`${event.kind}-${event.id}`} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{event.title}</p>
            <p className="mt-1 text-sm text-stone-300">{event.detail}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f2c6bb]">{event.kind}</p>
          </article>
        )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin eventos en calendario.</p>}
      </section>
    </main>
  );
}
