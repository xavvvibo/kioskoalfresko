import { buildMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { QuickDecision } from "@/components/home/QuickDecision";
import { MenuPreview } from "@/components/home/MenuPreview";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { ContactPanel } from "@/components/home/ContactPanel";
import { WeekendSpecialBlock } from "@/components/marketing/WeekendSpecialBlock";
import { CorpusClosureNotice } from "@/components/marketing/CorpusClosureNotice";

export const metadata = buildMetadata({
  title: "Kiosko Alfresko | Terraza en Ogíjares con desayunos, tapas y smash burgers",
  description: "Terraza en Ogíjares, Granada sur, con desayunos desde las 10:00, café y tostadas, tapas, cerveza fría y smash burgers en el Parque San Sebastián.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WeekendSpecialBlock />
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-10">
        <CorpusClosureNotice />
      </section>
      <Section title="Elige tu plan" description="Desayunar, tapear, reservar o venir directamente.">
        <QuickDecision />
      </Section>
      <Section eyebrow="Lo que te espera" title="Qué puedes pedir">
        <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap gap-3">
            {[
              "Desayunos desde las 10:00",
              "Café + tostadas al sol",
              "Smash burgers 180G",
              "Bebida + tapa incluida",
              "Cerveza fría",
              "Terraza en parque",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-stone-950 bg-[#f8f1e7] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-stone-950"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </Section>
      <Section eyebrow="Smash burgers" title="Smash burgers 180G">
        <MenuPreview />
      </Section>
      <Section eyebrow="Reserva e Instagram" title="Elige cómo venir">
        <UpcomingEvents />
      </Section>
      <Section eyebrow="Contacto" title="Todo a mano antes de venir">
        <ContactPanel />
      </Section>
    </main>
  );
}
