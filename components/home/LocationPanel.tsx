import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function LocationPanel() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <div className="rounded-[2rem] border border-stone-950 bg-white p-8">
        <h3 className="text-4xl font-black uppercase leading-none tracking-[-0.04em] text-stone-950">Plan de parque.<br />Y de quedarse.</h3>
        <p className="mt-4 text-base leading-7 text-stone-700">Ogíjares, Parque San Sebastián. Lo bastante claro como para decidirlo sobre la marcha.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Parque San Sebastián · Ogíjares</span>
          <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Smash 180G + patatas</span>
          <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Cada bebida con tapa</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <ActionButton href="/ubicacion-ogijares">Cómo llegar</ActionButton>
          <ActionButton href={siteConfig.location.mapsUrl} kind="secondary" newTab>📍 Llegar ahora</ActionButton>
        </div>
      </div>
      <div className="rounded-[2rem] border border-stone-950 bg-stone-950 p-8 text-white">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#efb7a8]">Dónde estás yendo</p>
        <p className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.04em]">{siteConfig.location.area}</p>
        <p className="mt-3 text-lg font-semibold">{siteConfig.location.city}, {siteConfig.location.province}</p>
        <p className="mt-4 text-sm leading-6 text-stone-300">Parque San Sebastián · Ogíjares. Lo abres, sales y llegas sin darle más vueltas.</p>
      </div>
    </div>
  );
}
