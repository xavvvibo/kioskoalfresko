import type { Metadata } from "next";
import Link from "next/link";
import { getAdminDocument } from "@/lib/admin-kiosko/documents";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Documento APPCC | Panel interno",
  description: "Documento interno APPCC.",
};

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdminSession();
  const { slug } = await params;
  const document = getAdminDocument(slug);

  if (!document) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] text-white">
        <AdminHeader title="Documento APPCC" description="Documento no localizado en el expediente interno." />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
          <p className="rounded-[1.5rem] border border-amber-300 bg-amber-100 p-5 text-amber-950">Documento no localizado.</p>
        </section>
      </main>
    );
  }

  const hasPdf = document.fileUrl && document.status === "Disponible";

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title={document.title} description="Visualizador documental interno APPCC." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <article className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
          <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
            <p className="rounded-2xl border border-white/10 bg-white/6 p-4"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Estado</span>{document.status}</p>
            <p className="rounded-2xl border border-white/10 bg-white/6 p-4"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Versión</span>{document.version}</p>
            <p className="rounded-2xl border border-white/10 bg-white/6 p-4"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Última revisión</span>{document.lastReview}</p>
            <p className="rounded-2xl border border-white/10 bg-white/6 p-4"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Responsable</span>{document.responsible}</p>
          </div>
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/6 p-4 text-sm leading-6 text-stone-200">{document.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin-kiosko/documentacion" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Volver</Link>
            {hasPdf ? (
              <a href={document.fileUrl} download className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Descargar</a>
            ) : (
              <button type="button" disabled className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-stone-400">Descargar</button>
            )}
          </div>
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d0d0d]">
            {hasPdf ? (
              <iframe title={document.title} src={document.fileUrl} className="h-[75vh] w-full bg-white" />
            ) : (
              <div className="p-8 text-center">
                <p className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">PDF pendiente de subir</p>
                <p className="mt-3 text-sm leading-6 text-stone-300">La ficha está preparada para incorporar el archivo PDF cuando esté disponible.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
