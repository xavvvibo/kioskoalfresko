import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getRecentAiProcessingLogs } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Historial IA APPCC | Panel interno",
  description: "Historial interno de OCR y clasificación documental APPCC.",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export default async function IaHistorialPage() {
  await requireAdminPermission("settings:manage");
  const logs = await getRecentAiProcessingLogs(50);
  const rows = logs.ok ? logs.data : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Historial IA APPCC" description="Registro real de documentos analizados por el asistente IA." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Historial IA</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">OCR y clasificación documental</h2>
            </div>
            <a href="/admin-kiosko/ia" className="inline-flex w-fit items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-[#d94b2b] hover:text-[#f2c6bb]">
              Volver al asistente
            </a>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10">
            <div className="grid grid-cols-6 gap-0 bg-[#0d0d0d] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-stone-400 max-md:hidden">
              <span>Fecha</span>
              <span>Documento</span>
              <span>Tipo</span>
              <span>Estado</span>
              <span>Resumen</span>
              <span>Error</span>
            </div>
            {rows.map((row) => (
              <article key={row.id} className="grid gap-3 border-t border-white/10 bg-white/6 px-4 py-4 text-sm md:grid-cols-6">
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Fecha: </span>{formatDate(row.created_at)}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Documento: </span>{row.document_name || "-"}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Tipo: </span>{row.detected_type || "-"}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Estado: </span>{row.status || "-"}</p>
                <p><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Resumen: </span>{row.summary || "-"}</p>
                <p className="text-[#f2c6bb]"><span className="font-black uppercase tracking-[0.12em] text-stone-400 md:hidden">Error: </span>{row.error_message || "-"}</p>
              </article>
            ))}
          </div>
          {!rows.length ? <p className="mt-6 text-sm text-stone-300">Todavía no hay documentos IA registrados.</p> : null}
        </div>
      </section>
    </main>
  );
}
