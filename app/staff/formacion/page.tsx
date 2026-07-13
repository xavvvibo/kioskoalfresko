import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listTrainingAssignments } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { getTrainingAlert } from "@/lib/admin-kiosko/staff/training.service";

export default async function StaffTrainingPage() {
  const session = await requireAdminSession("/staff/formacion");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const training = await listTrainingAssignments(employee.data.id);
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mi formación</h1>
        <section className="grid gap-3">
          {training.ok && training.data.length ? training.data.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{item.status} · {item.provider || "Formación interna"}</p>
              <p className="mt-1 text-sm text-stone-300">Asignada {item.assigned_at} · Caduca {item.expires_at || "no aplica"}</p>
              {getTrainingAlert(item.status, item.expires_at, false) ? <p className="mt-2 text-sm font-bold text-[#f2c6bb]">{getTrainingAlert(item.status, item.expires_at, false)}</p> : null}
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay formación asignada.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
