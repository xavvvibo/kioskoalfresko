import { festivalDates } from "@/content/fiestas-2026";
import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { FestivalHoursCard } from "@/components/fiestas/FestivalHoursCard";

export function HomeFestivalBanner() {
  return (
    <section className="border-b border-stone-950 bg-[#f5efe5]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
        <div className="overflow-hidden rounded-[2rem] border border-stone-950 bg-[linear-gradient(135deg,#111111_0%,#151111_58%,#d94b2b_58%,#c74428_100%)] text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-6 md:p-8">
              <p className="inline-flex rounded-full border border-white/14 bg-white/8 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
                {festivalDates.title}
              </p>
              <h2 className="mt-4 text-[2.45rem] font-black uppercase leading-[0.9] tracking-[-0.055em] text-[#fff8ef] md:text-[4rem]">
                Alfresko está en el centro de la fiesta.
              </h2>
              <p className="mt-4 text-base font-semibold leading-7 text-stone-200 md:text-lg">
                {festivalDates.dateRange} · {festivalDates.location}. Durante las Fiestas de Ogíjares tenemos horario especial.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/14 bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  Parque San Sebastián Ogíjares
                </span>
                <span className="rounded-full border border-white/14 bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  SMASH LAB by Alfresko
                </span>
                <span className="rounded-full border border-white/14 bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  Barra hasta cierre
                </span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <ActionButton href="/carta" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "fiestas_home_banner" }}>
                  Ver carta
                </ActionButton>
                <ActionButton href={siteConfig.contact.orderWhatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp_pedido" analyticsPayload={{ location: "fiestas_home_banner" }}>
                  Pedir
                </ActionButton>
                <ActionButton href={festivalDates.pagePath} kind="ghost">
                  Ver programación de fiestas
                </ActionButton>
              </div>
            </div>
            <div className="border-t border-white/12 bg-white/8 p-4 md:p-6 lg:border-l lg:border-t-0">
              <FestivalHoursCard compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
