import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Historial IA APPCC | Panel interno",
  description: "Historial interno de OCR y clasificación documental APPCC.",
  robots: {
    index: false,
    follow: false,
  },
};

const preparedRows = [
  {
    date: "Pendiente",
    document: "Sin documentos procesados todavía",
    type: "Preparado",
    result: "Flujo listo para OCR APPCC",
    status: "Sin guardar",
  },
];

export default async function IaHistorialPage() {
  await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Historial IA APPCC" description="Registro preparado de documentos analizados por el asistente IA." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Historial IA</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">OCR y clasificación documental</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
                Preparado para mostrar fecha, documento, tipo detectado, resultado y estado cuando se active persistencia.
              </p>
            </div>
            <a
              href="/admin-kiosko/ia"
              className="inline-flex w-fit items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-[#d94b2b] hover:text-[#f2c6bb]"
            >
              Volver al asistente
            </a>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10">
            <div className="grid grid-cols-5 gap-0 bg-[#0d0d0d] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-stone-400 max-md:hidden">
              <span>Fecha</span>
              <span>Documento</span>
              <span>Tipo detectado</span>
              <span>Resultado</span>
              <span>Estado</span>
            </div>
            {preparedRows.map((row) => (
              <article key={row.document} className="grid gap-3 border-t border-white/10 bg-white/6 px-4 py-4 text-sm md:grid-cols-5">
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Fecha: </span>{row.date}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Documento: </span>{row.document}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Tipo detectado: </span>{row.type}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Resultado: </span>{row.result}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Estado: </span>{row.status}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
