import { heroActions, maySchedule, maySalesFocus, siteConfig, summerReopening } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function Hero() {
  const statusBadge = summerReopening.badge;
  const statusHeadline = "¡Volvemos después del descanso de Corpus!";
  const statusSupport = "Te esperamos desde el jueves 11 de junio con horario confirmado de verano.";

  return (
    <section className="relative overflow-hidden border-b border-stone-950 bg-[radial-gradient(circle_at_85%_14%,rgba(217,75,43,0.28),transparent_19%),radial-gradient(circle_at_20%_10%,rgba(17,17,17,0.06),transparent_28%),linear-gradient(180deg,#f5efe5_0%,#eadfce_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,transparent_0%,rgba(17,17,17,0.08)_48%,transparent_100%)]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[0.98fr_1.02fr] md:gap-12 md:pb-24 md:pt-16">
        <div className="relative max-w-2xl">
          <div className="absolute -left-3 top-20 hidden h-28 w-1 bg-[#d94b2b] md:block" />
          <p className="inline-flex rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]">Ogíjares · Parque San Sebastián</p>
          <p className="mt-5 inline-flex rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_14px_28px_rgba(217,75,43,0.24)]">
            {maySchedule.weekendNotice}
          </p>
          <p className="mt-5 inline-flex rounded-full border border-stone-950 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-950 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
            {statusBadge}
          </p>
          <p className="mt-6 text-sm font-semibold tracking-[0.08em] text-[#d94b2b]">
            {statusHeadline}
          </p>
          <h1 className="mt-7 max-w-2xl text-[2.45rem] font-black uppercase leading-[0.92] tracking-[-0.05em] text-stone-950 sm:text-[3.15rem] md:text-[4.55rem]">{siteConfig.positioning.headline}</h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-7 text-stone-800 md:text-lg md:leading-8">{siteConfig.positioning.subheadline}</p>
          <p className="mt-4 text-base font-medium italic text-stone-700">Reserva tu mesa y vuelve a vivir la experiencia Alfresko.</p>
          <p className="mt-5 text-sm font-medium text-stone-700">{statusSupport}</p>
          <div className="mt-6 flex max-w-xl flex-wrap gap-2.5">
            {siteConfig.positioning.support.map((item) => (
              <span key={item} className="rounded-full border border-stone-950/20 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-stone-950 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">{item}</span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <ActionButton href={siteConfig.ctas.booking.href} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "hero_primary" }}>
              Reservar mesa
            </ActionButton>
            {heroActions.filter((action) => action.label === "Ver carta").map((action) => (
              <ActionButton
                key={action.label}
                href={action.href}
                kind={action.kind}
                analyticsEvent="click_ver_carta"
                analyticsPayload={{ location: "hero_primary" }}
              >
                Ver carta
              </ActionButton>
            ))}
            <ActionButton href={siteConfig.contact.instagramUrl} kind="ghost" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "hero_primary" }}>Instagram</ActionButton>
          </div>
          <div className="mt-8 space-y-2.5 text-sm text-stone-700">
            <p>Reabrimos para una nueva temporada de verano con ambiente nocturno al aire libre.</p>
            <p>Tapas, smash burgers y carnes a la brasa vuelven a la terraza de Ogíjares.</p>
            <p>Si vienes desde Granada sur, llegar al Parque San Sebastián sigue siendo rápido.</p>
          </div>
        </div>
        <div className="relative grid gap-5 self-end md:pl-6">
          <div className="absolute -left-5 top-10 hidden h-[78%] w-px bg-stone-950/14 md:block" />
          <div className="relative overflow-hidden rounded-[2.4rem] border border-stone-950/90 bg-stone-950 p-7 text-white shadow-[0_26px_70px_rgba(0,0,0,0.18)] md:p-8">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[2.4rem] bg-[#d94b2b]" />
            <p className="relative z-10 text-xs font-black uppercase tracking-[0.22em] text-[#efb7a8]">{maySchedule.normalLabel}</p>
            <p className="relative z-10 mt-5 text-[2rem] font-black leading-[1] tracking-[-0.05em] md:text-[3rem]">{maySchedule.normalHours}</p>
            <p className="relative z-10 mt-5 max-w-sm text-sm leading-6 text-stone-300 md:text-base">{maySchedule.weekendLead}</p>
            <div className="relative z-10 mt-6 flex flex-wrap gap-3">
              <ActionButton href={siteConfig.ctas.booking.href} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "hero_schedule" }}>Reservar mesa</ActionButton>
              <ActionButton href="/carta" kind="secondary" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "hero_schedule" }}>Ver carta</ActionButton>
              <ActionButton href={siteConfig.contact.instagramUrl} kind="ghost" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "hero_schedule_instagram" }}>Instagram</ActionButton>
            </div>
            <p className="relative z-10 mt-4 text-sm text-white/75">{summerReopening.claim}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.8rem] border border-stone-950/90 bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d94b2b]">Horario actual</div>
              <div className="mt-3 text-base font-semibold leading-7 text-stone-900 md:text-[1.05rem]">{maySchedule.normalSummary}</div>
            </div>
            <div className="rounded-[1.8rem] border border-stone-950/10 bg-[#cf5336] p-5 text-white shadow-[0_14px_26px_rgba(217,75,43,0.18)]">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Reapertura ALFRESKO</div>
              <div className="mt-3 text-lg font-black leading-tight md:text-[1.25rem]">{maySalesFocus.title}</div>
              <p className="mt-3 text-sm leading-6 text-white/88">{maySalesFocus.extra}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {maySalesFocus.microcopy.map((item) => (
                  <span key={item} className="rounded-full border border-white/18 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-10 sm:px-6 md:pb-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-sm font-medium tracking-[0.08em] text-stone-700">
            Terraza, tapas y un plan de noche fácil para volver a Ogíjares este verano.
          </p>
        </div>
      </div>
    </section>
  );
}
