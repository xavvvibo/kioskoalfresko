import type { Metadata } from "next";
import Link from "next/link";
import { adminDocuments, getDocumentStatsFor, hasDocumentPdf, prioritizedSanitaryDocuments } from "@/lib/admin-kiosko/documents";
import { getAppccDocumentCatalog } from "@/lib/admin-kiosko/waste-oil-documents";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Documentación APPCC | Panel interno",
  description: "Centro documental APPCC interno.",
};

const groups = ["Documentación oficial", "Registros digitales"] as const;

function statusClass(status: string) {
  if (status === "Disponible" || status === "Completado") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "Pendiente de revisión") return "border-amber-300 bg-amber-100 text-amber-950";
  if (status === "Caducado") return "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]";
  return "border-stone-300 bg-stone-100 text-stone-700";
}

export default async function DocumentacionPage() {
  await requireAdminSession();
  const catalog = await getAppccDocumentCatalog();
  const documents = catalog.ok ? catalog.data : adminDocuments;
  const stats = getDocumentStatsFor(documents);
  const prioritizedDocuments = prioritizedSanitaryDocuments
    .map((slug) => documents.find((document) => document.slug === slug))
    .filter((document): document is NonNullable<typeof document> => Boolean(document));

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Centro documental APPCC" description="Expediente sanitario digital, registros y documentación de KIOSKO ALFRESKO." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Estado documental</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {[
                ["Completa", `${stats.available}/${stats.total}`],
                ["Porcentaje", `${stats.percent}%`],
                ["Pendiente de subir", String(stats.pending)],
                ["Pendiente de revisión", String(stats.review)],
                ["Caducada", String(stats.expired)],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-xl font-black text-white">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Documentación sanitaria prioritaria</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">Orden de aportación recomendado para inspección sanitaria real.</p>
              </div>
              <span className="w-fit rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">
                {stats.available}/{stats.total} disponibles
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {prioritizedDocuments.map((document, index) => (
                <article key={document.slug} className="rounded-[1.4rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Prioridad {index + 1}</p>
                      <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.03em]">{document.title}</h3>
                    </div>
                    <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(document.status)}`}>{document.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-stone-700 md:grid-cols-2 xl:grid-cols-4">
                    <p><span className="font-black text-stone-950">Motivo:</span> {document.pendingReason || "Documento disponible en expediente digital."}</p>
                    <p><span className="font-black text-stone-950">Acción:</span> {document.recommendedAction || "Mantener revisión periódica."}</p>
                    <p><span className="font-black text-stone-950">Responsable:</span> {document.responsible}</p>
                    <p><span className="font-black text-stone-950">Fecha objetivo:</span> {document.targetDate || "Revisión ordinaria"}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={document.href} className="rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Ver ficha</Link>
                    {hasDocumentPdf(document) ? (
                      <a href={document.documentUrl || document.fileUrl} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Abrir documento</a>
                    ) : (
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-amber-950">Documentación pendiente de aportar</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {groups.map((group) => (
            <section key={group} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{group}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documents.filter((document) => document.category === group).map((document) => (
                  <article key={document.slug} className="rounded-[1.4rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 transition hover:border-[#d94b2b]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">{document.category}</p>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(document.status)}`}>{document.status}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.03em]">{document.title}</h3>
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-stone-700">
                      <p>Última revisión: {document.lastReview}</p>
                      <p>Responsable: {document.responsible}</p>
                      <p>Versión: {document.version}</p>
                      <p>Motivo: {document.pendingReason || "Documento operativo disponible."}</p>
                      <p>Acción recomendada: {document.recommendedAction || "Mantener revisión periódica."}</p>
                      <p>Fecha objetivo: {document.targetDate || "Revisión ordinaria"}</p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={document.href} className="rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Ver</Link>
                      {hasDocumentPdf(document) ? (
                        <a href={document.documentUrl || document.fileUrl} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Abrir</a>
                      ) : (
                        <span className="rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">Sin PDF</span>
                      )}
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
