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
  };
}

function buildDownloadHref(filters: AppccRecordFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/admin-kiosko/registros/descargar?${params.toString()}`;
}

export default async function RegistrosAppccPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = parseFilters(params);
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
                <p className="mt-2 text-sm leading-6 text-stone-300">Usa los filtros y descarga el CSV con el mismo resultado.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={buildDownloadHref(filters)} className="inline-flex items-center justify-center rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950">
                  Descargar CSV
                </a>
                <button type="button" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                  PDF mensual próximamente
                </button>
              </div>
            </div>

            <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                <input name="responsible" defaultValue={filters.responsible} placeholder="Javi..." className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
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
                        <td className="px-3 py-3">{record.status || "-"}</td>
                        <td className="px-3 py-3">{record.responsible || "-"}</td>
                        <td className="rounded-r-2xl px-3 py-3 text-stone-700">{record.observations || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length ? <p className="py-8 text-center text-sm text-stone-300">No hay registros para estos filtros.</p> : null}
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
