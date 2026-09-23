import Image from "next/image";
import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-stone-950 bg-[linear-gradient(180deg,#fffaf4_0%,#f3eadb_56%,#efe2ce_100%)] text-stone-950">
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(80,73,43,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(80,73,43,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-[#566137]/15" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-8 sm:px-6 md:grid-cols-[1.02fr_0.98fr] md:gap-10 md:pb-16 md:pt-14">
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-[#566137]/40 bg-white/72 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#566137] shadow-[0_12px_30px_rgba(86,97,55,0.12)]">
            Cierre de temporada 2026
          </p>
          <h1 className="mt-5 max-w-3xl text-[3.05rem] font-black uppercase leading-[0.82] text-stone-950 sm:text-[4.4rem] md:text-[6.4rem]">
            Gracias por este verano
          </h1>
          <p className="mt-5 max-w-xl text-lg font-black uppercase tracking-[0.12em] text-[#566137] md:text-xl">
            Kiosko Alfresko cierra su temporada 2026
          </p>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-stone-700 md:text-lg">
            Gracias por cada noche, cada burger, cada ronda y cada rato compartido en el Parque San Sebastián. Cerramos una etapa con el corazón lleno y la mirada puesta en lo que viene.
          </p>

          <div className="mt-7 rounded-[1.7rem] border border-stone-950 bg-white p-5 shadow-[0_24px_55px_rgba(86,97,55,0.16)] md:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#d94b2b]">
              La historia continúa
            </p>
            <h2 className="mt-3 text-[2.35rem] font-black uppercase leading-[0.88] text-stone-950 sm:text-[3.2rem]">
              Nueva apertura próximamente en el centro de Granada
            </h2>
            <p className="mt-4 inline-flex rounded-full border border-[#566137]/40 bg-[#566137] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white">
              Coming soon
            </p>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-stone-700">
              Muy pronto podrás seguir disfrutando de la esencia de Kiosko Alfresko, de SMASH LAB y de muchas cosas ricas más en pleno centro de Granada.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <ActionButton href={siteConfig.contact.instagramUrl} newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "hero_closure" }}>
              Instagram
            </ActionButton>
            <ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "hero_closure" }}>
              WhatsApp
            </ActionButton>
            <ActionButton href="/carta" kind="ghost" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "hero_closure" }}>
              Descubre SMASH LAB
            </ActionButton>
          </div>
        </div>

        <div className="relative z-10 grid gap-4">
          <div className="relative min-h-[17rem] overflow-hidden rounded-[1.8rem] border border-stone-950 bg-black shadow-[0_30px_90px_rgba(86,97,55,0.22)] sm:min-h-[22rem] md:min-h-[31rem]">
            <Image
              src="/menu/smash-burgers-hero-clean.png"
              alt="Burgers de SMASH LAB de Kiosko Alfresko"
              fill
              priority
              sizes="(min-width: 768px) 52vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.24)_52%,rgba(0,0,0,0.82)_100%)]" />
            <div className="absolute bottom-4 left-4 right-4 rounded-[1.2rem] border border-white/18 bg-black/60 p-4 text-white backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f0d28f]">SMASH LAB</p>
              <p className="mt-2 text-2xl font-black uppercase leading-none">La brasa sigue encendida</p>
              <p className="mt-2 text-sm font-semibold leading-5 text-white/82">Sigue a Kiosko Alfresko para recibir novedades de la nueva apertura.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {["Gracias", "Nueva etapa", "Centro de Granada"].map((item) => (
              <article key={item} className="rounded-[1.2rem] border border-stone-950 bg-white p-4 text-stone-950 shadow-[0_18px_40px_rgba(86,97,55,0.12)]">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#566137]">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
