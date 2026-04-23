import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function LocationPanel() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <div className="rounded-[2rem] border border-stone-950 bg-white p-8">
        <h3 className="text-4xl font-black uppercase leading-none tracking-[-0.04em] text-stone-950">Plan de parque.<br />Y de quedarse.</h3>
        <p className="mt-4 text-base leading-7 text-stone-700">Ogíjares, Parque San Sebastián. Lo bastante claro como para decidirlo sobre la marcha.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ActionButton href="/ubicacion-ogijares">Cómo llegar</ActionButton>
          <ActionButton href={siteConfig.location.mapsUrl} kind="secondary">Abrir Maps</ActionButton>
        </div>
      </div>
      <div className="rounded-[2rem] border border-stone-950 bg-stone-950 p-8 text-white">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#efb7a8]">Dónde estás yendo</p>
        <p className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.04em]">{siteConfig.location.area}</p>
        <p className="mt-3 text-lg font-semibold">{siteConfig.location.city}, {siteConfig.location.province}</p>
        <p className="mt-4 text-sm leading-6 text-stone-300">Pendiente de cargar el enlace real de Maps y cualquier detalle práctico de acceso o aparcamiento.</p>
      </div>
    </div>
  );
}
