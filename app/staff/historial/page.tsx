import Link from "next/link";
import { listTimelineEvents } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffTimelinePage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const timeline = await listTimelineEvents(current.employee.id, true);
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mi historial</h1>
        <section className="grid gap-3">
          {timeline.ok && timeline.data.length ? timeline.data.map((event) => (
            <article key={event.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{event.title}</p>
              <p className="mt-1 text-sm text-stone-300">{new Date(event.effective_at).toLocaleDateString("es-ES")} · {event.event_type}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay eventos visibles.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
