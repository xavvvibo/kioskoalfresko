import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { zebraDefaultConfig } from "@/lib/admin-kiosko/zebra";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Configuración impresoras | Panel interno",
  description: "Configuración de impresión APPCC para Zebra ZD421.",
};

export default async function PrinterSettingsPage() {
  await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Configuración de impresoras" description="Impresión térmica APPCC para Zebra ZD421 con etiquetas 58x40 mm." />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Impresora activa</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{zebraDefaultConfig.model}</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ["Modelo", zebraDefaultConfig.model],
                ["Resolución", zebraDefaultConfig.resolution],
                ["Tamaño etiqueta", zebraDefaultConfig.size],
                ["Copias por defecto", String(zebraDefaultConfig.defaultCopies)],
                ["Idioma", zebraDefaultConfig.language],
                ["Versión", zebraDefaultConfig.zplVersion],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-lg font-black text-white">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Modo de impresión</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-stone-300">
              <p>El botón Imprimir Zebra intenta enviar ZPL II mediante Zebra Browser Print.</p>
              <p>Si Browser Print no está disponible, el sistema descarga un archivo `.zpl` listo para imprimir manualmente.</p>
              <p>La arquitectura queda preparada para futuras familias Brother, TSC y Godex, manteniendo Zebra como implementación activa.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
