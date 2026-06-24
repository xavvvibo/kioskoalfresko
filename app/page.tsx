import { buildMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { QuickDecision } from "@/components/home/QuickDecision";
import { MenuPreview } from "@/components/home/MenuPreview";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { ContactPanel } from "@/components/home/ContactPanel";

export const metadata = buildMetadata({
  title: "Kiosko Alfresko | Terraza en Ogíjares con tapas y smash burgers",
  description: "Kiosko Alfresko en Ogíjares, Granada sur: terraza, tapas, smash burgers y reservas para eventos de verano en el Parque San Sebastián.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Section title="Elige tu plan" description="Reservar, ver la carta o preparar tu noche ALFRESKO en Ogíjares.">
        <QuickDecision />
      </Section>
      <Section eyebrow="Lo que te espera" title="Qué puedes pedir">
        <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap gap-3">
            {[
              "Noches de terraza",
              "Smash burgers 180G",
              "Tapas y brasas",
              "Reservas online",
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
      <Section eyebrow="Eventos de verano" title="Parque San Sebastián con reserva">
        <UpcomingEvents />
      </Section>
      <Section eyebrow="Contacto" title="Todo a mano antes de venir">
        <ContactPanel />
      </Section>
    </main>
  );
}
