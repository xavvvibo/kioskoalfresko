import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getAdminDashboardSummary, getRecentCleaningRecords, getRecentGoodsReceptionRecords, getRecentIncidentRecords, getRecentTemperatureRecords } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";
import { RecentRecords } from "../_components/RecentRecords";

export const metadata: Metadata = {
  title: "Modo inspección sanitaria | Panel interno",
  description: "Vista rápida de documentación, registros y estado APPCC.",
};

const quickLinks = [
  ["Memoria técnico-sanitaria", "/admin-kiosko/documentacion/memoria-tecnico-sanitaria"],
  ["Buenas prácticas de manipulación", "/admin-kiosko/documentacion/buenas-practicas"],
  ["Libros de registro APPCC", "/admin-kiosko/documentacion/libros-registro-appcc"],
  ["Registros APPCC", "/admin-kiosko/registros"],
  ["Informe mensual APPCC", "/admin-kiosko/registros/informe"],
  ["Temperaturas", "/admin-kiosko/temperaturas"],
  ["Limpieza", "/admin-kiosko/limpieza"],
  ["Aceite freidora", "/admin-kiosko/aceite-freidora"],
  ["Recepción mercancías", "/admin-kiosko/recepcion-mercancia"],
  ["Incidencias y acciones correctoras", "/admin-kiosko/incidencias"],
  ["Agua", "/admin-kiosko/agua"],
  ["Mantenimiento", "/admin-kiosko/mantenimiento"],
  ["Proveedores", "/admin-kiosko/proveedores"],
  ["Alérgenos", "/admin-kiosko/documentacion/alergenos"],
  ["Fichas técnicas", "/admin-kiosko/documentacion/fichas-tecnicas"],
  ["Verificación anual", "/admin-kiosko/verificacion-anual"],
];

export default async function ModoInspeccionPage() {
  await requireAdminSession();
  const [dashboard, temperatures, incidents, goods, cleaning] = await Promise.all([
    getAdminDashboardSummary(),
    getRecentTemperatureRecords(),
    getRecentIncidentRecords(),
    getRecentGoodsReceptionRecords(),
    getRecentCleaningRecords(),
  ]);
  const summary = dashboard.ok ? dashboard.data : null;
  const status = !summary || summary.pendingAlerts > 0 || summary.openIncidents > 0 || summary.incidentTemperatureRecords > 0
    ? "🔴 Incidencias abiertas"
    : summary.inProgressAlerts > 0 || summary.reviewingTemperatureRecords > 0
      ? "🟡 Revisiones pendientes"
      : "🟢 Todo correcto";

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Modo inspección sanitaria" description="Vista rápida de documentación, registros y estado APPCC." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Identificación</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {["KIOSKO ALFRESKO", "Responsable: F. Javier Bocanegra Sanjuan", "DNI: 75.136.778-X"].map((item) => (
                <p key={item} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm font-black text-white">{item}</p>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Estado general</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Semáforo APPCC", status],
                ["Última revisión", summary?.latestMonthlySignature ? `${summary.latestMonthlySignature.month}/${summary.latestMonthlySignature.year}` : "Pendiente"],
                ["Incidencias abiertas", String(summary?.openIncidents || 0)],
                ["Alertas abiertas", String((summary?.pendingAlerts || 0) + (summary?.inProgressAlerts || 0))],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-lg font-black text-white">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Accesos rápidos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map(([label, href]) => (
                <Link key={label} href={href} className="rounded-[1.1rem] border border-white/10 bg-[#fffaf4] p-4 text-sm font-black text-stone-950">{label}</Link>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <RecentRecords records={temperatures.ok ? temperatures.data : []} title="Últimas temperaturas" />
            <RecentRecords records={incidents.ok ? incidents.data : []} title="Últimas incidencias" />
            <RecentRecords records={goods.ok ? goods.data : []} title="Últimas recepciones" />
            <RecentRecords records={cleaning.ok ? cleaning.data : []} title="Últimos registros de limpieza" />
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin-kiosko/registros/descargar" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Descargar CSV registros</Link>
            <Link href="/admin-kiosko/registros/informe" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver informe mensual</Link>
            <Link href="/admin-kiosko" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Volver al panel</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
