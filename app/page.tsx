import { buildMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { QuickDecision } from "@/components/home/QuickDecision";
import { MenuPreview } from "@/components/home/MenuPreview";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { ContactPanel } from "@/components/home/ContactPanel";
import { CorpusClosureNotice } from "@/components/marketing/CorpusClosureNotice";

export const metadata = buildMetadata({
  title: "Kiosko Alfresko | Terraza en Ogíjares con tapas y smash burgers",
  description: "Kiosko Alfresko vuelve el 10 de junio con horario de verano en Ogíjares, Granada sur: miércoles a domingo, de 19:00 a 24:00, con terraza, tapas, cerveza fría y smash burgers.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-10">
        <CorpusClosureNotice />
      </section>
      <Hero />
      <Section title="Elige tu plan" description="Reservar, ver la carta o preparar la vuelta a las noches ALFRESKO.">
        <QuickDecision />
      </Section>
      <Section eyebrow="Lo que te espera" title="Qué puedes pedir">
        <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap gap-3">
            {[
              "Volvemos el 10 de junio",
              "Noches de terraza",
              "Smash burgers 180G",
              "Tapas y cerveza fría",
              "Cerveza fría",
              "Ogíjares · Granada sur",
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
