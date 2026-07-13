import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffAuditLogs } from "@/lib/admin-kiosko/repositories/staff.repository";
import { AuditTimeline } from "@/components/staff/StaffCards";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function StaffReportsPage() {
  await requireAdminPermission("staff:reports:export");
  const logs = await listStaffAuditLogs(80);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Informes RRHH" description="Exportación de registro horario, turnos e historial de auditoría." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/admin-kiosko/personal/informes/registro-horario.csv" className="rounded-[1.6rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">CSV</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em]">Registro horario</h2>
          </Link>
          <Link href="/admin-kiosko/personal/informes/turnos.csv" className="rounded-[1.6rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">CSV</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em]">Turnos</h2>
          </Link>
        </div>
        <AuditTimeline logs={logs.ok ? logs.data : []} />
      </section>
    </main>
  );
}
