import type { Metadata } from "next";
import type { ReactNode } from "react";
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

function FoldableSection({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
      <summary className="cursor-pointer text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function ListBlock({ title, values }: { title: string; values: string[] }) {
  const emptyTextByTitle: Record<string, string> = {
    Temperaturas: "Último registro no disponible todavía.",
    Aceite: "Último registro no disponible todavía.",
    Limpieza: "Último registro no disponible todavía.",
    Recepciones: "No constan recepciones registradas en el periodo reciente.",
    Incidencias: "No constan incidencias abiertas.",
    Equipos: "No hay alertas técnicas pendientes.",
    Mantenimiento: "No hay alertas técnicas pendientes.",
  };

  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
      <h3 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title}</h3>
      <div className="mt-4 grid gap-2">
        {values.length ? values.map((value) => (
          <p key={value} className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-200">{value}</p>
        )) : <p className="text-sm text-stone-400">{emptyTextByTitle[title] || "Último registro no disponible todavía."}</p>}
      </div>
    </article>
  );
}

export default async function InspeccionExpressPage({ searchParams }: { searchParams?: Promise<{ inspector?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const inspectorMode = params?.inspector === "1";
  const [summary, metrics, cleaning, oil, receptions, incidents, maintenance, equipment] = await Promise.all([
    getAdminDashboardSummary(),
    getExecutiveDashboardMetrics(),
    getRecentCleaningRecords(),
    getRecentFryerOilRecords(),
    getRecentGoodsReceptionRecords(),
    getRecentIncidentRecords(),
    getRecentMaintenanceRecords(),
    getRecentEquipmentAssets(),
  ]);
  const dashboard = summary.ok ? summary.data : null;
  const kpis = metrics.ok ? metrics.data : null;
  const docs = getDocumentStats();
  const redAlerts = kpis?.alerts.filter((alert) => alert.severity === "incidencia") || [];
  const yellowAlerts = kpis?.alerts.filter((alert) => alert.severity === "revisar") || [];
  const semaphore = redAlerts.length
    ? { dot: "bg-[#d94b2b]", title: "Incidencias que requieren actuación", detail: "Existen incidencias sanitarias o técnicas que requieren seguimiento.", className: "border-[#d94b2b]/35 bg-[#d94b2b]/10 text-[#f2c6bb]" }
    : yellowAlerts.length
      ? { dot: "bg-amber-400", title: "Pendientes administrativos", detail: "Hay registros o documentación pendientes, sin incumplimiento sanitario abierto.", className: "border-amber-300 bg-amber-100 text-amber-950" }
      : { dot: "bg-emerald-400", title: "Todo correcto", detail: "Registros principales al día y sin incidencias abiertas.", className: "border-emerald-300 bg-emerald-100 text-emerald-950" };
  const documentationPercent = docs.percent;
  const appccPercent = Math.max(0, 100 - (redAlerts.length * 20) - (yellowAlerts.length * 3));
  const statusStyle = (status: string) => status === "incidencia"
    ? "border-[#d94b2b]/35 bg-[#d94b2b]/10 text-[#f2c6bb]"
    : status === "revisar"
      ? "border-amber-300 bg-amber-100 text-amber-950"
      : "border-emerald-300 bg-emerald-100 text-emerald-950";
  const executiveChecks = [
    { label: "Temperaturas", icon: "T", status: dashboard?.incidentTemperatureRecords ? "incidencia" : kpis?.dailyPending.some((alert) => alert.href === "/admin-kiosko/temperaturas") ? "revisar" : "correcto" },
    { label: "Limpieza", icon: "L", status: kpis?.dailyPending.some((alert) => alert.href === "/admin-kiosko/limpieza") ? "revisar" : "correcto" },
    { label: "Aceite", icon: "A", status: kpis?.dailyPending.some((alert) => alert.href === "/admin-kiosko/aceite-freidora") ? "revisar" : "correcto" },
    { label: "Recepciones", icon: "R", status: kpis?.rejectedReceptions ? "incidencia" : "correcto" },
    { label: "Incidencias", icon: "I", status: dashboard?.openIncidents ? "incidencia" : "correcto" },
    { label: "Documentación", icon: "D", status: kpis?.pendingDocuments ? "revisar" : "correcto" },
  ];
  const dailyPending = [
    { label: "Registrar temperaturas", done: !kpis?.dailyPending.some((alert) => alert.href === "/admin-kiosko/temperaturas"), href: "/admin-kiosko/temperaturas" },
    { label: "Registrar limpieza", done: !kpis?.dailyPending.some((alert) => alert.href === "/admin-kiosko/limpieza"), href: "/admin-kiosko/limpieza" },
    { label: "Registrar aceite", done: !kpis?.dailyPending.some((alert) => alert.href === "/admin-kiosko/aceite-freidora"), href: "/admin-kiosko/aceite-freidora" },
    { label: "Recepción pendiente revisar", done: !(kpis?.rejectedReceptions || 0), href: "/admin-kiosko/recepcion-mercancia" },
    { label: "Imprimir etiquetas", done: true, href: "/admin-kiosko/etiquetas" },
  ];
  const chronology = [
    ...(cleaning.ok ? cleaning.data.slice(0, 3).map((item) => `Limpieza · ${item.record_date} · ${item.main}`) : []),
    ...(oil.ok ? oil.data.slice(0, 3).map((item) => `Aceite · ${item.record_date} · ${item.main}`) : []),
    ...(receptions.ok ? receptions.data.slice(0, 3).map((item) => `Recepción · ${item.record_date} · ${item.main}`) : []),
    ...(incidents.ok ? incidents.data.slice(0, 3).map((item) => `Incidencia · ${item.record_date} · ${item.main}`) : []),
  ].slice(0, 8);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Inspección express" description="Resumen operativo APPCC para inspección sanitaria." inspectorMode role="inspector" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Estado APPCC</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`h-4 w-4 rounded-full ${semaphore.dot}`} />
                  <h2 className="text-4xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{semaphore.title}</h2>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">{semaphore.detail}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={inspectorMode ? "/admin-kiosko/inspeccion-express" : "/admin-kiosko/inspeccion-express?inspector=1"} className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">{inspectorMode ? "Modo completo" : "Modo Inspector"}</Link>
                <Link href="/admin-kiosko/registros" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Ver registros</Link>
                <Link href="/admin-kiosko/registros/descargar" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Descargar CSV</Link>
                <Link href="/admin-kiosko/registros/informe" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Informe mensual</Link>
                <Link href="/admin-kiosko/documentacion" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Documentación</Link>
                <Link href="/admin-kiosko/incidencias" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Incidencias</Link>
                <Link href="/admin-kiosko/trazabilidad" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Trazabilidad</Link>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {executiveChecks.map((item) => (
                <article key={item.label} className={`rounded-[1.2rem] border p-4 ${statusStyle(item.status)}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-current text-xs font-black">{item.icon}</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em]">{item.label}</p>
                      <p className="mt-1 text-sm font-black">{item.status === "incidencia" ? "Actuar" : item.status === "revisar" ? "Revisar" : "Correcto"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <FoldableSection title="KPIs ejecutivos">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Row label="APPCC completo" value={`${appccPercent}%`} />
              <Row label="Documentación" value={`${documentationPercent}%`} />
              <Row label="Temperaturas" value={`${kpis?.temperatureCompliancePercent ?? 0}%`} />
              <Row label="Recepciones" value={`${kpis?.receptionCompliancePercent ?? 100}%`} />
              <Row label="Limpieza" value={`${kpis?.cleaningCompliancePercent ?? 0}%`} />
              <Row label="Incidencias" value={kpis?.openIncidents ?? dashboard?.openIncidents ?? 0} />
              <Row label="Stock crítico" value={kpis?.criticalStockProducts ?? 0} />
              <Row label="Caducidades" value={kpis?.expiringProducts ?? 0} />
              <Row label="Lotes activos" value={kpis?.activeLots ?? 0} />
              <Row label="Lotes caducados" value={kpis?.expiredLots ?? 0} />
              <Row label="Lotes próximos" value={kpis?.expiringLots ?? 0} />
              <Row label="Lotes agotados" value={kpis?.exhaustedLots ?? 0} />
              <Row label="Lotes sin caducidad" value={kpis?.lotsWithoutExpiry ?? 0} />
              <Row label="Lotes internos activos" value={kpis?.activeInternalBatches ?? 0} />
              <Row label="Descongelados abiertos" value={kpis?.openDefrostedBatches ?? 0} />
              <Row label="Próximos a consumir" value={kpis?.productsToConsumeSoon ?? 0} />
              <Row label="Mermas del mes" value={kpis?.monthlyWasteMovements ?? 0} />
            </div>
          </FoldableSection>

          <FoldableSection title="Pendientes del día">
            <div className="grid gap-3 md:grid-cols-5">
              {dailyPending.map((item) => (
                <Link key={item.label} href={item.href} className="rounded-[1.2rem] border border-amber-300 bg-amber-100 p-4 text-amber-950">
                  <p className="text-sm font-black">{item.done ? "✓" : "□"} {item.label}</p>
                  <p className="mt-2 text-xs font-semibold">{item.done ? "Control en orden o no aplicable." : "Pendiente antes de finalizar jornada."}</p>
                </Link>
              ))}
            </div>
          </FoldableSection>

          <FoldableSection title="Últimos registros">
            <section className="grid gap-4 lg:grid-cols-2">
            <ListBlock title="Temperaturas" values={dashboard?.latestByEquipment.map((item) => item.record_date ? `${item.equipment}: ${item.temperature ?? "sin lectura"} ºC · ${item.record_date}` : `${item.equipment}: último registro no disponible todavía`) || []} />
            <ListBlock title="Aceite" values={oil.ok ? oil.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
            <ListBlock title="Limpieza" values={cleaning.ok ? cleaning.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
            <ListBlock title="Recepciones" values={receptions.ok ? receptions.data.map((item) => `${item.record_date}: ${item.main}`) : []} />
            {!inspectorMode ? <ListBlock title="Mantenimiento" values={maintenance.ok ? maintenance.data.map((item) => `${item.record_date}: ${item.main}`) : []} /> : null}
            </section>
          </FoldableSection>

          <FoldableSection title="Documentación">
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {adminDocuments.slice(0, 12).map((document) => (
                <Link key={document.slug} href={document.href} className="rounded-[1.2rem] border border-white/10 bg-[#fffaf4] p-4 text-sm text-stone-950">
                  <span className="block font-black">{document.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-stone-600">{document.pendingReason || document.status}</span>
                </Link>
              ))}
            </div>
          </FoldableSection>

          <FoldableSection title="Equipos" open={!inspectorMode}>
            <div className="grid gap-3 md:grid-cols-2">
              {equipment.ok ? equipment.data.map((item) => (
                <p key={item.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">{item.main} · {item.status || "Operativo"}</p>
              )) : <p className="text-sm text-stone-400">Inventario técnico pendiente de consolidar.</p>}
            </div>
          </FoldableSection>

          <FoldableSection title="Incidencias">
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {redAlerts.length ? redAlerts.map((item) => (
                <Link key={item.id} href={item.href} className={`rounded-[1.2rem] border p-4 text-sm ${statusStyle(item.severity)}`}>
                  <span className="block font-black">{item.title}</span>
                  <span className="mt-1 block">{item.detail}</span>
                </Link>
              )) : <p className="text-sm text-stone-400">No constan incidencias abiertas.</p>}
            </div>
          </FoldableSection>

          <FoldableSection title="Cronología" open={!inspectorMode}>
            <div className="grid gap-2">
              {kpis?.recentProductions.map((batch) => (
                <Link key={batch.id} href={`/admin-kiosko/produccion?batch=${batch.id}`} className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-200">
                  Producción · {batch.production_date} · {batch.batch_code} · {batch.output_product}
                </Link>
              ))}
              {chronology.length ? chronology.map((item) => (
                <p key={item} className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-200">{item}</p>
              )) : <p className="text-sm text-stone-400">Cronología sanitaria preparada para los próximos registros.</p>}
            </div>
          </FoldableSection>
        </div>
      </section>
    </main>
  );
}
