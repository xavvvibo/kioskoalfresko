import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getMonthlyAppccReport, type AppccRecordFilters } from "@/lib/admin-kiosko/database";
import { signMonthlyAppccReportAction } from "../../actions";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Informe mensual APPCC | Panel interno",
  description: "Informe mensual imprimible de registros APPCC.",
  robots: {
    index: false,
    follow: false,
  },
};

function parseFilters(params?: { [key: string]: string | string[] | undefined }): AppccRecordFilters & { year?: number; month?: number } {
  const value = (key: string) => {
    const raw = params?.[key];
    return Array.isArray(raw) ? raw[0] || "" : raw || "";
  };

  const year = Number(value("year"));
  const month = Number(value("month"));

  return {
    type: (value("type") || "todos") as AppccRecordFilters["type"],
    equipment: value("equipment"),
    status: value("status"),
    responsible: value("responsible"),
    includeArchivedEquipment: value("includeArchivedEquipment") === "1",
    year: Number.isFinite(year) && year > 0 ? year : undefined,
    month: Number.isFinite(month) && month > 0 ? month : undefined,
  };
}

function time(value: string | null) {
  return value?.slice(0, 5) || "-";
}

function statusClass(status: string | null) {
  if (status === "correcto" || status === "solventado") {
    return "bg-emerald-50 text-emerald-900";
  }

  if (status === "revisar" || status === "en_proceso" || status === "aviso") {
    return "bg-amber-50 text-amber-950";
  }

  if (status === "incidencia" || status === "pendiente") {
    return "bg-red-50 text-red-900";
  }

  return "bg-stone-100 text-stone-700";
}

function parseTemperature(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const temperature = Number(normalized);
  return Number.isFinite(temperature) ? temperature : null;
}

function formatMetric(value: number | null, suffix = "") {
  return value === null ? "-" : `${value.toFixed(1)}${suffix}`;
}

export default async function InformeMensualAppccPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPermission("appcc:manage");
  const filters = parseFilters(await searchParams);
  const report = await getMonthlyAppccReport(filters);

  if (!report.ok) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-[#d94b2b]/40 bg-[#151515] p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f2c6bb]">Informe APPCC</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">No se ha podido generar el informe</h1>
          <p className="mt-4 text-sm leading-6 text-stone-300">{report.error}</p>
          <a href="/admin-kiosko/registros" className="mt-6 inline-flex rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
            Volver a registros
          </a>
        </section>
      </main>
    );
  }

  const data = report.data;
  const monthlySignature = data.signature;
  const signedRecords = data.records.filter((record) => record.signed_by || record.signed_at || record.signature_note);
  const temperatureValues = data.temperatures
    .map((record) => parseTemperature(record.main))
    .filter((value): value is number => value !== null);
  const minTemperature = temperatureValues.length ? Math.min(...temperatureValues) : null;
  const maxTemperature = temperatureValues.length ? Math.max(...temperatureValues) : null;
  const avgTemperature = temperatureValues.length
    ? temperatureValues.reduce((total, value) => total + value, 0) / temperatureValues.length
    : null;
  const controlledEquipment = new Set(data.temperatures.map((record) => record.subject)).size;
  const outOfRangeRecords = data.temperatures.filter((record) => record.status === "revisar" || record.status === "incidencia");
  const incidentRecords = data.temperatures.filter((record) => record.status === "incidencia");

  return (
    <main className="min-h-screen bg-[#ece5da] px-4 py-8 text-stone-950 print:bg-white print:px-0 print:py-0">
      <style>{`
        @page {
          size: A4;
          margin: 14mm 12mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          .print-page {
            width: 100%;
            padding: 0 !important;
          }

          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-page-break {
            break-before: page;
            page-break-before: always;
          }

          table {
            page-break-inside: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <section className="print-page mx-auto max-w-6xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] print:max-w-none print:shadow-none md:p-10">
        <div className="mb-6 flex flex-col gap-3 border-b border-stone-200 pb-6 print:hidden md:flex-row md:items-center md:justify-between">
          <a href="/admin-kiosko/registros" className="inline-flex w-fit rounded-full border border-stone-950/10 bg-stone-100 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-stone-950">
            Volver a registros
          </a>
          <PrintButton />
        </div>

        <header className="print-section min-h-[34rem] border-b border-stone-300 pb-10 print:min-h-[20rem]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d94b2b]">Panel interno · Control sanitario</p>
          <h1 className="mt-8 text-5xl font-black uppercase leading-[0.95] tracking-[-0.05em] md:text-7xl">
            KIOSKO ALFRESKO
          </h1>
          <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] text-stone-800 md:text-5xl">
            Registro APPCC mensual
          </h2>
          <dl className="mt-10 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Establecimiento</dt>
              <dd className="mt-2 text-xl font-black uppercase">KIOSKO ALFRESKO</dd>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Responsable</dt>
              <dd className="mt-2 text-xl font-black">F. Javier Bocanegra Sanjuan · DNI 75.136.778-X</dd>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Periodo</dt>
              <dd className="mt-2 text-xl font-black uppercase">{data.periodLabel}</dd>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Fecha de generación</dt>
              <dd className="mt-2 text-xl font-black">{data.generatedAt}</dd>
            </div>
          </dl>
        </header>

        <section className="print-section border-b border-stone-300 py-8">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Resumen ejecutivo</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total registros", data.summary.totalRecords],
              ["Equipos controlados", controlledEquipment],
              ["Temperatura mínima", formatMetric(minTemperature, " ºC")],
              ["Temperatura máxima", formatMetric(maxTemperature, " ºC")],
              ["Temperatura media", formatMetric(avgTemperature, " ºC")],
              ["Incidencias detectadas", incidentRecords.length + data.summary.pendingAlerts],
              ["Registros fuera de rango", outOfRangeRecords.length],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-stone-300 py-8 print-page-break">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Tabla completa de temperaturas</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-300 text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Hora</th>
                  <th className="py-2 pr-3">Equipo</th>
                  <th className="py-2 pr-3">Temperatura</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Responsable</th>
                  <th className="py-2 pr-3">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {data.temperatures.map((record) => (
                  <tr key={`${record.type}-${record.id}`} className="border-b border-stone-100 align-top">
                    <td className="py-3 pr-3 font-semibold">{record.record_date}</td>
                    <td className="py-3 pr-3">{time(record.record_time)}</td>
                    <td className="py-3 pr-3">{record.subject}</td>
                    <td className="py-3 pr-3 font-black">{record.main}</td>
                    <td className="py-3 pr-3"><span className={`rounded-full px-2 py-1 font-black uppercase ${statusClass(record.status)}`}>{record.status || "-"}</span></td>
                    <td className="py-3 pr-3">{record.responsible || "-"}</td>
                    <td className="py-3 pr-3 text-stone-700">{record.observations || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.temperatures.length ? <p className="py-6 text-sm text-stone-600">No hay registros de temperatura para este periodo y filtros.</p> : null}
          </div>
        </section>

        <section className="print-section border-b border-stone-300 py-8">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Resumen de incidencias</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Registros con alerta o fuera de rango durante el periodo seleccionado.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-300 text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Hora</th>
                  <th className="py-2 pr-3">Equipo</th>
                  <th className="py-2 pr-3">Temperatura</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Responsable</th>
                  <th className="py-2 pr-3">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {outOfRangeRecords.map((record) => (
                  <tr key={`incident-${record.type}-${record.id}`} className="border-b border-stone-100 align-top">
                    <td className="py-3 pr-3 font-semibold">{record.record_date}</td>
                    <td className="py-3 pr-3">{time(record.record_time)}</td>
                    <td className="py-3 pr-3">{record.subject}</td>
                    <td className="py-3 pr-3 font-black">{record.main}</td>
                    <td className="py-3 pr-3"><span className={`rounded-full px-2 py-1 font-black uppercase ${statusClass(record.status)}`}>{record.status || "-"}</span></td>
                    <td className="py-3 pr-3">{record.responsible || "-"}</td>
                    <td className="py-3 pr-3 text-stone-700">{record.observations || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!outOfRangeRecords.length ? <p className="py-6 text-sm text-stone-600">No hay registros con alerta en este periodo.</p> : null}
          </div>
        </section>

        <section className="print-section border-b border-stone-300 py-8">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Alertas técnicas</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-300 text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  <th className="py-2 pr-3">Equipo</th>
                  <th className="py-2 pr-3">Temperatura</th>
                  <th className="py-2 pr-3">Nivel</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Acción correctiva</th>
                </tr>
              </thead>
              <tbody>
                {data.alerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-stone-100 align-top">
                    <td className="py-3 pr-3 font-semibold">{alert.equipment}</td>
                    <td className="py-3 pr-3">{alert.temperature !== null ? `${alert.temperature} ºC` : "-"}</td>
                    <td className="py-3 pr-3">{alert.alert_level}</td>
                    <td className="py-3 pr-3"><span className={`rounded-full px-2 py-1 font-black uppercase ${statusClass(alert.status)}`}>{alert.status}</span></td>
                    <td className="py-3 pr-3">{alert.alert_date}{alert.alert_time ? ` · ${time(alert.alert_time)}` : ""}</td>
                    <td className="py-3 pr-3 text-stone-700">{alert.corrective_action || alert.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.alerts.length ? <p className="py-6 text-sm text-stone-600">No hay alertas técnicas para este periodo y filtros.</p> : null}
          </div>
        </section>

        <section className="print-section border-b border-stone-300 py-8">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Acciones correctoras</h2>
          <div className="mt-5 grid gap-3">
            {data.alerts.filter((alert) => alert.corrective_action).length ? data.alerts.filter((alert) => alert.corrective_action).map((alert) => (
              <article key={`corrective-${alert.id}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm font-black">{alert.equipment} · {alert.alert_date}</p>
                <p className="mt-2 text-sm text-stone-700">{alert.corrective_action}</p>
              </article>
            )) : <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">No constan acciones correctoras en el periodo.</p>}
          </div>
        </section>

        <section className="print-section border-b border-stone-300 py-8">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Declaración final</h2>
          <p className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-base font-semibold leading-7 text-stone-800">
            Se revisan los registros APPCC del periodo indicado y se consideran válidos para el control sanitario interno.
          </p>
        </section>

        <section className="print-section py-8">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Firma responsable</h2>
          {monthlySignature ? (
            <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950">
              <p className="text-[11px] font-black uppercase tracking-[0.16em]">INFORME FIRMADO</p>
              <p className="mt-2 text-sm font-black">{monthlySignature.signed_by}</p>
              <p className="mt-1 text-sm">{monthlySignature.signed_at}</p>
              <p className="mt-2 text-sm">{monthlySignature.signature_note || "Sin observaciones de firma."}</p>
            </div>
          ) : signedRecords.length ? (
            <div className="mt-4 grid gap-3">
              {signedRecords.map((record) => (
                <article key={`signature-${record.type}-${record.id}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-black">{record.signed_by || "Responsable sin nombre"}{record.signed_at ? ` · ${record.signed_at}` : ""}</p>
                  <p className="mt-2 text-sm text-stone-700">{record.signature_note || "Registro firmado."}</p>
                </article>
              ))}
            </div>
          ) : (
            <>
              <form action={signMonthlyAppccReportAction} className="mt-5 grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 print:hidden">
                <input type="hidden" name="year" value={data.year} />
                <input type="hidden" name="month" value={data.month} />
                <label className="grid gap-2 text-sm font-semibold">
                  Responsable
                  <input name="signed_by" defaultValue="F. Javier Bocanegra Sanjuan" className="rounded-xl border border-stone-300 px-4 py-3" />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Observaciones de firma
                  <textarea name="signature_note" rows={3} className="rounded-xl border border-stone-300 px-4 py-3" />
                </label>
                <button type="submit" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                  Firmar informe
                </button>
              </form>
              <div className="mt-6 grid gap-8 sm:grid-cols-3">
                <div className="border-b border-stone-400 pb-10"><p className="text-sm font-black uppercase tracking-[0.12em] text-stone-700">Responsable:</p></div>
                <div className="border-b border-stone-400 pb-10"><p className="text-sm font-black uppercase tracking-[0.12em] text-stone-700">Fecha:</p></div>
                <div className="border-b border-stone-400 pb-10"><p className="text-sm font-black uppercase tracking-[0.12em] text-stone-700">Firma:</p></div>
              </div>
            </>
          )}
        </section>

        <footer className="border-t border-stone-300 pt-5 text-xs text-stone-500">
          Documento generado desde panel interno KIOSKO ALFRESKO · Responsable: F. Javier Bocanegra Sanjuan · DNI 75.136.778-X
        </footer>
      </section>
    </main>
  );
}
