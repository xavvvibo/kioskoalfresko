import Image from "next/image";
import { DeliveryPanel } from "@/components/home/DeliveryPanel";
import { MenuHero } from "@/components/menu/MenuHero";
import { MenuSectionBlock } from "@/components/menu/MenuSectionBlock";
import { SmashPromoCTA } from "@/components/menu/SmashPromoCTA";
import { ScheduleNotice } from "@/components/marketing/ScheduleNotice";
import { drinksSections, foodSections, menuArtwork, menuFooter, menuHero, smashPromo } from "@/content/menu";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Carta Kiosko Alfresko | SMASH LAB by Alfresko en Ogíjares",
  description: "Carta de Kiosko Alfresko: SMASH LAB by Alfresko, burgers a 14 €, platos para compartir, patatas, carnes, bebidas con tapa y pedidos para recoger.",
  path: "/carta",
});

export default function CartaPage() {
  const sections = [...foodSections, ...drinksSections];

  return (
    <main className="bg-[linear-gradient(180deg,#090909_0%,#151515_24%,#100f0f_58%,#0b0b0b_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
        <MenuHero {...menuHero} />
        <div className="mt-6">
          <ScheduleNotice />
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Categorías de carta">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-[#d94b2b] hover:bg-[#d94b2b]"
            >
              {section.title}
            </a>
          ))}
        </nav>

        <section className="mt-8 space-y-5 md:mt-10">
          <SmashPromoCTA
            promo={smashPromo}
            primaryAction={{ label: "Pedir ahora", href: "#pide-alfresko", analyticsEvent: "click_pedir_ahora" }}
            secondaryAction={{ label: "Reservar mesa", href: "/reservas-contacto", analyticsEvent: "click_reserva_contacto" }}
          />

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <MenuSectionBlock
              section={foodSections.find((section) => section.id === "smash-lab")}
              className="shadow-[0_30px_70px_rgba(217,75,43,0.18)]"
            />
            <MenuSectionBlock section={foodSections.find((section) => section.id === "lab-extras")} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <MenuSectionBlock section={foodSections.find((section) => section.id === "para-compartir")} />
            <MenuSectionBlock section={foodSections.find((section) => section.id === "huevos")} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <MenuSectionBlock section={foodSections.find((section) => section.id === "patatas")} />
            <MenuSectionBlock section={foodSections.find((section) => section.id === "carnes")} />
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f2c6bb]">Bebidas</p>
            <h2 className="mt-3 text-[3rem] font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#fff8ef] md:text-[4.6rem]">
              Bebidas
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.95fr_0.95fr]">
            {drinksSections.map((section) => (
              <MenuSectionBlock key={section.id} section={section} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <DeliveryPanel />
        </section>

        <section className="mt-12 rounded-[2rem] border border-white/10 bg-white/6 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f2c6bb]">Carta visual</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">Carta de comida y bebida</h2>
            </div>
            <a
              href={menuArtwork.foodAndDrinks.src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb] underline underline-offset-4"
            >
              Abrir imagen original
            </a>
          </div>
          <div className="relative mt-5 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black">
            <Image
              src={menuArtwork.foodAndDrinks.src}
              alt={menuArtwork.foodAndDrinks.alt}
              width={1024}
              height={1536}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="h-auto w-full"
            />
          </div>
        </section>

        <footer className="mt-12 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#151515_0%,#0f0f0f_100%)] px-6 py-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <p className="text-[2.2rem] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#fff8ef] md:text-[3.6rem]">
            {menuFooter.claim}
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#f2c6bb]">
            Instagram · {menuFooter.social}
          </p>
        </footer>
      </div>
    </main>
  );
}
