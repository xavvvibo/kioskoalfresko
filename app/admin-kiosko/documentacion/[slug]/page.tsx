import type { Metadata } from "next";
import Link from "next/link";
import { getAdminDocument, hasDocumentPdf } from "@/lib/admin-kiosko/documents";
import { getAppccDocumentCatalog } from "@/lib/admin-kiosko/waste-oil-documents";
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
  const catalog = await getAppccDocumentCatalog();
  const document = catalog.ok
    ? catalog.data.find((item) => item.slug === slug)
    : getAdminDocument(slug);

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

  const hasPdf = hasDocumentPdf(document);

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
          {document.sections?.length ? (
            <div className="mt-5 grid gap-4">
              {document.sections.map((section) => (
                <section key={section.title} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                  <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{section.title}</h2>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-200">
                    {section.items.map((item) => (
                      <li key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin-kiosko/documentacion" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Volver</Link>
            {hasPdf ? (
              <a href={document.documentUrl || document.fileUrl} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir documento</a>
            ) : (
              <span className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-stone-300">Sin PDF disponible</span>
            )}
          </div>
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d0d0d]">
            {hasPdf ? (
              <iframe title={document.title} src={document.documentUrl || document.fileUrl} className="h-[75vh] w-full bg-white" />
            ) : (
              <div className="p-8 text-center">
                <p className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{document.status}</p>
                <p className="mt-3 text-sm leading-6 text-stone-300">Documento registrado en el expediente digital.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
