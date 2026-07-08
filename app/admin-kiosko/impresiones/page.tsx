import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentPrintJobs, type PrintJobPayload } from "@/lib/admin-kiosko/database";
import { AdminEmptyState } from "../_components/AdminEmptyState";
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
  if (status === "printed") return "border-emerald-300/70 bg-emerald-50 text-emerald-950";
  if (status === "error") return "border-[#d94b2b]/50 bg-[#fff1ed] text-[#9f2d18]";
  if (status === "claimed" || status === "sent_unconfirmed") return "border-amber-300/80 bg-amber-50 text-amber-950";
  if (status === "cancelled") return "border-stone-300 bg-stone-100 text-stone-700";
  return "border-stone-300 bg-stone-100 text-stone-800";
}

function statusLabel(status: string) {
  if (status === "queued") return "encolado";
  if (status === "claimed") return "enviando";
  if (status === "sent_unconfirmed") return "enviado sin confirmar";
  if (status === "printed") return "enviado a impresora";
  if (status === "error") return "error";
  if (status === "cancelled") return "cancelado";
  return status;
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
  const statusCounts = {
    pending: jobs.filter((job) => job.status === "queued").length,
    claimed: jobs.filter((job) => job.status === "claimed").length,
    uncertain: jobs.filter((job) => job.status === "sent_unconfirmed").length,
    printed: jobs.filter((job) => job.status === "printed").length,
    failed: jobs.filter((job) => job.status === "error").length,
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
                  Vista interna de estado y trazabilidad del payload extendido. Enviado a impresora significa que el bridge aceptó el envío TCP, no verificación visual del papel.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[20, 50, 100].map((value) => (
                  <a key={value} href={withLimit(filterParams, value)} className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                    {value}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(statusCounts).map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 transition duration-150 hover:border-[#d94b2b]/60 hover:bg-white/8">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label} en esta vista</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">{value}</p>
                </article>
              ))}
            </div>

            <form className="mt-5 grid gap-3 rounded-[1.2rem] border border-white/10 bg-black/25 p-3 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto_auto]">
              <input name="q" defaultValue={filters.search} placeholder="Buscar trabajo, lote o sourceId" className="rounded-xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition duration-150 focus:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              <select name="status" defaultValue={filters.status} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                <option value="">Status</option>
                <option value="queued">encolado</option>
                <option value="claimed">enviando</option>
                <option value="sent_unconfirmed">enviado sin confirmar</option>
                <option value="printed">enviado a impresora</option>
                <option value="error">error</option>
                <option value="cancelled">cancelado</option>
              </select>
              <select name="template" defaultValue={filters.template} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                <option value="">Template</option>
                <option value="test_label">test_label</option>
                <option value="product_label_basic">product_label_basic</option>
                <option value="ingredient_label_basic">ingredient_label_basic</option>
                <option value="prep_label_basic">prep_label_basic</option>
                <option value="prep_label_professional">prep_label_professional</option>
              </select>
              <input name="printer_key" defaultValue={filters.printerKey} placeholder="Printer key" className="rounded-xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition duration-150 focus:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              <input type="hidden" name="sourceType" value={filters.sourceType} />
              <input type="hidden" name="limit" value={limit} />
              <button className="rounded-xl border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition duration-150 hover:bg-[#b83d22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">Filtrar</button>
              <a href="/admin-kiosko/impresiones" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/8 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition duration-150 hover:border-[#d94b2b] hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">Limpiar</a>
            </form>

            <div className="mt-6 grid gap-3 lg:hidden">
              {jobs.map((job) => {
                const compatible = isReprintCompatible(job.payload);
                return (
                  <article key={job.id} className="rounded-[1.2rem] border border-white/10 bg-[#fffaf4] p-4 text-sm text-stone-950">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-black">{shortId(job.id)}</p>
                        <p className="mt-1 truncate font-black">{payloadText(job.payload, "template") || "template pendiente"}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(job.status)}`}>
                        {statusLabel(job.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-stone-700">
                      <p><span className="font-black uppercase text-stone-950">Printer</span> {job.printer_key}</p>
                      <p><span className="font-black uppercase text-stone-950">Source</span> {metadataText(job.payload, "sourceId") || "-"}</p>
                      <p><span className="font-black uppercase text-stone-950">Fecha</span> {formatDate(job.created_at)}</p>
                      {job.error ? <p className="rounded-xl border border-[#d94b2b]/30 bg-[#fff1ed] px-3 py-2 text-[#9f2d18]"><span className="mr-1 inline-grid h-4 w-4 place-items-center rounded-full bg-[#d94b2b] text-[10px] text-white">!</span>{job.error}</p> : null}
                    </div>
                    <div className="mt-3">
                      <ReprintPrintJobButton jobId={job.id} disabled={!compatible} />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 hidden lg:block">
              <table className="w-full table-fixed border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                  <tr>
                    <th className="w-[7rem] px-3 py-2">ID</th>
                    <th className="w-[8rem] px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Printer</th>
                    <th className="px-3 py-2">Template</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="w-[5rem] px-3 py-2">Intentos</th>
                    <th className="w-[9rem] px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Error</th>
                    <th className="w-[9rem] px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const compatible = isReprintCompatible(job.payload);
                    return (
                      <tr key={job.id} className="bg-[#fffaf4] text-stone-950 shadow-sm">
                        <td className="rounded-l-2xl px-3 py-3 font-mono text-xs font-black" title={job.id}>{shortId(job.id)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(job.status)}`}>
                            {statusLabel(job.status)}
                          </span>
                        </td>
                        <td className="truncate px-3 py-3 font-semibold" title={job.printer_key}>{job.printer_key}</td>
                        <td className="truncate px-3 py-3" title={payloadText(job.payload, "template")}>{payloadText(job.payload, "template") || "-"}</td>
                        <td className="truncate px-3 py-3 font-mono text-xs" title={metadataText(job.payload, "sourceId") || metadataText(job.payload, "sourceType")}>{metadataText(job.payload, "sourceId") || metadataText(job.payload, "sourceType") || "-"}</td>
                        <td className="px-3 py-3">{job.attempts}</td>
                        <td className="px-3 py-3 text-xs">{formatDate(job.printed_at || job.created_at)}</td>
                        <td className="px-3 py-3 text-xs text-[#9f2d18]">
                          {job.error ? <span className="inline-flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#d94b2b] text-[11px] font-black text-white">!</span><span className="line-clamp-2">{job.error}</span></span> : "-"}
                        </td>
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
              <div className="mt-5">
                <AdminEmptyState
                  title="Sin trabajos de impresion"
                  description="La cola aparecera aqui cuando se envie una etiqueta desde produccion, etiquetas prep o una reimpresion."
                  href="/admin-kiosko/etiquetas-prep"
                  cta="Crear etiqueta prep"
                />
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
