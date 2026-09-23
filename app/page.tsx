import { buildMetadata } from "@/lib/metadata";
import { isFestivalHomePromotionActive } from "@/content/fiestas-2026";
import { Section } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { MenuPreview } from "@/components/home/MenuPreview";
import { ContactPanel } from "@/components/home/ContactPanel";
import { HomeFestivalBanner } from "@/components/fiestas/HomeFestivalBanner";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Gracias por este verano | Kiosko Alfresko",
  description: "Kiosko Alfresko cierra su temporada 2026 y prepara una nueva apertura en el centro de Granada. Sigue Instagram y WhatsApp para recibir novedades.",
  path: "/",
});

export default function HomePage() {
  const festivalActive = isFestivalHomePromotionActive();

  return (
    <main>
      <Hero />
      {festivalActive ? <HomeFestivalBanner /> : null}
      <Section eyebrow="Temporada 2026" title="Un verano para recordar">
        <div className="rounded-[2rem] border border-stone-950 bg-white p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap gap-3">
            {[
              "Gracias por venir",
              "SMASH LAB by Alfresko",
              "FERXA TRUFADA",
              "BOURBON BACON",
              "POLLO KICK",
              "La historia continúa",
              "Centro de Granada",
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
      <Section eyebrow="SMASH LAB by Alfresko" title="Descubre SMASH LAB">
        <MenuPreview />
      </Section>
      <Section eyebrow="Novedades" title="Sigue la nueva apertura">
        <ContactPanel />
      </Section>
    </main>
  );
}
