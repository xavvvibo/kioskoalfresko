import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentPrintJobs, type PrintJobPayload } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";
import { ReprintPrintJobButton } from "./ReprintPrintJobButton";

export const metadata: Metadata = {
  title: "Impresiones | Panel interno",
  description: "Historial interno de trabajos de impresión GoDEX.",
};

function shortId(id: string) {
  return id.slice(0, 8);
}

function payloadText(payload: PrintJobPayload, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function payloadRecord(payload: PrintJobPayload, key: string) {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function metadataText(payload: PrintJobPayload, key: string) {
  const metadata = payloadRecord(payload, "metadata");
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function isReprintCompatible(payload: PrintJobPayload) {
  return Boolean(
    payloadText(payload, "title")
    && typeof payload.line1 === "string"
    && typeof payload.line2 === "string"
    && payloadText(payload, "template")
    && Object.keys(payloadRecord(payload, "data")).length
    && typeof payload.metadata === "object"
    && payload.metadata
    && !Array.isArray(payload.metadata),
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "printed") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "error") return "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]";
  if (status === "claimed") return "border-amber-300 bg-amber-100 text-amber-950";
  return "border-white/15 bg-white/8 text-stone-100";
}

function withLimit(params: Record<string, string>, limit: number) {
  const query = new URLSearchParams();
  Object.entries({ ...params, limit: String(limit) }).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return `/admin-kiosko/impresiones?${query.toString()}`;
}

export default async function ImpresionesPage({
  searchParams,
}: {
  searchParams?: Promise<{ limit?: string; status?: string; template?: string; sourceType?: string; printer_key?: string; q?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const limit = Number(params?.limit || 50);
  const filters = {
    limit,
    status: params?.status || "",
    template: params?.template || "",
    sourceType: params?.sourceType || "",
    printerKey: params?.printer_key || "",
    search: params?.q || "",
  };
  const result = await getRecentPrintJobs(filters);
  const jobs = result.ok ? result.data : [];
  const filterParams = {
    status: filters.status,
    template: filters.template,
    sourceType: filters.sourceType,
    printer_key: filters.printerKey,
    q: filters.search,
  };

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Impresiones" description="Historial seguro server-side de trabajos GoDEX G500. No expone tokens internos." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          {!result.ok ? (
            <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
              No se pudo cargar el historial de impresiones: {result.error}
            </p>
          ) : null}

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Cola de impresión</p>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">Últimos trabajos</h2>
                <p className="mt-2 max-w-3xl text-sm text-stone-300">
                  Vista interna de estado y trazabilidad del payload extendido. El bridge sigue consumiendo title, line1 y line2.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[20, 50, 100].map((value) => (
                  <a key={value} href={withLimit(filterParams, value)} className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">
                    {value}
                  </a>
                ))}
              </div>
            </div>

            <form className="mt-5 grid gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-3 md:grid-cols-[1.2fr_0.8fr_1fr_1fr_1fr_auto]">
              <input name="q" defaultValue={filters.search} placeholder="Buscar por id, sourceId o title" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
              <select name="status" defaultValue={filters.status} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950">
                <option value="">Status</option>
                <option value="queued">queued</option>
                <option value="claimed">claimed</option>
                <option value="printed">printed</option>
                <option value="error">error</option>
              </select>
              <select name="template" defaultValue={filters.template} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950">
                <option value="">Template</option>
                <option value="test_label">test_label</option>
                <option value="product_label_basic">product_label_basic</option>
                <option value="ingredient_label_basic">ingredient_label_basic</option>
                <option value="prep_label_basic">prep_label_basic</option>
              </select>
              <input name="sourceType" defaultValue={filters.sourceType} placeholder="sourceType" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
              <input name="printer_key" defaultValue={filters.printerKey} placeholder="printer_key" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
              <input type="hidden" name="limit" value={limit} />
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Filtrar</button>
            </form>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-[96rem] w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Printer</th>
                    <th className="px-3 py-2">Template</th>
                    <th className="px-3 py-2">Source type</th>
                    <th className="px-3 py-2">Source id</th>
                    <th className="px-3 py-2">Intentos</th>
                    <th className="px-3 py-2">Printed at</th>
                    <th className="px-3 py-2">Error</th>
                    <th className="px-3 py-2">Created at</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const compatible = isReprintCompatible(job.payload);
                    return (
                      <tr key={job.id} className="bg-[#fffaf4] text-stone-950">
                        <td className="rounded-l-2xl px-3 py-3 font-mono text-xs font-black" title={job.id}>{shortId(job.id)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(job.status)}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold">{job.printer_key}</td>
                        <td className="px-3 py-3">{payloadText(job.payload, "template") || "-"}</td>
                        <td className="px-3 py-3">{metadataText(job.payload, "sourceType") || "-"}</td>
                        <td className="px-3 py-3 font-mono text-xs">{metadataText(job.payload, "sourceId") || "-"}</td>
                        <td className="px-3 py-3">{job.attempts}</td>
                        <td className="px-3 py-3">{formatDate(job.printed_at)}</td>
                        <td className="max-w-[18rem] px-3 py-3 text-xs text-[#9f2d18]">{job.error || "-"}</td>
                        <td className="px-3 py-3">{formatDate(job.created_at)}</td>
                        <td className="rounded-r-2xl px-3 py-3">
                          <ReprintPrintJobButton jobId={job.id} disabled={!compatible} />
                          {!compatible ? <p className="mt-1 max-w-[12rem] text-[10px] font-semibold text-stone-500">Payload no compatible</p> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {result.ok && !jobs.length ? (
              <p className="mt-5 rounded-xl border border-white/10 bg-white/6 p-4 text-sm text-stone-300">No constan trabajos de impresión recientes.</p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
