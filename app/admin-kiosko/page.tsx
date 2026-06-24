import type { Metadata } from "next";
import { internalAdminSections } from "@/content/site";
import { isAdminAuthenticated } from "@/lib/admin-kiosko/auth";
import { getAdminDashboardSummary } from "@/lib/admin-kiosko/database";
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

  const dashboard = await getAdminDashboardSummary();
  const summary = dashboard.ok ? dashboard.data : null;
  const semaphore = !summary || summary.pendingAlerts > 0 || summary.incidentTemperatureRecords > 0
    ? { label: "Rojo", text: "Alertas pendientes o incidencias graves registradas", className: "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]" }
    : summary.inProgressAlerts > 0 || summary.reviewingTemperatureRecords > 0
      ? { label: "Naranja", text: "Alertas en proceso o registros de temperatura en revisión", className: "border-amber-300 bg-amber-100 text-amber-950" }
      : { label: "Verde", text: "Sin alertas pendientes ni temperaturas en revisión", className: "border-emerald-300 bg-emerald-100 text-emerald-950" };

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Panel interno Kiosko Alfresko"
        description="Control sanitario, registros diarios y documentación operativa."
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-8">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Estado sanitario general</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">Estado rápido de temperaturas, alertas técnicas y registros recientes.</p>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] ${semaphore.className}`}>
                Semáforo {semaphore.label}
              </span>
            </div>

            {summary ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Registros de temperatura hoy", String(summary.todayTemperatureRecords)],
                    ["Último registro de temperatura", summary.lastTemperatureRecord ? `${summary.lastTemperatureRecord.equipment} · ${summary.lastTemperatureRecord.temperature} ºC` : "Sin registros"],
                    ["Equipos activos controlados", String(summary.activeEquipmentCount)],
                    ["Alertas pendientes", String(summary.pendingAlerts)],
                    ["Alertas en proceso", String(summary.inProgressAlerts)],
                    ["Alertas solventadas este mes", String(summary.resolvedAlertsThisMonth)],
                  ].map(([label, value]) => (
                    <article key={label} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                      <p className="mt-3 text-xl font-black leading-tight text-white">{value}</p>
                    </article>
                  ))}
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
                        <p className="mt-2 text-2xl font-black">{record.temperature !== null ? `${record.temperature} ºC` : "Pendiente"}</p>
                        <p className="mt-1 text-xs font-semibold text-stone-600">
                          {record.record_date ? `${record.record_date}${record.record_time ? ` · ${record.record_time.slice(0, 5)}` : ""} · ${record.status || "sin estado"}` : "Pendiente de registro"}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <TemperatureAlerts alerts={summary.openAlerts} />
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
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">
                        Pendiente de enlazar
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
