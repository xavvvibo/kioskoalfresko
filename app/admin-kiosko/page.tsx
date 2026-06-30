import type { Metadata } from "next";
import { internalAdminSections } from "@/content/site";
import { isAdminAuthenticated } from "@/lib/admin-kiosko/auth";
import { getAdminDashboardSummary, getExecutiveDashboardMetrics } from "@/lib/admin-kiosko/database";
import { temperatureEquipment } from "@/lib/admin-kiosko/temperature-rules";
import { AdminHeader } from "./_components/AdminHeader";
import { LoginPanel } from "./_components/LoginPanel";
import { TemperatureAlerts } from "./_components/TemperatureAlerts";

export const metadata: Metadata = {
  title: "Panel interno | Kiosko Alfresko",
  description: "Panel interno de control operativo y sanitario.",
  robots: {
    index: false,
    follow: false,
  },
};

const categoryStyles = {
  sanitario: "border-[#d94b2b]/30 bg-[#d94b2b]/10 text-[#d94b2b]",
  operativo: "border-stone-300 bg-stone-100 text-stone-800",
  documentacion: "border-stone-950/20 bg-white text-stone-950",
};

export default async function AdminKioskoPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const isAuthenticated = await isAdminAuthenticated();
  const params = await searchParams;

  if (!isAuthenticated) {
    return <LoginPanel hasError={params?.error === "1"} />;
  }

  const [dashboard, executive] = await Promise.all([
    getAdminDashboardSummary(),
    getExecutiveDashboardMetrics(),
  ]);
  const summary = dashboard.ok ? dashboard.data : null;
  const metrics = executive.ok ? executive.data : null;
  const inactiveTemperatureEquipment = temperatureEquipment.filter((equipment) => !equipment.active);
  const latestMonthlySignatureRecord = summary?.latestMonthlySignature
    ? {
        main: `${summary.latestMonthlySignature.month}/${summary.latestMonthlySignature.year}`,
        record_date: summary.latestMonthlySignature.signed_at.slice(0, 10),
        record_time: null,
        responsible: summary.latestMonthlySignature.signed_by,
        status: "firmado",
      }
    : null;
  const latestReviewItems: Array<{
    label: string;
    record: {
      main: string;
      record_date: string;
      record_time: string | null;
      responsible: string | null;
      status?: string | null;
    } | null;
  }> = [
    { label: "Apertura", record: summary?.latestChecklistOpening || null },
    { label: "Cierre", record: summary?.latestChecklistClosing || null },
    { label: "Informe mensual firmado", record: latestMonthlySignatureRecord },
  ];
  const semaphore = !summary || summary.pendingAlerts > 0 || summary.incidentTemperatureRecords > 0 || summary.openIncidents > 0 || !summary.latestMonthlySignature
    ? { label: "🔴 Incidencias abiertas", text: "Incidencias abiertas, alertas pendientes o informe mensual sin firmar", className: "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]" }
    : summary.inProgressAlerts > 0 || summary.reviewingTemperatureRecords > 0 || !summary.latestChecklistOpening || !summary.latestChecklistClosing
      ? { label: "🟡 Revisiones pendientes", text: "Alertas en proceso o revisiones operativas pendientes", className: "border-amber-300 bg-amber-100 text-amber-950" }
      : { label: "🟢 Todo correcto", text: "Registros principales al día y sin incidencias abiertas", className: "border-emerald-300 bg-emerald-100 text-emerald-950" };
  const complianceValue = summary
    ? summary.pendingAlerts + summary.inProgressAlerts + summary.openIncidents + summary.reviewingTemperatureRecords + summary.incidentTemperatureRecords === 0
      ? "Completo"
      : "Revisar"
    : "Sin datos";
  const appccPercent = summary
    ? Math.max(0, 100 - ((summary.pendingAlerts + summary.inProgressAlerts + summary.openIncidents + summary.reviewingTemperatureRecords + summary.incidentTemperatureRecords) * 10))
    : 0;
  const documentationPercent = metrics ? Math.max(0, Math.round(((27 - metrics.pendingDocuments) / 27) * 100)) : 0;
  const dailyPending = [
    {
      label: "Temperaturas",
      status: metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/temperaturas") ? "Requiere registro hoy" : "Registrado o sin alertas",
      href: "/admin-kiosko/temperaturas",
    },
    {
      label: "Limpieza",
      status: metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/limpieza") ? "Requiere registro hoy" : "Registrado o sin alertas",
      href: "/admin-kiosko/limpieza",
    },
    {
      label: "Aceite",
      status: metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/aceite-freidora") ? "Requiere registro hoy" : "Registrado o sin alertas",
      href: "/admin-kiosko/aceite-freidora",
    },
    {
      label: "Recepción mercancías",
      status: summary?.todayGoodsReceptionRecords ? `${summary.todayGoodsReceptionRecords} registros hoy` : "Registrar solo si hubo recepción",
      href: "/admin-kiosko/recepcion-mercancia",
    },
    {
      label: "Incidencias",
      status: summary?.openIncidents ? `${summary.openIncidents} abiertas` : "No constan incidencias abiertas.",
      href: "/admin-kiosko/incidencias",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Panel APPCC KIOSKO ALFRESKO"
        description="Control sanitario digital · Responsable: F. Javier Bocanegra Sanjuan · DNI 75.136.778-X"
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-8">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Semáforo sanitario</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">Estado rápido de temperaturas, alertas técnicas y registros recientes.</p>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] ${semaphore.className}`}>
                {semaphore.label}
              </span>
            </div>

            {summary ? (
              <>
                {metrics ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["APPCC completo", `${appccPercent}%`],
                      ["Documentación", `${documentationPercent}%`],
                      ["Recepciones este mes", metrics.receptionsThisMonth],
                      ["OCR procesados", metrics.ocrProcessed],
                      ["OCR a revisar", metrics.ocrToReview],
                      ["Productos activos", metrics.activeProducts],
                      ["Lotes activos", metrics.activeLots],
                      ["Stock bajo", metrics.lowStockProducts],
                      ["Próximos a caducar", metrics.expiringProducts],
                      ["Incidencias abiertas", metrics.openIncidents],
                      ["Equipos fuera de rango", metrics.outOfRangeEquipment],
                      ["Mantenimiento pendiente", metrics.pendingMaintenance],
                      ["Agua hoy", metrics.waterToday],
                      ["Documentos pendientes", metrics.pendingDocuments],
                      ["Temperaturas hoy", metrics.temperaturesToday],
                      ["Registros hoy", metrics.recordsToday],
                      ["Registros semana", metrics.recordsWeek],
                      ["Registros mes", metrics.recordsMonth],
                      ["Última inspección", metrics.latestInspection],
                      ["Próxima revisión", summary?.latestMonthlySignature ? "Revisión mensual" : "Firmar informe mensual"],
                    ].map(([label, value]) => (
                      <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#0d0d0d] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                        <p className="mt-3 text-xl font-black leading-tight text-white">{String(value)}</p>
                      </article>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Estado APPCC general", semaphore.label],
                    ["Cumplimiento del mes", complianceValue],
                    ["Temperaturas registradas hoy", String(summary.todayTemperatureRecords)],
                    ["Limpieza hoy", String(summary.todayCleaningRecords)],
                      ["Aceite freidora", summary.latestFryerOilRecord ? `${summary.latestFryerOilRecord.record_date} · ${summary.latestFryerOilRecord.status || "registrado"}` : "Último registro no disponible todavía."],
                    ["Recepciones de mercancía hoy", String(summary.todayGoodsReceptionRecords)],
                    ["Documentos pendientes", String(metrics?.pendingDocuments ?? 0)],
                    ["OCR pendientes de revisión", String(metrics?.ocrToReview ?? 0)],
                    ["Stock bajo", String(metrics?.lowStockProducts ?? 0)],
                    ["Productos próximos a caducar", String(metrics?.expiringProducts ?? 0)],
                    ["Mantenimiento pendiente", String(metrics?.pendingMaintenance ?? 0)],
                    ["Control de agua hoy", String(metrics?.waterToday ?? 0)],
                    ["Equipos APPCC activos", String(summary.activeEquipmentCount)],
                    ["Alertas pendientes", String(summary.pendingAlerts)],
                    ["Alertas en proceso", String(summary.inProgressAlerts)],
                    ["Incidencias abiertas", String(summary.openIncidents)],
                    ["Alertas técnicas abiertas", String(summary.pendingAlerts + summary.inProgressAlerts)],
                    ["Equipos fuera de rango", String(summary.reviewingTemperatureRecords + summary.incidentTemperatureRecords)],
                    ["Último registro realizado", summary.lastTemperatureRecord ? `${summary.lastTemperatureRecord.equipment} · ${summary.lastTemperatureRecord.record_date}` : "Último registro no disponible todavía."],
                  ].map(([label, value]) => (
                    <article key={label} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                      <p className="mt-3 text-xl font-black leading-tight text-white">{value}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-5">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Última revisión APPCC</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {latestReviewItems.map(({ label, record }) => (
                      <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                        {record ? (
                          <>
                            <p className="mt-2 text-sm font-black text-white">{record.main}</p>
                            <p className="mt-1 text-xs text-stone-300">{record.record_date}{record.record_time ? ` · ${record.record_time.slice(0, 5)}` : ""}</p>
                            <p className="mt-1 text-xs text-stone-300">{record.responsible || "Responsable no consignado"}</p>
                          </>
                    ) : <p className="mt-2 text-sm font-semibold text-stone-400">Último registro no disponible todavía.</p>}
                      </article>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Pendiente de registrar hoy</h3>
                      <p className="mt-2 text-sm leading-6 text-stone-300">Control mínimo diario para enseñar a inspección.</p>
                    </div>
                    <a href="/admin-kiosko/registros" className="w-fit rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                      Ver registros
                    </a>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    {dailyPending.map((item) => (
                      <a key={item.label} href={item.href} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 transition hover:border-[#d94b2b]">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-white">{item.status}</p>
                      </a>
                    ))}
                  </div>
                </div>

                <p className={`mt-5 rounded-[1.3rem] border px-4 py-3 text-sm font-semibold leading-6 ${semaphore.className}`}>
                  {semaphore.text}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Total temperaturas", String(summary.totalTemperatureRecords)],
                    ["Temperaturas en revisión", String(summary.reviewingTemperatureRecords)],
                    ["Incidencias de temperatura", String(summary.incidentTemperatureRecords)],
                  ].map(([label, value]) => (
                    <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#0d0d0d] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">{label}</p>
                      <p className="mt-2 text-2xl font-black leading-tight text-[#fff8ef]">{value}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Últimas temperaturas por equipo</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {summary.latestByEquipment.map((record) => (
                      <article key={record.equipment} className="rounded-[1.3rem] border border-white/10 bg-[#fffaf4] p-4 text-stone-950">
                        <p className="text-sm font-black uppercase tracking-[-0.02em]">{record.equipment}</p>
                        <p className="mt-2 text-2xl font-black">{record.temperature !== null ? `${record.temperature} ºC` : "Último registro no disponible todavía."}</p>
                        <p className="mt-1 text-xs font-semibold text-stone-600">
                          {record.record_date ? `${record.record_date}${record.record_time ? ` · ${record.record_time.slice(0, 5)}` : ""} · ${record.status || "Registro disponible"}` : "Último registro no disponible todavía."}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                {inactiveTemperatureEquipment.length ? (
                  <div className="mt-6 rounded-[1.3rem] border border-amber-300/30 bg-amber-100 p-4 text-amber-950">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em]">Equipos fuera de servicio</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {inactiveTemperatureEquipment.map((equipment) => (
                        <span key={equipment.name} className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]">
                          {equipment.name} · No requiere registro activo
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <TemperatureAlerts alerts={summary.openAlerts} />

                {metrics?.alerts.length ? (
                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-5">
                    <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Centro de alertas</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {metrics.alerts.slice(0, 10).map((alert) => (
                        <a key={alert.id} href={alert.href} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b]">
                          <p className="font-black text-white">{alert.title}</p>
                          <p className="mt-1">{alert.detail}</p>
                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{alert.type} · {alert.severity}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-5 rounded-[1.3rem] border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
                No se ha podido cargar el resumen APPCC. Revisa la conexión con Supabase.
              </p>
            )}
          </section>

          {internalAdminSections.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{section.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">{section.description}</p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">
                  Uso interno
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <article key={item.title} className="flex min-h-[15rem] flex-col rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${categoryStyles[item.category]}`}>
                        {item.category}
                      </span>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-900">
                        Acceso interno
                      </span>
                    </div>
                    <h3 className="mt-5 text-2xl font-black uppercase leading-tight tracking-[-0.03em]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-stone-700">{item.description}</p>
                    <div className="mt-auto pt-6">
                      <a
                        href={item.href}
                        className="inline-flex w-full items-center justify-center rounded-full border border-stone-950 bg-stone-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#d94b2b] focus:outline-none focus:ring-2 focus:ring-[#d94b2b] focus:ring-offset-2 focus:ring-offset-[#fffaf4]"
                      >
                        Abrir
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
