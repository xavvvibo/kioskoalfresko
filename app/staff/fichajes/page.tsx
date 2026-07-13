import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId, listWorkEntriesForEmployee } from "@/lib/admin-kiosko/repositories/staff.repository";

export default async function StaffEntriesPage() {
  const session = await requireAdminSession("/staff/fichajes");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const entries = await listWorkEntriesForEmployee(employee.data.id);

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mis fichajes</h1>
        <section className="grid gap-3">
          {entries.ok && entries.data.length ? entries.data.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{new Date(entry.clock_in_at).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })} · {entry.status}</p>
              <p className="mt-1 text-sm text-stone-300">
                Entrada {new Date(entry.clock_in_at).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}
                {" · "}
                Salida {entry.clock_out_at ? new Date(entry.clock_out_at).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }) : "pendiente"}
                {" · "}
                {Math.round((entry.worked_seconds || 0) / 60)} min
              </p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay fichajes.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
