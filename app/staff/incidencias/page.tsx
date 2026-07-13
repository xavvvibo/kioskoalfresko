import Link from "next/link";
import { listTimeIncidentsForEmployee } from "@/lib/admin-kiosko/repositories/staff.repository";
import { TimeIncidentForm } from "@/components/staff/StaffCards";
import { staffIncidentAction } from "../actions";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffIncidentsPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const incidents = await listTimeIncidentsForEmployee(current.employee.id);

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Incidencias</h1>
        <TimeIncidentForm action={staffIncidentAction} />
        <section className="grid gap-3">
          {incidents.ok && incidents.data.length ? incidents.data.map((incident) => (
            <article key={incident.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{incident.incident_type} · {incident.status}</p>
              <p className="mt-1 text-sm text-stone-300">{incident.description}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay incidencias registradas.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
