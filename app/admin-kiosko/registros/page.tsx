import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getAppccRecords, type AppccRecordFilters, type AppccRecordType } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Registros APPCC | Panel interno",
  description: "Consulta y descarga interna de registros APPCC.",
};

const recordTypes: Array<{ value: AppccRecordType | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "temperaturas", label: "Temperaturas" },
  { value: "limpieza", label: "Limpieza" },
  { value: "aceite-freidora", label: "Aceite freidora" },
  { value: "recepcion-mercancia", label: "Recepción mercancía" },
  { value: "incidencias", label: "Incidencias" },
  { value: "checklists", label: "Checklists" },
];

function getMadridMonthDefaults() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    year: parts.find((part) => part.type === "year")?.value || String(new Date().getFullYear()),
    month: parts.find((part) => part.type === "month")?.value || String(new Date().getMonth() + 1).padStart(2, "0"),
  };
}

function getMadridToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function buildQuickHref(range: "today" | "week" | "month" | "year") {
  const today = getMadridToday();
  const year = today.slice(0, 4);
  const month = today.slice(5, 7);
  const params = new URLSearchParams({ type: "todos" });

  if (range === "today") {
    params.set("dateFrom", today);
    params.set("dateTo", today);
  }

  if (range === "week") {
    params.set("dateFrom", shiftDate(today, -6));
    params.set("dateTo", today);
  }

  if (range === "month") {
    params.set("dateFrom", `${year}-${month}-01`);
    params.set("dateTo", today);
  }

  if (range === "year") {
    params.set("dateFrom", `${year}-01-01`);
    params.set("dateTo", today);
  }

  return `/admin-kiosko/registros?${params.toString()}`;
}

function parseFilters(params?: { [key: string]: string | string[] | undefined }): AppccRecordFilters {
  const value = (key: string) => {
    const raw = params?.[key];
    return Array.isArray(raw) ? raw[0] || "" : raw || "";
  };

  const type = value("type") as AppccRecordFilters["type"];

  return {
    type: type || "todos",
    dateFrom: value("dateFrom"),
    dateTo: value("dateTo"),
    equipment: value("equipment"),
    status: value("status"),
    responsible: value("responsible"),
    includeArchivedEquipment: value("includeArchivedEquipment") === "1",
  };
}

function getParam(params: { [key: string]: string | string[] | undefined } | undefined, key: string) {
  const raw = params?.[key];
  return Array.isArray(raw) ? raw[0] || "" : raw || "";
}

function buildDownloadHref(filters: AppccRecordFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, key === "includeArchivedEquipment" ? "1" : String(value));
    }
  });

  return `/admin-kiosko/registros/descargar?${params.toString()}`;
}

function buildReportHref(filters: AppccRecordFilters, month: string, year: string) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, key === "includeArchivedEquipment" ? "1" : String(value));
    }
  });

  if (month) {
    params.set("month", month);
  }

  if (year) {
    params.set("year", year);
  }

  return `/admin-kiosko/registros/informe?${params.toString()}`;
}

function buildPdfHref(filters: AppccRecordFilters, month: string, year: string) {
  return buildReportHref(filters, month, year).replace("/registros/informe", "/registros/pdf");
}

export default async function RegistrosAppccPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = parseFilters(params);
  const monthDefaults = getMadridMonthDefaults();
  const reportMonth = getParam(params, "month") || monthDefaults.month;
  const reportYear = getParam(params, "year") || monthDefaults.year;
  const records = await getAppccRecords(filters);
  const rows = records.ok ? records.data : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Registros APPCC"
        description="Consulta, filtra y descarga registros sanitarios del panel interno."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Filtros</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">Usa los filtros para consultar registros, descargar CSV o preparar el informe mensual APPCC.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={buildDownloadHref(filters)} className="inline-flex items-center justify-center rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950">
                  Descargar CSV
                </a>
                <a href={buildReportHref(filters, reportMonth, reportYear)} className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12">
                  Ver informe mensual
                </a>
                <a href={buildPdfHref(filters, reportMonth, reportYear)} className="inline-flex items-center justify-center rounded-full border border-[#f2c6bb] bg-[#fff8ef] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-stone-950 transition hover:bg-white">
                  Generar PDF APPCC
                </a>
              </div>
            </div>

            <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
                {[
                  ["Hoy", buildQuickHref("today")],
                  ["Semana", buildQuickHref("week")],
                  ["Mes", buildQuickHref("month")],
                  ["Año", buildQuickHref("year")],
                ].map(([label, href]) => (
                  <a key={label} href={href} className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                    {label}
                  </a>
                ))}
              </div>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Tipo
                <select name="type" defaultValue={filters.type || "todos"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
                  {recordTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Desde
                <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Hasta
                <input type="date" name="dateTo" defaultValue={filters.dateTo} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Equipo / área
                <input name="equipment" defaultValue={filters.equipment} placeholder="Botellero, Cocina..." className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Estado
                <select name="status" defaultValue={filters.status} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
                  <option value="">Todos</option>
                  <option value="correcto">Correcto</option>
                  <option value="revisar">Revisar</option>
                  <option value="incidencia">Incidencia</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Responsable
                <input name="responsible" defaultValue={filters.responsible} placeholder="F. Javier Bocanegra Sanjuan" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Mes informe
                <select name="month" defaultValue={reportMonth} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
                  {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-200">
                Año informe
                <input name="year" type="number" min="2026" defaultValue={reportYear} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200 md:col-span-2 xl:col-span-2">
                <input type="checkbox" name="includeArchivedEquipment" value="1" defaultChecked={Boolean(filters.includeArchivedEquipment)} className="h-5 w-5 accent-[#d94b2b]" />
                Incluir equipos archivados
              </label>
              <div className="flex gap-3 md:col-span-2 xl:col-span-6">
                <button type="submit" className="inline-flex flex-1 items-center justify-center rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950">
                  Filtrar
                </button>
                <a href="/admin-kiosko/registros" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12">
                  Limpiar
                </a>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Registros</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">{rows.length} registros encontrados.</p>
              </div>
            </div>

            {records.ok ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[58rem] w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Hora</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Equipo / área</th>
                      <th className="px-3 py-2">Dato</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Responsable</th>
                      <th className="px-3 py-2">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((record) => (
                      <tr key={`${record.type}-${record.id}`} className="bg-[#fffaf4] text-stone-950">
                        <td className="rounded-l-2xl px-3 py-3 font-semibold">{record.record_date}</td>
                        <td className="px-3 py-3">{record.record_time?.slice(0, 5) || "-"}</td>
                        <td className="px-3 py-3 font-semibold">{record.typeLabel}</td>
                        <td className="px-3 py-3">{record.subject}</td>
                        <td className="px-3 py-3 font-semibold">{record.main}</td>
                        <td className="px-3 py-3">{record.status || "Registro disponible"}</td>
                        <td className="px-3 py-3">{record.responsible || "Responsable no consignado"}</td>
                        <td className="rounded-r-2xl px-3 py-3 text-stone-700">{record.observations || "Observaciones no consignadas"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length ? <p className="py-8 text-center text-sm text-stone-300">Registro preparado para los filtros seleccionados. Ajusta fechas o añade nuevos controles.</p> : null}
              </div>
            ) : (
              <p className="mt-5 rounded-[1.3rem] border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
                No se han podido cargar los registros: {records.error}
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
