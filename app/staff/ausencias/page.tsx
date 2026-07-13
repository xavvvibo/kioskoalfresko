import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listStaffAbsences } from "@/lib/admin-kiosko/repositories/staff-records.repository";

export default async function StaffAbsencesPage() {
  const session = await requireAdminSession("/staff/ausencias");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const absences = await listStaffAbsences(employee.data.id, true);
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Vacaciones y ausencias</h1>
        <section className="grid gap-3">
          {absences.ok && absences.data.length ? absences.data.map((absence) => (
            <article key={absence.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{absence.absence_type} · {absence.status}</p>
              <p className="mt-1 text-sm text-stone-300">{new Date(absence.starts_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} - {new Date(absence.ends_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay ausencias visibles.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
