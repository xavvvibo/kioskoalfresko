import type { Metadata } from "next";
import { internalAdminSections } from "@/content/site";
import { isAdminAuthenticated } from "@/lib/admin-kiosko/auth";
import { getAdminDashboardSummary, getDashboardProductionOperationalMetrics, getExecutiveDashboardMetrics } from "@/lib/admin-kiosko/database";
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
  searchParams?: Promise<{ error?: string; inspector?: string }>;
}) {
  const isAuthenticated = await isAdminAuthenticated();
  const params = await searchParams;

  if (!isAuthenticated) {
    return <LoginPanel hasError={params?.error === "1"} />;
  }

  const [dashboard, executive, productionOps] = await Promise.all([
    getAdminDashboardSummary(),
    getExecutiveDashboardMetrics(),
    getDashboardProductionOperationalMetrics(),
  ]);
  const summary = dashboard.ok ? dashboard.data : null;
  const metrics = executive.ok ? executive.data : null;
  const productionMetrics = productionOps.ok ? productionOps.data : null;
  const inspectorMode = params?.inspector === "1";
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
  const redAlerts = metrics?.alerts.filter((alert) => alert.severity === "incidencia") || [];
  const yellowAlerts = metrics?.alerts.filter((alert) => alert.severity === "revisar") || [];
  const semaphore = redAlerts.length
    ? { dot: "bg-[#d94b2b]", label: "Rojo", title: "Incidencias que requieren actuación", text: "Existen incidencias sanitarias o técnicas que requieren seguimiento.", className: "border-[#d94b2b]/35 bg-[#d94b2b]/10 text-[#f2c6bb]" }
    : yellowAlerts.length
      ? { dot: "bg-amber-400", label: "Amarillo", title: "Pendientes administrativos", text: "Hay registros o documentación pendientes, sin incumplimiento sanitario abierto.", className: "border-amber-300 bg-amber-100 text-amber-950" }
      : { dot: "bg-emerald-400", label: "Verde", title: "Todo correcto", text: "Registros principales al día y sin incidencias abiertas.", className: "border-emerald-300 bg-emerald-100 text-emerald-950" };
  const appccPercent = summary
    ? Math.max(0, 100 - (redAlerts.length * 20) - (yellowAlerts.length * 3))
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
  const executiveChecks = [
    { label: "Temperaturas", icon: "T", status: summary?.incidentTemperatureRecords ? "incidencia" : metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/temperaturas") ? "revisar" : "correcto" },
    { label: "Limpieza", icon: "L", status: metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/limpieza") ? "revisar" : "correcto" },
    { label: "Aceite", icon: "A", status: metrics?.dailyPending.some((alert) => alert.href === "/admin-kiosko/aceite-freidora") ? "revisar" : "correcto" },
    { label: "Recepciones", icon: "R", status: metrics?.rejectedReceptions ? "incidencia" : "correcto" },
    { label: "Incidencias", icon: "I", status: summary?.openIncidents ? "incidencia" : "correcto" },
    { label: "Documentación", icon: "D", status: metrics?.pendingDocuments ? "revisar" : "correcto" },
  ];
  const kpiCards = [
    ["Documentación", `${documentationPercent}%`],
    ["Temperaturas", `${metrics?.temperatureCompliancePercent ?? 0}%`],
    ["Recepciones", `${metrics?.receptionCompliancePercent ?? 100}%`],
    ["Limpieza", `${metrics?.cleaningCompliancePercent ?? 0}%`],
    ["Incidencias", String(metrics?.openIncidents ?? summary?.openIncidents ?? 0)],
    ["Stock crítico", String(metrics?.criticalStockProducts ?? 0)],
    ["Caducidades", String(metrics?.expiringProducts ?? 0)],
    ["Lotes activos", String(metrics?.activeLots ?? 0)],
    ["Lotes caducados", String(metrics?.expiredLots ?? 0)],
    ["Lotes próximos", String(metrics?.expiringLots ?? 0)],
    ["Lotes agotados", String(metrics?.exhaustedLots ?? 0)],
    ["Lotes sin caducidad", String(metrics?.lotsWithoutExpiry ?? 0)],
    ["Lotes internos activos", String(productionMetrics?.activeInternalLots ?? metrics?.activeInternalBatches ?? 0)],
    ["Producciones hoy", String(productionMetrics?.productionsToday ?? 0)],
    ["Kg elaborados", String(productionMetrics?.elaboratedKgToday ?? 0)],
    ["Consumos FEFO", String(productionMetrics?.fefoConsumptionsToday ?? 0)],
    ["Ingredientes agotados", String(productionMetrics?.exhaustedIngredients ?? 0)],
    ["Descongelados abiertos", String(metrics?.openDefrostedBatches ?? 0)],
    ["Próximos a consumir", String(metrics?.productsToConsumeSoon ?? 0)],
    ["Mermas del mes", String(metrics?.monthlyWasteMovements ?? 0)],
  ];
  const statusStyle = (status: string) => status === "incidencia"
    ? "border-[#d94b2b]/35 bg-[#d94b2b]/10 text-[#f2c6bb]"
    : status === "revisar"
      ? "border-amber-300 bg-amber-100 text-amber-950"
      : "border-emerald-300 bg-emerald-100 text-emerald-950";

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Panel APPCC KIOSKO ALFRESKO"
        description="Control sanitario digital · Responsable: F. Javier Bocanegra Sanjuan · DNI 75.136.778-X"
        inspectorMode={inspectorMode}
        role={inspectorMode ? "inspector" : "owner"}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-8">
          {!inspectorMode ? (
            <section className="grid gap-4 md:grid-cols-3">
              {[
                ["Panel Owner", "Gestión completa del ERP APPCC.", "/admin-kiosko/owner"],
                ["Panel Empleado", "Registros diarios, etiquetas, mermas y producción.", "/admin-kiosko/empleado"],
                ["Modo Inspector", "Vista limpia para inspección sanitaria.", "/admin-kiosko/inspeccion"],
              ].map(([title, text, href]) => (
                <a key={href} href={href} className="rounded-[1.8rem] border border-white/10 bg-[#fffaf4] p-6 text-stone-950 transition hover:border-[#d94b2b]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Acceso por rol</p>
                  <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em]">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-stone-700">{text}</p>
                </a>
              ))}
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Estado APPCC</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`h-4 w-4 rounded-full ${semaphore.dot}`} />
                  <h2 className="text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{semaphore.title}</h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">{semaphore.text}</p>
              </div>
              <a href={inspectorMode ? "/admin-kiosko" : "/admin-kiosko?inspector=1"} className="inline-flex w-fit rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                {inspectorMode ? "Modo completo" : "Modo Inspector"}
              </a>
            </div>

            {summary ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <article className="rounded-[1.3rem] border border-white/10 bg-[#0d0d0d] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">APPCC completo</p>
                    <p className="mt-3 text-2xl font-black leading-tight text-white">{appccPercent}%</p>
                  </article>
                  {kpiCards.map(([label, value]) => (
                    <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#0d0d0d] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                      <p className="mt-3 text-2xl font-black leading-tight text-white">{value}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-amber-300/30 bg-amber-100 p-5 text-amber-950">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-[-0.03em]">Pendientes antes de finalizar la jornada</h3>
                      <p className="mt-2 text-sm leading-6">Controles ordinarios que pueden completarse durante el servicio.</p>
                    </div>
                    <a href="/admin-kiosko/registros" className="w-fit rounded-full border border-amber-950 bg-amber-950 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                      Ver registros
                    </a>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    {dailyPending.map((item) => (
                      <a key={item.label} href={item.href} className="rounded-[1.2rem] border border-amber-300 bg-white p-4 transition hover:border-amber-950">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em]">{item.status.includes("Registrado") || item.status.includes("No constan") ? "✓" : "□"} {item.label}</p>
                        <p className="mt-2 text-sm font-semibold">{item.status}</p>
                      </a>
                    ))}
                  </div>
                </div>

                {!inspectorMode ? (
                  <>
                    {metrics ? (
                      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-5">
                        <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Producción interna</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          {[
                            ["Hoy", metrics.productionToday],
                            ["Semana", metrics.productionWeek],
                            ["Mes", metrics.productionMonth],
                            ["Kg transformados", `${metrics.transformedKgMonth} kg`],
                            ["Unidades producidas", metrics.producedUnitsMonth],
                            ["Merma", metrics.wasteQuantityMonth],
                            ["Coste medio", `${metrics.averageProductionCost.toFixed(2)} €`],
                            ["Stock producido", metrics.producedStock],
                          ].map(([label, value]) => (
                            <article key={label} className="rounded-[1.1rem] border border-white/10 bg-white/6 p-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
                              <p className="mt-2 text-lg font-black text-white">{value}</p>
                            </article>
                          ))}
                        </div>
                        {metrics.recentProductions.length ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {metrics.recentProductions.map((batch) => (
                              <a key={batch.id} href={`/admin-kiosko/produccion?batch=${batch.id}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b]">
                                <p className="font-black text-white">{batch.batch_code} · {batch.output_product}</p>
                                <p className="mt-1">{batch.production_date} · {batch.output_quantity ?? 0} {batch.output_unit || "ud"} · {batch.storage_state || "refrigerado"}</p>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

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
                            ) : <p className="mt-2 text-sm font-semibold text-stone-400">Registro pendiente de consolidar.</p>}
                          </article>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

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

                {!inspectorMode ? <TemperatureAlerts alerts={summary.openAlerts} /> : null}

                {!inspectorMode && metrics?.alerts.length ? (
                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-5">
                    <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Seguimiento operativo</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {metrics.alerts.slice(0, 10).map((alert) => (
                        <a key={alert.id} href={alert.href} className={`rounded-[1.2rem] border p-4 text-sm transition ${statusStyle(alert.severity)}`}>
                          <p className="font-black">{alert.title}</p>
                          <p className="mt-1">{alert.detail}</p>
                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em]">{alert.type} · {alert.severity === "incidencia" ? "actuación" : "administrativo"}</p>
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

          {!inspectorMode ? internalAdminSections.map((section) => (
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
          )) : null}
        </div>
      </section>
    </main>
  );
}
