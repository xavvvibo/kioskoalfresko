import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getAdminDashboardSummary, getAppccRecords, getLabelRecords, getProductionBatches, getTraceabilityRows, type AppccRecord } from "@/lib/admin-kiosko/database";
import { getDocumentStats } from "@/lib/admin-kiosko/documents";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = { title: "Calendario APPCC | Panel interno", description: "Vista mensual de registros APPCC." };

function getMadridMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function monthRange(year: number, month: number) {
  const days = new Date(year, month, 0).getDate();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
  return { days, start, end };
}

function configuredClosedStatus(day: string) {
  const date = new Date(`${day}T12:00:00`);
  const weekday = date.getDay();
  const dayNumber = date.getDate();

  if (weekday === 1 || weekday === 2) return { label: "⚫ Descanso", className: "border-stone-500 bg-stone-200 text-stone-900" };
  if ((weekday === 0 && [14, 21, 28].includes(dayNumber)) || (weekday === 6 && dayNumber === 20)) {
    return { label: "⚪ Cerrado", className: "border-stone-300 bg-white text-stone-900" };
  }

  return null;
}

function dayStatus(day: string, records: AppccRecord[]) {
  const configured = configuredClosedStatus(day);
  if (configured) return configured;
  if (records.some((record) => record.status === "incidencia")) return { label: "🔴 Incidencias", className: "border-red-300 bg-red-50 text-red-900" };
  if (!records.length || records.some((record) => record.status === "revisar")) return { label: "🟡 Pendiente", className: "border-amber-300 bg-amber-50 text-amber-950" };
  return { label: "🟢 Completo", className: "border-emerald-300 bg-emerald-50 text-emerald-950" };
}

function group(records: AppccRecord[], label: string) {
  return records.filter((record) => record.typeLabel === label);
}

export default async function CalendarioAppccPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string; day?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const current = getMadridMonth();
  const year = Number(params?.year) || current.year;
  const month = Number(params?.month) || current.month;
  const { days, start, end } = monthRange(year, month);
  const selectedDay = params?.day || start;
  const [result, dashboard, productionsResult, labelsResult, traceabilityResult] = await Promise.all([
    getAppccRecords({ dateFrom: start, dateTo: end }),
    getAdminDashboardSummary(),
    getProductionBatches(200),
    getLabelRecords(100),
    getTraceabilityRows({ date: selectedDay }),
  ]);
  const records = result.ok ? result.data : [];
  const productions = productionsResult.ok ? productionsResult.data : [];
  const labels = labelsResult.ok ? labelsResult.data : [];
  const traceability = traceabilityResult.ok ? traceabilityResult.data : [];
  const documents = getDocumentStats();
  const selectedRecords = records.filter((record) => record.record_date === selectedDay);
  const selectedProductions = productions.filter((batch) => batch.production_date === selectedDay);
  const selectedLabels = labels.filter((label) => label.created_at.slice(0, 10) === selectedDay);
  const dayGroups = Array.from({ length: days }, (_, index) => {
    const day = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    return { day, status: dayStatus(day, records.filter((record) => record.record_date === day)) };
  });
  const completeDays = dayGroups.filter((day) => day.status.label.includes("Completo")).length;
  const pendingDays = dayGroups.filter((day) => day.status.label.includes("Pendiente")).length;
  const incidentDays = dayGroups.filter((day) => day.status.label.includes("Incidencias")).length;
  const restDays = dayGroups.filter((day) => day.status.label.includes("Descanso")).length;
  const closedDays = dayGroups.filter((day) => day.status.label.includes("Cerrado")).length;
  const latestReview = dashboard.ok && dashboard.data.latestMonthlySignature
    ? `${dashboard.data.latestMonthlySignature.month}/${dashboard.data.latestMonthlySignature.year} · ${dashboard.data.latestMonthlySignature.signed_by}`
    : "Pendiente";

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Calendario APPCC" description="Vista mensual para revisión rápida durante inspecciones." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{month.toString().padStart(2, "0")} / {year}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Mes actual", `${month.toString().padStart(2, "0")} / ${year}`],
                ["Días completos", String(completeDays)],
                ["Días pendientes", String(pendingDays)],
                ["Días con incidencia", String(incidentDays)],
                ["Descanso", String(restDays)],
                ["Cerrados", String(closedDays)],
                ["Última revisión", latestReview],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.1rem] border border-white/10 bg-white/6 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-sm font-black text-white">{value}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: days }, (_, index) => {
                const day = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
                const dayRecords = records.filter((record) => record.record_date === day);
                const status = dayStatus(day, dayRecords);
                return (
                  <Link key={day} href={`/admin-kiosko/calendario?year=${year}&month=${month}&day=${day}`} className={`rounded-2xl border p-3 ${status.className}`}>
                    <p className="text-2xl font-black">{index + 1}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em]">{status.label}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{selectedDay}</h2>
            {["Temperaturas", "Limpieza", "Aceite freidora", "Recepción mercancía", "Incidencias"].map((label) => {
              const items = group(selectedRecords, label);
              return (
                <div key={label} className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</h3>
                  {items.length ? (
                    <div className="mt-3 grid gap-2">
                      {items.map((record) => (
                        <p key={`${record.type}-${record.id}`} className="text-sm text-stone-200">{record.subject} · {record.main} · {record.status || "Registro disponible"}</p>
                      ))}
                    </div>
                  ) : <p className="mt-3 text-sm text-stone-400">Último registro no disponible para esta fecha.</p>}
                </div>
              );
            })}
            <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Producción</h3>
              {selectedProductions.length ? (
                <div className="mt-3 grid gap-2">
                  {selectedProductions.map((batch) => (
                    <Link key={batch.id} href={`/admin-kiosko/produccion?batch=${batch.id}`} className="text-sm text-stone-200">{batch.batch_code} · {batch.output_product} · {batch.output_quantity ?? 0} {batch.output_unit || "ud"}</Link>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-stone-400">Producción no registrada para esta jornada.</p>}
            </div>
            <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Etiquetas</h3>
              {selectedLabels.length ? (
                <div className="mt-3 grid gap-2">
                  {selectedLabels.map((label) => (
                    <Link key={label.id} href={`/admin-kiosko/etiquetas?id=${label.id}`} className="text-sm text-stone-200">{label.model} · {label.product || "Producto"} · lote {label.batch || "no consignado"}</Link>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-stone-400">Etiquetas no emitidas en esta jornada.</p>}
            </div>
            <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Documentación</h3>
              <p className="mt-3 text-sm text-stone-300">{documents.available} disponibles · {documents.pending + documents.expired + documents.review} pendientes o en revisión.</p>
              <Link href="/admin-kiosko/documentacion" className="mt-3 inline-flex rounded-full border border-white/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Abrir documentación</Link>
            </div>
            <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Trazabilidad</h3>
              {traceability.length ? (
                <div className="mt-3 grid gap-2">
                  {traceability.slice(0, 6).map((row) => (
                    <Link key={row.id} href={`/admin-kiosko/trazabilidad?q=${encodeURIComponent(row.batch_number || row.product_name || "")}`} className="text-sm text-stone-200">{row.product_name || "Producto"} · lote {row.batch_number || "no consignado"}</Link>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-stone-400">Trazabilidad sin movimientos en esta fecha.</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
