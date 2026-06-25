import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Asistente IA APPCC | Panel interno",
  description: "Base interna para OCR y clasificación inteligente de documentos APPCC.",
};

const aiTasks = [
  ["Escanear albarán/factura", "Preparar extracción de proveedor, fecha, productos, lote e importe."],
  ["Escanear etiqueta de lote", "Preparar lectura de producto, lote, caducidad y trazabilidad."],
  ["Leer termómetro", "Preparar captura visual de temperatura y equipo asociado."],
  ["Leer aceite", "Preparar lectura de control de aceite y estado de freidora."],
  ["Clasificar documento sanitario", "Preparar clasificación de planes, certificados, actas y registros."],
];

export default async function IaAppccPage() {
  await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Asistente IA APPCC" description="Subida y clasificación inteligente de documentos sanitarios, albaranes, facturas, etiquetas y registros." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
          <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950">
            Preparado para conexión IA
          </p>
          <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">Base OCR / IA sanitaria</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Estructura interna preparada para conectar OpenAI desde servidor sin exponer claves en cliente.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {aiTasks.map(([title, description]) => (
              <article key={title} className="rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Módulo IA APPCC</p>
                <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.03em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-700">{description}</p>
                <p className="mt-4 rounded-full border border-stone-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-stone-700">
                  Preparado para conexión IA
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
