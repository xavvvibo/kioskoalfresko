import { smashPromo } from "@/content/menu";
import { ActionButton } from "@/components/ui/ActionButton";
import { SmashPromoCTA } from "@/components/menu/SmashPromoCTA";

export function MenuPreview() {
  return (
    <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Carta</p>
          <p className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.04em] text-stone-950">Empieza por la ronda.</p>
          <p className="mt-3 text-lg font-medium leading-7 text-stone-800">Smash burgers, parrilla, cosas para compartir y bebidas con precios claros para decidir rápido.</p>
          <div className="mt-6"><ActionButton href="/carta">Ver carta</ActionButton></div>
        </div>
        <SmashPromoCTA
          promo={smashPromo}
          size="md"
          theme="dark"
          compact
          primaryAction={{ label: "Ver carta", href: "/carta" }}
        />
      </div>
    </div>
  );
}
