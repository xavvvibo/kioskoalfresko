import { FestivalHoursCard } from "@/components/fiestas/FestivalHoursCard";
import { FestivalProgramme } from "@/components/fiestas/FestivalProgramme";
import { ActionButton } from "@/components/ui/ActionButton";
import { festivalDates } from "@/content/fiestas-2026";
import { siteConfig } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Fiestas de Ogíjares 2026 | Programación y horarios | Kiosko Alfresko",
  description:
    "Consulta la programación de las Fiestas de Ogíjares 2026 y el horario especial de Kiosko Alfresko en Parque San Sebastián, del 10 al 14 de septiembre.",
  path: festivalDates.pagePath,
});

export default function FiestasOgijares2026Page() {
  return (
    <main className="bg-[#f5efe5]">
      <section className="border-b border-stone-950 bg-[linear-gradient(180deg,#090909_0%,#171110_58%,#d94b2b_100%)] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:py-18">
          <div>
            <p className="inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
              Kiosko Alfresko · SMASH LAB
            </p>
            <h1 className="mt-5 text-[3.2rem] font-black uppercase leading-[0.86] tracking-[-0.06em] text-[#fff8ef] md:text-[5.7rem]">
              Fiestas de Ogíjares 2026
            </h1>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-stone-200">
              Del 10 al 14 de septiembre · Parque San Sebastián
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-300">
              Consulta la programación de las Fiestas de Ogíjares y el horario especial de Kiosko Alfresko para estos días.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ActionButton href="/carta" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "fiestas_landing_hero" }}>
                Ver carta
              </ActionButton>
              <ActionButton href={siteConfig.contact.orderWhatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp_pedido" analyticsPayload={{ location: "fiestas_landing_hero" }}>
                Pedir
              </ActionButton>
              <ActionButton href={siteConfig.ctas.booking.href} kind="ghost" newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "fiestas_landing_hero" }}>
                Reservar
              </ActionButton>
            </div>
          </div>
          <FestivalHoursCard compact />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d94b2b]">Programación Fiestas Ogíjares</p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-stone-950 md:text-6xl">
            Programación de las Fiestas de Ogíjares
          </h2>
          <p className="mt-5 text-base leading-7 text-stone-700 md:text-lg">
            Horarios, actividades y actuaciones por día. Cuando el programa indica ubicación, aparece junto al evento.
          </p>
        </div>
        <div className="mt-10">
          <FestivalProgramme />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-[2rem] border border-stone-950 bg-stone-950 p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] md:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f2c6bb]">Parque San Sebastián Ogíjares</p>
          <h2 className="mt-4 text-[2.4rem] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#fff8ef] md:text-[4rem]">
            Entre plan y plan, nos vemos en Alfresko.
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            <ActionButton href="/carta" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "fiestas_landing_final" }}>
              Ver carta
            </ActionButton>
            <ActionButton href={siteConfig.contact.orderWhatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp_pedido" analyticsPayload={{ location: "fiestas_landing_final" }}>
              Pedir
            </ActionButton>
            <ActionButton href={siteConfig.ctas.booking.href} kind="ghost" newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "fiestas_landing_final" }}>
              Reservar
            </ActionButton>
          </div>
        </div>
      </section>
    </main>
  );
}
