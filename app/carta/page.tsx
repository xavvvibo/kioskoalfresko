"use client";

import { MenuHero } from "@/components/menu/MenuHero";
import { MenuSectionBlock } from "@/components/menu/MenuSectionBlock";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SmashPromoCTA } from "@/components/menu/SmashPromoCTA";
import { menuHero, foodSections, drinksSections, smashPromo, menuFooter } from "@/content/menu";

export default function CartaPage() {
  const smashSection = foodSections.find((section) => section.id === "smash-burgers")!;
  const premiumSection = foodSections.find((section) => section.id === "premium")!;
  const shareSection = foodSections.find((section) => section.id === "para-compartir")!;
  const plansSection = foodSections.find((section) => section.id === "planes")!;
  const grillSection = foodSections.find((section) => section.id === "parrilla")!;
  const potatoesSection = foodSections.find((section) => section.id === "patatas")!;
  const easySection = foodSections.find((section) => section.id === "sin-complicarse")!;
  const eggsSection = foodSections.find((section) => section.id === "huevos")!;
  const kidsSection = foodSections.find((section) => section.id === "peques")!;
  const sodaSection = drinksSections.find((section) => section.id === "refrescos")!;
  const beerSection = drinksSections.find((section) => section.id === "cervezas")!;
  const packsSection = drinksSections.find((section) => section.id === "packs")!;

  return (
    <main className="bg-[linear-gradient(180deg,#090909_0%,#151515_24%,#100f0f_58%,#0b0b0b_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
        <MenuHero {...menuHero} />

        <section className="mt-8 space-y-5 md:mt-10">
          <SmashPromoCTA
            promo={smashPromo}
            size="lg"
            theme="dark"
            primaryAction={{ label: "Pedir ahora", href: "/reservas-contacto" }}
            secondaryAction={{ label: "Cómo llegar", href: "/ubicacion-ogijares" }}
          />

          <MenuSectionBlock section={smashSection} className="shadow-[0_30px_70px_rgba(217,75,43,0.18)]" />

          <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <MenuSectionBlock section={premiumSection} />
            <FeatureCard
              eyebrow="Comida"
              title="Pide rápido. Comparte. Alárgalo."
              text="Las smash mandan. La parrilla remata. Y lo demás está para seguir sin complicarse."
              accent="cream"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
            <MenuSectionBlock section={shareSection} />
            <MenuSectionBlock section={plansSection} />
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_0.95fr_1.1fr]">
          <div className="space-y-5">
            <MenuSectionBlock section={grillSection} />
            <MenuSectionBlock section={kidsSection} className="lg:max-w-[26rem]" />
          </div>
          <MenuSectionBlock section={potatoesSection} />
          <MenuSectionBlock section={easySection} />
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <MenuSectionBlock section={eggsSection} />
          <div className="hidden lg:block" aria-hidden="true" />
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f2c6bb]">
                Bebidas
              </p>
              <h2 className="mt-3 text-[3rem] font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#fff8ef] md:text-[4.6rem]">
                Bebidas
              </h2>
            </div>
            <p className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-stone-400 md:block">
              Bebe. Come. Quédate.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_0.9fr]">
            <MenuSectionBlock section={sodaSection} />
            <MenuSectionBlock section={beerSection} />
            <MenuSectionBlock section={packsSection} className="lg:-translate-y-2" />
          </div>
        </section>

        <footer className="mt-12 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#151515_0%,#0f0f0f_100%)] px-6 py-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <p className="text-[2.2rem] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#fff8ef] md:text-[3.6rem]">
            {menuFooter.claim}
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#f2c6bb]">
            Instagram y TikTok · {menuFooter.social}
          </p>
        </footer>
      </div>
    </main>
  );
}
