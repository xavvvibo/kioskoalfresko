import { smashPromo } from "@/content/menu";
import { ActionButton } from "@/components/ui/ActionButton";
import { SmashPromoCTA } from "@/components/menu/SmashPromoCTA";

export function MenuPreview() {
  return (
    <div className="rounded-[2rem] border border-stone-950 bg-white p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)] md:p-8">
      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Smash burgers</p>
          <p className="mt-4 text-[2rem] font-black uppercase leading-[0.95] tracking-[-0.04em] text-stone-950 sm:text-[2.6rem]">
            Smash Burgers 180G 🔥
          </p>
          <p className="mt-4 max-w-md text-base leading-7 text-stone-700 sm:text-lg">
            Doble smash con patatas para comer en terraza, compartir algo más y seguir la sobremesa en Ogíjares.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Doble carne 180g",
              "Patatas incluidas",
              "Tres versiones de la casa",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-stone-950"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="mt-7"><ActionButton href="/carta" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "menu_preview" }}>Ver carta</ActionButton></div>
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
