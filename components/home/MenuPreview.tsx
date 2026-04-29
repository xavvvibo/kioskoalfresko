import { smashPromo } from "@/content/menu";
import { maySalesFocus } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { SmashPromoCTA } from "@/components/menu/SmashPromoCTA";

export function MenuPreview() {
  return (
    <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Carta</p>
          <p className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.04em] text-stone-950">Empieza por la ronda.</p>
          <p className="mt-3 text-lg font-medium leading-7 text-stone-800">{maySalesFocus.body}</p>
          <p className="mt-4 rounded-full border border-stone-950/10 bg-[#f8f1e7] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-stone-950">
            {maySalesFocus.extra}
          </p>
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
