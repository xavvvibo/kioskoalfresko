import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getExecutiveDashboardMetrics, getProductionBatches, getLabelRecords, getRecentIncidentRecords, getRecentGoodsReceptionRecords } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Operativa diaria APPCC | Panel interno",
  description: "Centro diario de registros, pendientes y cierre de jornada.",
};

export default async function OperativaPage() {
  await requireAdminSession();
  const today = new Date().toISOString().slice(0, 10);
  const [metricsResult, productionsResult, labelsResult, incidentsResult, receptionsResult] = await Promise.all([
    getExecutiveDashboardMetrics(),
    getProductionBatches(50),
    getLabelRecords(50),
    getRecentIncidentRecords(),
    getRecentGoodsReceptionRecords(),
  ]);
  const metrics = metricsResult.ok ? metricsResult.data : null;
  const productionsToday = productionsResult.ok ? productionsResult.data.filter((batch) => batch.production_date === today) : [];
  const labelsToday = labelsResult.ok ? labelsResult.data.filter((label) => label.created_at.slice(0, 10) === today) : [];
  const incidents = incidentsResult.ok ? incidentsResult.data : [];
  const receptions = receptionsResult.ok ? receptionsResult.data.filter((record) => record.record_date === today) : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Operativa diaria" description="Estado de la jornada, registros pendientes y acciones de servicio." role="employee" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="grid gap-3 md:grid-cols-4">
            {[
              ["Temperaturas", metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/temperaturas") ? "Pendiente" : "Completo"],
              ["Limpieza", metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/limpieza") ? "Pendiente" : "Completo"],
              ["Aceite", metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/aceite-freidora") ? "Pendiente" : "Completo"],
              ["Recepciones hoy", receptions.length],
              ["Producciones hoy", productionsToday.length],
              ["Etiquetas hoy", labelsToday.length],
              ["Incidencias abiertas", metrics?.openIncidents || 0],
              ["Mermas del mes", metrics?.monthlyWasteMovements || 0],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#151515] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Temperaturas", "/admin-kiosko/temperaturas"],
              ["Limpieza", "/admin-kiosko/limpieza"],
              ["Aceite freidora", "/admin-kiosko/aceite-freidora"],
              ["Recepción mercancía", "/admin-kiosko/recepcion-mercancia"],
              ["Producción interna", "/admin-kiosko/produccion"],
              ["Etiquetas", "/admin-kiosko/etiquetas"],
              ["Mermas", "/admin-kiosko/produccion#lotes"],
              ["Incidencias", "/admin-kiosko/incidencias"],
              ["Cerrar jornada", "/admin-kiosko/registros"],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{label}</Link>
            ))}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Checklist de cierre</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {["Temperaturas revisadas", "Limpieza registrada", "Aceite registrado", "Recepciones revisadas", "Producción y etiquetas revisadas", "Incidencias comunicadas"].map((item) => (
                <p key={item} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm font-black text-white">□ {item}</p>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {incidents.slice(0, 4).map((record) => (
                <Link key={record.id} href="/admin-kiosko/incidencias" className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">{record.record_date} · {record.main}</Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
