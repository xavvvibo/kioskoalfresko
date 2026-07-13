import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffAuditLogs } from "@/lib/admin-kiosko/repositories/staff.repository";
import { AuditTimeline } from "@/components/staff/StaffCards";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function StaffReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  await requireAdminPermission("staff:reports:export");
  const params = await searchParams;
  const logs = await listStaffAuditLogs(80);
  const query = (params?.q || "").toLowerCase();
  const filteredLogs = logs.ok && query
    ? logs.data.filter((log) => [log.action, log.entity_type, log.entity_id].filter(Boolean).join(" ").toLowerCase().includes(query))
    : logs.ok ? logs.data : [];

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
          {[
            ["Saldos", "/admin-kiosko/personal/informes/ausencias-saldos.csv"],
            ["Solicitudes", "/admin-kiosko/personal/informes/ausencias-solicitudes.csv"],
            ["Movimientos", "/admin-kiosko/personal/informes/ausencias-movimientos.csv"],
            ["Bloqueos", "/admin-kiosko/personal/informes/periodos-bloqueos.csv"],
            ["Variables nómina", "/admin-kiosko/personal/informes/variables-nomina.csv"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="rounded-[1.6rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">CSV</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em]">{label}</h2>
            </Link>
          ))}
        </div>
        <form className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-[1fr_auto]">
          <input name="q" defaultValue={params?.q || ""} placeholder="Filtrar auditoría por acción, entidad o ID" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Filtrar</button>
        </form>
        <AuditTimeline logs={filteredLogs} />
      </section>
    </main>
  );
}
