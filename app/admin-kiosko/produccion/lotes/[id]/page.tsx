import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getProductionBatchById, getRecentPrintJobs } from "@/lib/admin-kiosko/database";
import { registerBatchConsumption, reprintProductionBatchLabelAction } from "@/app/admin-kiosko/actions";
import {
  buildProductionBatchTraceability,
  printJobMatchesProductionBatch,
  type ProductionBatchStatus,
  type ProductionBatchTimelineEvent,
} from "@/lib/admin-kiosko/domain/production-batch";
import { AdminHeader } from "../../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Ficha lote interno | Panel interno",
  description: "Ficha interna de trazabilidad de lote de subelaboracion.",
};

const statusLabel: Record<ProductionBatchStatus, string> = {
  ACTIVE: "Activo",
  NEAR_EXPIRY: "Proximo a caducar",
  EXPIRED: "Caducado",
  BLOCKED: "Bloqueado",
  CONSUMED: "Consumido",
  DISCARDED: "Descartado",
};

function statusClass(status: ProductionBatchStatus) {
  if (status === "ACTIVE") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "NEAR_EXPIRY") return "border-amber-300 bg-amber-100 text-amber-950";
  if (status === "EXPIRED" || status === "BLOCKED" || status === "DISCARDED") return "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]";
  return "border-white/15 bg-white/8 text-stone-100";
}

function printStatusClass(status: string) {
  if (status === "printed") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "error") return "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]";
  if (status === "claimed" || status === "printing") return "border-amber-300 bg-amber-100 text-amber-950";
  if (status === "queued") return "border-sky-300 bg-sky-100 text-sky-950";
  return "border-white/15 bg-white/8 text-stone-100";
}

function timelineDotClass(tone: ProductionBatchTimelineEvent["tone"]) {
  if (tone === "success") return "border-emerald-300 bg-emerald-100";
  if (tone === "warning") return "border-amber-300 bg-amber-100";
  if (tone === "danger") return "border-[#d94b2b] bg-[#d94b2b]";
  return "border-white/20 bg-white/10";
}

function shortDateTime(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function configuredAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_BASE_URL || "").trim().replace(/\/+$/, "");
}

function todayMadrid() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeMadrid() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function minutesSince(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

function printFeedback(job?: { status: string; createdAt: string; printedAt: string | null; error: string | null } | null) {
  if (!job) return "Sin etiquetas impresas asociadas.";
  if (job.status === "printed") return "Última impresión correcta.";
  if (job.status === "error") return "Error en última impresión.";
  if (job.status === "queued" && minutesSince(job.createdAt) >= 10) return "Bridge offline o pendiente de impresión.";
  if (job.status === "queued") return "Etiqueta enviada a cola.";
  if (job.status === "claimed" || job.status === "printing") return "Bridge procesando etiqueta.";
  return "Etiqueta enviada a cola.";
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-400">{children}</p>;
}

export default async function ProductionBatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ print_job?: string; print_error?: string; saved?: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const [batchResult, jobsResult] = await Promise.all([
    getProductionBatchById(id),
    getRecentPrintJobs({ limit: 100, template: "prep_label_professional" }),
  ]);

  if (!batchResult.ok) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] text-white">
        <AdminHeader title="Ficha lote interno" description="No se pudo cargar la trazabilidad del lote." />
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
          <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">{batchResult.error}</p>
        </section>
      </main>
    );
  }

  if (!batchResult.data) notFound();

  const batch = batchResult.data;
  const batchCode = batch.batch_code || "";
  const printJobs = jobsResult.ok
    ? jobsResult.data.filter((job) => printJobMatchesProductionBatch(job, batch.id, batchCode))
    : [];
  const productionBatch = buildProductionBatchTraceability(batch, printJobs);
  const appBaseUrl = configuredAppBaseUrl();
  const qrRoute = productionBatch.qrValue ? `/admin-kiosko/qr/${encodeURIComponent(productionBatch.qrValue)}` : "";
  const qrUrl = appBaseUrl && qrRoute ? `${appBaseUrl}${qrRoute}` : "";
  const latestPrintJob = [...productionBatch.printJobs]
    .sort((a, b) => (b.printedAt || b.createdAt).localeCompare(a.printedAt || a.createdAt))[0];
  const currentDate = todayMadrid();
  const currentTime = timeMadrid();
  const currentUser = "F. Javier Bocanegra Sanjuan";
  const inspectionChecklist = [
    { label: "Nombre visible", value: productionBatch.recipeName, ok: Boolean(productionBatch.recipeName) },
    { label: "ELAB visible", value: productionBatch.productionDateTime || "-", ok: Boolean(productionBatch.productionDateTime) },
    { label: "CAD visible", value: productionBatch.expiryDateTime || "-", ok: Boolean(productionBatch.expiryDateTime) },
    { label: "Lote visible", value: productionBatch.batchCode || "-", ok: Boolean(productionBatch.batchCode) },
    { label: "Responsable visible", value: productionBatch.responsibleUser || "-", ok: Boolean(productionBatch.responsibleUser) },
    { label: "Conservacion visible", value: productionBatch.storageCondition || "-", ok: Boolean(productionBatch.storageCondition) },
    {
      label: "Etiqueta impresa",
      value: productionBatch.printJobs.some((job) => job.status === "printed") ? "Si" : "No consta impresa",
      ok: productionBatch.printJobs.some((job) => job.status === "printed"),
    },
    { label: "QR resuelve a esta ficha", value: qrRoute || "-", ok: Boolean(qrRoute) },
  ];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Ficha lote interno" description="Trazabilidad interna de subelaboracion preparada para QR ERP." />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:py-12">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin-kiosko/produccion#lotes" className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Volver a produccion</Link>
          <Link href="/admin-kiosko/etiquetas-prep" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Imprimir etiqueta manual</Link>
          <form action={reprintProductionBatchLabelAction}>
            <input type="hidden" name="batch_id" value={productionBatch.id} />
            <button className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-950">Reimprimir etiqueta</button>
          </form>
        </div>

        {query.print_job ? (
          <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950">Etiqueta enviada a cola: {query.print_job}</p>
        ) : null}
        {query.print_error ? (
          <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">No se pudo encolar la etiqueta: {query.print_error}</p>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Resumen</p>
              <h1 className="mt-2 break-words text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{productionBatch.recipeName}</h1>
              <p className="mt-2 break-all font-mono text-sm text-stone-300">{productionBatch.batchCode || "Sin codigo de lote"}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(productionBatch.status)}`}>
                {statusLabel[productionBatch.status]}
              </span>
              <span className="w-fit rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-stone-100">
                {productionBatch.storageCondition}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Caducidad", productionBatch.expiryDateTime || "-"],
              ["Vida restante", productionBatch.remainingLifeLabel],
              ["Responsable", productionBatch.responsibleUser || "-"],
              ["Cantidad", `${productionBatch.quantity ?? 0} ${productionBatch.unit}`],
              ["Elaboracion", productionBatch.productionDateTime || "-"],
              ["Estado", statusLabel[productionBatch.status]],
              ["Conservacion", productionBatch.storageCondition],
              ["Recipe ID", productionBatch.recipeId || "Pendiente modelo receta"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 break-words text-sm font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          {productionBatch.notes ? (
            <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Notas</p>
              <p className="mt-2 whitespace-pre-wrap">{productionBatch.notes}</p>
            </div>
          ) : null}

          {productionBatch.qrValue ? (
            <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">QR interno preparado</p>
              <div className="mt-3 grid gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">qrValue</p>
                  <p className="mt-1 break-all font-mono text-sm text-white">{productionBatch.qrValue}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">Ruta QR</p>
                  <p className="mt-1 break-all font-mono text-sm text-white">{qrRoute}</p>
                </div>
                {qrUrl ? (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">qrUrl</p>
                    <a href={qrUrl} className="mt-1 block break-all font-mono text-sm font-black text-[#f2c6bb] underline decoration-[#f2c6bb]/40 underline-offset-4">{qrUrl}</a>
                  </div>
                ) : (
                  <p className="rounded-xl border border-amber-300/50 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-amber-100">
                    NEXT_PUBLIC_APP_BASE_URL no configurada; el QR fisico codificara solo el valor interno.
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={qrRoute} className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Abrir ruta QR</Link>
                {qrUrl ? <a href={qrUrl} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Abrir qrUrl</a> : null}
              </div>
              <p className="mt-3 text-xs text-stone-300">La ruta QR requiere sesion admin.</p>
            </div>
          ) : null}

          <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Checklist inspeccion</p>
                <p className="mt-2 text-sm text-stone-300">Comprobacion visual para operacion interna. No modifica datos del lote.</p>
              </div>
              <Link href="/admin-kiosko/etiquetas-prep" className="w-fit rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Imprimir etiqueta manual</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {inspectionChecklist.map((item) => (
                <div key={item.label} className="rounded-[1rem] border border-white/10 bg-[#0d0d0d] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">{item.label}</p>
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${item.ok ? "border-emerald-300 bg-emerald-100 text-emerald-950" : "border-amber-300 bg-amber-100 text-amber-950"}`}>
                      {item.ok ? "OK" : "Revisar"}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
          <div className="grid min-w-0 gap-6">
            <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Materias primas utilizadas</h2>
              {productionBatch.ingredientsUsed.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                      <tr>
                        <th className="px-3 py-2">Materia</th>
                        <th className="px-3 py-2">Proveedor</th>
                        <th className="px-3 py-2">Lote origen</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Documento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-stone-200">
                      {productionBatch.ingredientsUsed.map((ingredient) => (
                        <tr key={`${ingredient.productName}-${ingredient.batchNumber}`}>
                          <td className="px-3 py-3 font-black text-white">{ingredient.productName}</td>
                          <td className="px-3 py-3">{ingredient.supplierName || "-"}</td>
                          <td className="px-3 py-3 font-mono text-xs">{ingredient.batchNumber || "-"}</td>
                          <td className="px-3 py-3">{ingredient.quantity ?? 0} {ingredient.unit}</td>
                          <td className="px-3 py-3 font-mono text-xs">{ingredient.documentId || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState>Sin materias primas asociadas en el modelo actual.</EmptyState>}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Impresiones</h2>
                  <p className="mt-2 text-sm font-semibold text-stone-300">{printFeedback(latestPrintJob)}</p>
                </div>
                <form action={reprintProductionBatchLabelAction}>
                  <input type="hidden" name="batch_id" value={productionBatch.id} />
                  <button className="w-fit rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Reimprimir etiqueta</button>
                </form>
              </div>
              {!jobsResult.ok ? <p className="mt-4 rounded-xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 p-3 text-sm text-[#f2c6bb]">{jobsResult.error}</p> : null}
              {latestPrintJob ? (
                <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-[#0d0d0d] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Ultima etiqueta asociada</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">Ultimo status</p>
                      <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${printStatusClass(latestPrintJob.status)}`}>{latestPrintJob.status}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">printed_at</p>
                      <p className="mt-2 font-mono text-sm font-black text-white">{shortDateTime(latestPrintJob.printedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">error</p>
                      <p className="mt-2 break-words text-sm font-black text-white">{latestPrintJob.error || "-"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState>Sin etiquetas impresas asociadas.</EmptyState>
              )}
              <div className="mt-4 grid gap-3">
                {productionBatch.printJobs.map((job) => (
                  <article key={job.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${printStatusClass(job.status)}`}>{job.status}</span>
                      <span className="break-all font-mono text-xs text-stone-300">{job.id}</span>
                    </div>
                    <p className="mt-2 font-black text-white">{job.title || productionBatch.recipeName}</p>
                    <p className="mt-1 text-xs text-stone-400">{job.line1} · {job.line2}</p>
                    <p className="mt-1 text-xs text-stone-500">Creado {shortDateTime(job.createdAt)} · Impreso {shortDateTime(job.printedAt)} · Intentos {job.attempts}</p>
                    {job.error ? <p className="mt-2 text-xs text-[#f2c6bb]">{job.error}</p> : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">APPCC</h2>
                <div className="mt-4 grid gap-3">
                  {productionBatch.appcc.map((record) => (
                    <article key={record.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-white">{record.label}</p>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${record.status === "ok" ? "border-emerald-300 bg-emerald-100 text-emerald-950" : record.status === "warning" ? "border-amber-300 bg-amber-100 text-amber-950" : "border-white/15 bg-white/8 text-stone-100"}`}>{record.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-stone-300">{record.detail}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Vida del lote</h2>
                    <p className="mt-2 text-sm text-stone-400">Resumen simulado: no descuenta stock real en esta fase.</p>
                  </div>
                  <details className="group relative">
                    <summary className="w-fit cursor-pointer list-none rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white marker:hidden">
                      Registrar consumo
                    </summary>
                    <div className="absolute right-0 z-20 mt-3 w-[min(88vw,28rem)] rounded-[1.4rem] border border-white/15 bg-[#0d0d0d] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                      <form action={registerBatchConsumption} className="grid gap-3">
                        <input type="hidden" name="batch_id" value={productionBatch.id} />
                        <input type="hidden" name="consumed_by" value={currentUser} />
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Receta</label>
                          <input name="recipe_name" required placeholder="Bocadillo Mexicano" className="mt-2 w-full rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
                        </div>
                        <input name="recipe_id" placeholder="Recipe ID opcional" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Cantidad</label>
                            <input name="quantity" required inputMode="decimal" placeholder="1" className="mt-2 w-full rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Unidad</label>
                            <input name="unit" defaultValue={productionBatch.unit} className="mt-2 w-full rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input type="date" name="consumed_date" defaultValue={currentDate} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
                          <input type="time" name="consumed_time" defaultValue={currentTime} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
                        </div>
                        <textarea name="notes" placeholder="Notas" rows={3} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
                        <p className="text-xs text-stone-400">Usuario actual: {currentUser}</p>
                        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Guardar consumo logico</button>
                      </form>
                    </div>
                  </details>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Cantidad producida", `${productionBatch.lifeSummary.producedQuantity} ${productionBatch.lifeSummary.unit}`],
                    ["Cantidad consumida", `${productionBatch.lifeSummary.consumedQuantity} ${productionBatch.lifeSummary.unit}`],
                    ["Cantidad pendiente", `${productionBatch.lifeSummary.pendingQuantity} ${productionBatch.lifeSummary.unit}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[1rem] border border-white/10 bg-white/6 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">{label}</p>
                      <p className="mt-2 text-lg font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Consumos</h2>
                  <p className="mt-2 text-sm text-stone-400">Consumo logico de subelaboraciones. No modifica stock todavia.</p>
                </div>
              </div>
              {productionBatch.consumptions.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                      <tr>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Receta</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Usuario</th>
                        <th className="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-stone-200">
                      {productionBatch.consumptions.map((consumption) => (
                        <tr key={consumption.id}>
                          <td className="px-3 py-3 font-mono text-xs">{shortDateTime(consumption.consumedAt)}</td>
                          <td className="px-3 py-3 font-black text-white">
                            {consumption.recipeName}
                            {consumption.notes ? <span className="mt-1 block text-xs font-normal text-stone-400">{consumption.notes}</span> : null}
                          </td>
                          <td className="px-3 py-3">{consumption.quantity} {consumption.unit}</td>
                          <td className="px-3 py-3">{consumption.consumedBy || "-"}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-stone-100">{consumption.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState>Sin consumos registrados</EmptyState>}
            </section>
          </div>

          <aside className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Timeline</h2>
            <div className="mt-5 grid gap-0">
              {productionBatch.timeline.map((event, index) => (
                <div key={event.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-4 w-4 rounded-full border ${timelineDotClass(event.tone)}`} />
                    {index < productionBatch.timeline.length - 1 ? <span className="min-h-8 w-px flex-1 bg-white/10" /> : null}
                  </div>
                  <article className="pb-5">
                    <p className="font-mono text-[11px] text-stone-400">{shortDateTime(event.occurredAt)}</p>
                    <p className="mt-1 font-black text-white">{event.label}</p>
                    <p className="mt-1 text-sm text-stone-300">{event.detail}</p>
                  </article>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Documentos</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {productionBatch.documents.map((document) => (
              <article key={`${document.type}-${document.id}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                <p className="font-black text-white">{document.label}</p>
                <p className="mt-1 break-all font-mono text-xs text-stone-400">{document.id}</p>
                {document.createdAt ? <p className="mt-1 text-xs text-stone-500">{shortDateTime(document.createdAt)}</p> : null}
              </article>
            ))}
            {!productionBatch.documents.length ? <EmptyState>Sin documentos asociados en esta fase.</EmptyState> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
