import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listCoverageRequests, listShiftVacancies } from "@/lib/admin-kiosko/repositories/staff-coverage.repository";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function CoverageAdminPage() {
  await requireAdminPermission("staff:coverage:read");
  const [vacancies, coverage] = await Promise.all([listShiftVacancies(), listCoverageRequests()]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Cobertura" description="Vacantes, coberturas urgentes y estados de resolución." />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-2">
        <div className="grid gap-3">
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em]">Vacantes</h2>
          {(vacancies.ok ? vacancies.data : []).map((vacancy) => (
            <article key={vacancy.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{vacancy.role_name || "Turno"} · {vacancy.vacancy_status}</p>
              <p className="mt-1 text-sm text-stone-300">{vacancy.reason || "Sin motivo"} · límite {vacancy.deadline_at || "--"}</p>
            </article>
          ))}
        </div>
        <div className="grid gap-3">
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em]">Cobertura urgente</h2>
          {(coverage.ok ? coverage.data : []).map((request) => (
            <article key={request.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{request.urgency} · {request.status}</p>
              <p className="mt-1 text-sm text-stone-300">{request.reason} · límite {request.deadline_at || "--"}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
