import { buildMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { QuickDecision } from "@/components/home/QuickDecision";
import { MenuPreview } from "@/components/home/MenuPreview";
import { ContactPanel } from "@/components/home/ContactPanel";
import { DeliveryPanel } from "@/components/home/DeliveryPanel";

export const metadata = buildMetadata({
  title: "Kiosko Alfresko | Smash Lab, burgers y terraza en Ogíjares",
  description: "Descubre SMASH LAB by Alfresko: smash burgers, cocina para compartir, terraza, delivery y reservas en el Parque San Sebastián de Ogíjares.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Section title="Elige tu plan" description="Ver la carta, pedir para recoger o reservar mesa en Kiosko Alfresko.">
        <QuickDecision />
      </Section>
      <Section eyebrow="Lo que te espera" title="Qué puedes pedir">
        <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap gap-3">
            {[
              "Noches de terraza",
              "SMASH LAB by Alfresko",
              "FERXA TRUFADA",
              "BOURBON BACON",
              "POLLO KICK",
              "Reservas en Qamarero",
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
      <Section eyebrow="SMASH LAB by Alfresko" title="Las nuevas burgers">
        <MenuPreview />
      </Section>
      <Section eyebrow="Pedidos" title="Delivery y recogida">
        <DeliveryPanel />
      </Section>
      <Section eyebrow="Contacto" title="Todo a mano antes de venir">
        <ContactPanel />
      </Section>
    </main>
  );
}
