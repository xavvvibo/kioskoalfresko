import { buildMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { QuickDecision } from "@/components/home/QuickDecision";
import { TypeOfPlace } from "@/components/home/TypeOfPlace";
import { WhyCome } from "@/components/home/WhyCome";
import { MenuPreview } from "@/components/home/MenuPreview";
import { LocationPanel } from "@/components/home/LocationPanel";
import { SchedulePanel } from "@/components/home/SchedulePanel";
import { ContactPanel } from "@/components/home/ContactPanel";
import { SeoLinksPanel } from "@/components/home/SeoLinksPanel";
import { FinalCta } from "@/components/home/FinalCta";
import { SpringHighlights } from "@/components/home/SpringHighlights";

export const metadata = buildMetadata({
  title: "Kiosko Alfresko | Terraza para tomar algo en Ogíjares",
  description: "Terraza para tomar algo en Ogíjares con smash burgers, tapas y plan fácil en el Parque San Sebastián.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Section title="Lo ves. Lo propones. Vais." description="La home ya no va de explicarlo todo. Va de que en unos segundos se entienda el plan.">
        <QuickDecision />
      </Section>
      <Section eyebrow="Venta rápida" title="Lo que hay aquí">
        <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap gap-3">
            {[
              "Smash burgers 180G",
              "Bebida + tapa incluida",
              "Parrilla (secreto, costillas)",
              "Patatas top",
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
      <Section eyebrow="Venta rápida" title="🔥 Las más pedidas">
        <div className="grid gap-4 md:grid-cols-3">
          {["Baiconera", "Cabra Loca", "Ahumada"].map((item, index) => (
            <article
              key={item}
              className={`rounded-[1.8rem] border border-stone-950 p-6 shadow-[0_14px_28px_rgba(0,0,0,0.06)] ${
                index === 0 ? "bg-stone-950 text-white" : index === 1 ? "bg-[#d94b2b] text-white" : "bg-white text-stone-950"
              }`}
            >
              <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${index === 2 ? "text-[#d94b2b]" : "text-white/75"}`}>
                Smash Burgers 180G
              </p>
              <h3 className="mt-4 text-3xl font-black uppercase leading-none tracking-[-0.05em]">
                {item}
              </h3>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="Primavera en Ogíjares" title="Primavera en Ogíjares">
        <p className="max-w-2xl text-base leading-7 text-stone-700 md:text-lg">Empieza la temporada de calle, parque y terraceo. Y se nota.</p>
        <div className="mt-8">
          <SpringHighlights />
        </div>
        <p className="mt-6 text-base font-semibold text-stone-900">Si hay plan en Ogíjares, se acaba pasando por aquí.</p>
      </Section>
      <Section eyebrow="Qué tipo de sitio es" title="No se reserva una experiencia. Se monta el plan.">
        <TypeOfPlace />
      </Section>
      <Section eyebrow="Por qué venir" title="Porque una suele llevar a otra.">
        <WhyCome />
      </Section>
      <Section eyebrow="Carta" title="Primero la ronda. Luego ya veremos.">
        <MenuPreview />
      </Section>
      <Section eyebrow="Ubicación" title="Parque San Sebastián. Ogíjares. Y poca más explicación hace falta.">
        <LocationPanel />
      </Section>
      <Section eyebrow="Horarios" title="Horario actual">
        <SchedulePanel />
      </Section>
      <Section eyebrow="Contacto" title="Si quieres cerrar algo antes de salir.">
        <ContactPanel />
      </Section>
      <Section eyebrow="SEO local" title="Tomar algo en Ogíjares. Terraza. Tapas. Bar.">
        <SeoLinksPanel />
      </Section>
      <section className="px-4 py-18 sm:px-6 md:py-24"><div className="mx-auto max-w-6xl"><FinalCta /></div></section>
    </main>
  );
}
