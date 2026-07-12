import Image from "next/image";
import { featuredBurgers } from "@/content/menu";
import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-stone-950 bg-[radial-gradient(circle_at_82%_16%,rgba(217,75,43,0.34),transparent_22%),linear-gradient(180deg,#090909_0%,#14100f_56%,#060606_100%)] text-white">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-8 sm:px-6 md:grid-cols-[0.94fr_1.06fr] md:gap-10 md:pb-16 md:pt-14">
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
            Kiosko Alfresko · {siteConfig.brandClaim}
          </p>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-[#d94b2b]">
            Presenta
          </p>
          <div className="mt-3">
            <p className="text-[3.2rem] font-black uppercase leading-[0.78] tracking-[-0.07em] text-[#fff8ef] sm:text-[4.6rem] md:text-[6.4rem]">
              SMASH<span className="text-[#d94b2b]">LAB</span>
            </p>
            <p className="mt-2 text-[1.45rem] font-black italic leading-none text-[#f2c6bb] sm:text-[2rem]">
              by Alfresko
            </p>
          </div>
          <h1 className="mt-6 max-w-2xl text-[2.45rem] font-black uppercase leading-[0.9] tracking-[-0.055em] text-white sm:text-[3.2rem] md:text-[4.5rem]">
            No es un kiosko. Es el plan.
          </h1>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-stone-200 md:text-lg">
            Descubre las nuevas burgers de SMASH LAB by Alfresko: FERXA TRUFADA, BOURBON BACON y POLLO KICK.
          </p>

          <div className="mt-6 grid gap-2 rounded-[1.35rem] border border-white/12 bg-black/28 p-3 sm:grid-cols-2">
            {siteConfig.schedule.rows.map((row) => (
              <div key={row.day} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/6 px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{row.day}</span>
                <span className="text-sm font-black text-white">{row.hours}</span>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <ActionButton href="/carta" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "hero" }}>
              Ver carta
            </ActionButton>
            <ActionButton href="#pide-alfresko" kind="secondary" analyticsEvent="click_pedir_ahora" analyticsPayload={{ location: "hero" }}>
              Pedir ahora
            </ActionButton>
            <ActionButton href={siteConfig.ctas.booking.href} kind="ghost" newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "hero" }}>
              Reservar mesa
            </ActionButton>
          </div>
        </div>

        <div className="relative z-10 grid gap-4">
          <div className="relative min-h-[17rem] overflow-hidden rounded-[1.8rem] border border-white/12 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.42)] sm:min-h-[22rem] md:min-h-[30rem]">
            <Image
              src="/menu/smash-burgers-hero-clean.png"
              alt="Burgers de SMASH LAB by Alfresko con patatas"
              fill
              priority
              sizes="(min-width: 768px) 52vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.28)_55%,rgba(0,0,0,0.82)_100%)]" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
              {featuredBurgers.map((burger) => (
                <span key={burger.name} className="rounded-full border border-white/20 bg-black/64 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                  {burger.name}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {featuredBurgers.map((burger) => (
              <article key={burger.name} className="rounded-[1.2rem] border border-white/12 bg-white p-4 text-stone-950 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#d94b2b] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">{burger.badge}</span>
                  <span className="text-sm font-black text-[#d94b2b]">{burger.price}</span>
                </div>
                <h2 className="mt-3 text-xl font-black uppercase leading-none tracking-[-0.04em]">{burger.name}</h2>
                <p className="mt-3 text-sm leading-5 text-stone-700">{burger.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
