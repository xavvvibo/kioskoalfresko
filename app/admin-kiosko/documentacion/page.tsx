import type { Metadata } from "next";
import Link from "next/link";
import { adminDocuments } from "@/lib/admin-kiosko/documents";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Documentación APPCC | Panel interno",
  description: "Centro documental APPCC interno.",
};

const groups = ["Documentación oficial", "Registros digitales"] as const;

function statusClass(status: string) {
  if (status === "Disponible") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "Pendiente de revisión") return "border-amber-300 bg-amber-100 text-amber-950";
  return "border-stone-300 bg-stone-100 text-stone-700";
}

export default async function DocumentacionPage() {
  await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Centro documental APPCC" description="Expediente sanitario digital, registros y documentación de KIOSKO ALFRESKO." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{group}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {adminDocuments.filter((document) => document.category === group).map((document) => (
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
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={document.href} className="rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Ver</Link>
                      {document.fileUrl && document.status === "Disponible" ? (
                        <a href={document.fileUrl} download className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Descargar</a>
                      ) : (
                        <button type="button" disabled className="rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-stone-400">Descargar</button>
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
