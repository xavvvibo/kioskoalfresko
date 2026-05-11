import { buildMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { QuickDecision } from "@/components/home/QuickDecision";
import { MenuPreview } from "@/components/home/MenuPreview";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { ContactPanel } from "@/components/home/ContactPanel";

export const metadata = buildMetadata({
  title: "Kiosko Alfresko | Terraza en Ogíjares con desayunos, tapas y smash burgers",
  description: "Kiosko en Ogíjares con desayunos jueves a domingo desde las 10:00, terraza, tapas, cervezas frías y smash burgers en el Parque San Sebastián.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Section title="CTA rápidos" description="Tres formas de decidirlo en segundos.">
        <QuickDecision />
      </Section>
      <Section eyebrow="Marca" title="Lo que hay aquí">
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
      <Section eyebrow="Smash burgers" title="SMASH BURGERS 180G 🔥">
        <MenuPreview />
      </Section>
      <Section eyebrow="Plazas limitadas en eventos" title="Próximos eventos ALFRESKO">
        <UpcomingEvents />
      </Section>
      <Section eyebrow="Contacto" title="Si quieres cerrar algo antes de salir.">
        <ContactPanel />
      </Section>
    </main>
  );
}
