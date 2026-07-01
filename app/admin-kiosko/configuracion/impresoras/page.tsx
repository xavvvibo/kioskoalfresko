import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { buildZebraLabelZpl, zebraDefaultConfig } from "@/lib/admin-kiosko/zebra";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Configuración impresoras | Panel interno",
  description: "Configuración de impresión APPCC para Zebra ZD421.",
};

export default async function PrinterSettingsPage() {
  await requireAdminSession();
  const testZpl = buildZebraLabelZpl({
    template: "trazabilidad",
    product: "PRUEBA APPCC",
    batch: "TEST-ZD421",
    supplier: "Kiosko Alfresko",
    productionDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date().toISOString().slice(0, 10),
    responsible: "F. Javier Bocanegra Sanjuan",
    copies: 1,
  });
  const testHref = `data:text/plain;charset=utf-8,${encodeURIComponent(testZpl)}`;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Configuración de impresoras" description="Impresión térmica APPCC para Zebra ZD421 con etiquetas 58x40 mm." role="owner" />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Impresora activa</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{zebraDefaultConfig.model}</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ["Impresora activa", "Sí"],
                ["Modelo", zebraDefaultConfig.model],
                ["Resolución", zebraDefaultConfig.resolution],
                ["Tamaño etiqueta", zebraDefaultConfig.size],
                ["Copias por defecto", String(zebraDefaultConfig.defaultCopies)],
                ["Idioma", zebraDefaultConfig.language],
                ["Versión", zebraDefaultConfig.zplVersion],
                ["Estado Browser Print", "Se comprueba desde el navegador al pulsar Imprimir Zebra"],
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
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={testHref} download="zebra-zd421-prueba-appcc.zpl" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Descargar ZPL prueba</a>
              <a href="/admin-kiosko/etiquetas" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Prueba desde etiqueta</a>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Conexión Zebra</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Instalar Zebra Browser Print en el equipo de caja.",
                "Conectar Zebra ZD421 por USB o red y dejarla como impresora predeterminada.",
                "Usar etiquetas 58x40 mm y resolución 203 dpi.",
                "Si Browser Print no responde, descargar el archivo ZPL y enviarlo manualmente al driver Zebra.",
              ].map((item) => <p key={item} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm font-semibold text-stone-200">{item}</p>)}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
