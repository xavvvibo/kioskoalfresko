import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Dónde está Kiosko Alfresko | Parque San Sebastián, Ogíjares",
  description: "Cómo llegar a Kiosko Alfresko en el Parque San Sebastián de Ogíjares.",
  path: "/ubicacion-ogijares",
});

export default function UbicacionPage() {
  return (
    <main className="bg-[#fffaf4]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Ubicación</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">Cómo llegar a Kiosko Alfresko</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">Estamos en el Parque San Sebastián de Ogíjares, en un entorno fácil de ubicar y cómodo para quedar.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">{siteConfig.location.area}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{siteConfig.location.city}, {siteConfig.location.province}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Parque San Sebastián · Ogíjares</span>
              <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Smash 180G + patatas</span>
              <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Cada bebida con tapa</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-500">Abre la ruta en Google Maps y llega directo al Parque San Sebastián.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton href={siteConfig.location.mapsUrl} newTab>Abrir ruta</ActionButton>
              <ActionButton href={siteConfig.location.mapsUrl} kind="secondary" newTab>📍 Llegar ahora</ActionButton>
            </div>
          </article>
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Antes de venir</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600">
              <li>• Revisa el horario actual antes de salir.</li>
              <li>• Si tienes dudas, llama antes de venir.</li>
              <li>• Si vais en grupo, usa la página de reservas/contacto.</li>
            </ul>
          </article>
        </div>
      </div>
    </main>
  );
}
