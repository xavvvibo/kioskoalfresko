import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { adminDocuments, getDocumentStats } from "@/lib/admin-kiosko/documents";
import {
  getAdminDashboardSummary,
  getExecutiveDashboardMetrics,
  getRecentCleaningRecords,
  getRecentEquipmentAssets,
  getRecentFryerOilRecords,
  getRecentGoodsReceptionRecords,
  getRecentIncidentRecords,
  getRecentMaintenanceRecords,
  getRecentWaterRecords,
} from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Inspección express | Panel interno",
  description: "Vista única para inspección sanitaria APPCC.",
};

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{String(value)}</p>
    </article>
  );
}

function ListBlock({ title, values }: { title: string; values: string[] }) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
      <h3 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title}</h3>
      <div className="mt-4 grid gap-2">
        {values.length ? values.map((value) => (
          <p key={value} className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-200">{value}</p>
        )) : <p className="text-sm text-stone-400">Sin registros.</p>}
      </div>
    </article>
  );
}

export default async function InspeccionExpressPage() {
  await requireAdminSession();
  const [summary, metrics, cleaning, oil, receptions, incidents, maintenance, water, equipment] = await Promise.all([
    getAdminDashboardSummary(),
    getExecutiveDashboardMetrics(),
    getRecentCleaningRecords(),
    getRecentFryerOilRecords(),
    getRecentGoodsReceptionRecords(),
    getRecentIncidentRecords(),
    getRecentMaintenanceRecords(),
    getRecentWaterRecords(),
    getRecentEquipmentAssets(),
  ]);
  const dashboard = summary.ok ? summary.data : null;
  const kpis = metrics.ok ? metrics.data : null;
  const docs = getDocumentStats();
  const semaphore = kpis?.healthStatus === "Incidencias" ? "Incidencias" : kpis?.healthStatus === "Revisar" ? "Revisar" : "Correcto";
  const signature = dashboard?.latestMonthlySignature;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Inspección express" description="Resumen operativo APPCC para inspección sanitaria." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Estado sanitario</p>
                <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{semaphore}</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin-kiosko/registros/informe" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Informe mensual</Link>
                <Link href="/admin-kiosko/documentacion" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Documentación</Link>
                <Link href="/admin-kiosko/registros" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Registros</Link>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <Row label="Temperaturas hoy" value={kpis?.temperaturesToday ?? dashboard?.todayTemperatureRecords ?? 0} />
              <Row label="Registros hoy" value={kpis?.recordsToday ?? 0} />
              <Row label="Registros semana" value={kpis?.recordsWeek ?? 0} />
              <Row label="Registros mes" value={kpis?.recordsMonth ?? 0} />
              <Row label="Incidencias abiertas" value={kpis?.openIncidents ?? dashboard?.openIncidents ?? 0} />
              <Row label="Alertas" value={kpis?.alerts.length ?? 0} />
              <Row label="Stock bajo" value={kpis?.lowStockProducts ?? 0} />
              <Row label="Caducidades próximas" value={kpis?.expiringProducts ?? 0} />
              <Row label="Documentación completa" value={`${docs.available}/${docs.total}`} />
              <Row label="Firma mensual" value={signature ? `${signature.month}/${signature.year} · ${signature.signed_by}` : "Sin firma mensual"} />
              <Row label="Agua hoy" value={kpis?.waterToday ?? 0} />
              <Row label="Mantenimiento" value={kpis?.pendingMaintenance ?? 0} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ListBlock title="Temperaturas" values={dashboard?.latestByEquipment.map((item) => `${item.equipment}: ${item.temperature ?? "-"} ºC · ${item.record_date || "-"}`) || []} />
            <ListBlock title="Aceite" values={oil.ok ? oil.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
            <ListBlock title="Limpieza" values={cleaning.ok ? cleaning.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
            <ListBlock title="Recepciones" values={receptions.ok ? receptions.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
            <ListBlock title="Incidencias" values={incidents.ok ? incidents.data.map((item) => `${item.record_date}: ${item.main} · ${item.status || "-"}`) : []} />
            <ListBlock title="Equipos" values={equipment.ok ? equipment.data.map((item) => `${item.main} · ${item.status || "-"}`) : []} />
            <ListBlock title="Mantenimiento" values={maintenance.ok ? maintenance.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
            <ListBlock title="Agua" values={water.ok ? water.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <h3 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Documentación</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {adminDocuments.slice(0, 12).map((document) => (
                <Link key={document.slug} href={document.href} className="rounded-[1.2rem] border border-white/10 bg-[#fffaf4] p-4 text-sm text-stone-950">
                  <span className="block font-black">{document.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-stone-600">{document.status}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <h3 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Alertas</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {kpis?.alerts.length ? kpis.alerts.map((item) => (
                <Link key={item.id} href={item.href} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                  <span className="block font-black text-white">{item.title}</span>
                  <span className="mt-1 block">{item.detail}</span>
                </Link>
              )) : <p className="text-sm text-stone-400">Sin alertas abiertas.</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
