import { heroActions, maySchedule, maySalesFocus, siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function Hero() {
  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const opensAt = 10 * 60;
  const closesAt = 17 * 60;
  const isServiceDay = day === 4 || day === 5 || day === 6 || day === 0;
  const isOpenBySchedule = isServiceDay && minutes >= opensAt && minutes < closesAt;

  return (
    <section className="relative overflow-hidden border-b border-stone-950 bg-[radial-gradient(circle_at_85%_14%,rgba(217,75,43,0.28),transparent_19%),radial-gradient(circle_at_20%_10%,rgba(17,17,17,0.06),transparent_28%),linear-gradient(180deg,#f5efe5_0%,#eadfce_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,transparent_0%,rgba(17,17,17,0.08)_48%,transparent_100%)]" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-[1.08fr_0.92fr] md:gap-10 md:pb-24 md:pt-16">
        <div className="relative">
          <div className="absolute -left-3 top-20 hidden h-28 w-1 bg-[#d94b2b] md:block" />
          <p className="inline-flex rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]">Ogíjares · Parque San Sebastián</p>
          <p className="mt-4 inline-flex rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_14px_28px_rgba(217,75,43,0.24)]">
            {maySchedule.weekendNotice}
          </p>
          <p
            className={`mt-4 inline-flex rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] shadow-[0_10px_20px_rgba(0,0,0,0.08)] ${
              isOpenBySchedule
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-stone-950 bg-white text-stone-950"
            }`}
          >
            {isOpenBySchedule ? "🟢 Abierto ahora" : "🔴 Cerrado"}
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#d94b2b]">
            🔥 Hoy hay ambiente
          </p>
          <h1 className="mt-7 max-w-4xl text-[3.3rem] font-black uppercase leading-[0.88] tracking-[-0.07em] text-stone-950 sm:text-[4.3rem] md:max-w-3xl md:text-[6.25rem]">{siteConfig.positioning.headline}</h1>
          <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-stone-800 md:text-xl md:leading-8">{siteConfig.positioning.subheadline}</p>
          <div className="mt-5 flex max-w-2xl flex-wrap gap-2.5">
            {siteConfig.positioning.support.map((item) => (
              <span key={item} className="rounded-full border border-stone-950/90 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-950 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">{item}</span>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            {heroActions.filter((action) => action.label !== "Llamar").map((action) => (
              <ActionButton key={action.label} href={action.href} kind={action.kind}>{action.label}</ActionButton>
            ))}
            <ActionButton href={siteConfig.contact.orderWhatsappUrl} kind="secondary" newTab>📲 Pedir por WhatsApp</ActionButton>
            <ActionButton href={siteConfig.location.mapsUrl} kind="ghost" newTab>📍 Llegar ahora</ActionButton>
          </div>
          <p className="mt-5 text-sm font-semibold text-stone-700">👉 Vienes por una… te quedas por todo</p>
          <p className="mt-2 text-sm font-semibold text-stone-700">👉 En 5 minutos estás aquí con una cerveza</p>
          <p className="mt-2 text-sm font-semibold text-stone-700">👉 Aquí siempre cae otra 😉</p>
        </div>
        <div className="relative grid gap-4 self-end md:pl-6">
          <div className="absolute -left-5 top-10 hidden h-[78%] w-px bg-stone-950/14 md:block" />
          <div className="relative overflow-hidden rounded-[2.4rem] border border-stone-950 bg-stone-950 p-7 text-white shadow-[0_34px_90px_rgba(0,0,0,0.22)] md:p-8">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[2.4rem] bg-[#d94b2b]" />
            <p className="relative z-10 text-xs font-black uppercase tracking-[0.22em] text-[#efb7a8]">{maySchedule.normalLabel}</p>
            <p className="relative z-10 mt-5 text-[2.4rem] font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-[3.8rem]">{maySchedule.normalHours}</p>
            <p className="relative z-10 mt-5 max-w-sm text-sm leading-6 text-stone-300 md:text-base">{maySchedule.weekendLead}</p>
            <div className="relative z-10 mt-6 flex flex-wrap gap-3">
              <ActionButton href="/carta">Ver carta</ActionButton>
              <ActionButton href="/ubicacion-ogijares" kind="secondary">Cómo llegar</ActionButton>
              <ActionButton href={siteConfig.location.mapsUrl} kind="ghost" newTab>📍 Llegar ahora</ActionButton>
            </div>
            <p className="relative z-10 mt-4 text-sm font-semibold text-white/80">👉 Abre Google Maps directo</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.8rem] border border-stone-950 bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d94b2b]">Horario mayo</div>
              <div className="mt-3 text-lg font-black uppercase leading-tight text-stone-950 md:text-[1.35rem]">{maySchedule.normalSummary}</div>
            </div>
            <div className="rounded-[1.8rem] border border-stone-950 bg-[#d94b2b] p-5 text-white shadow-[0_16px_34px_rgba(217,75,43,0.22)]">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Este finde</div>
              <div className="mt-3 text-lg font-black uppercase leading-tight md:text-[1.35rem]">{maySalesFocus.title}</div>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/88">{maySalesFocus.extra}</p>
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
          <p className="text-center text-base font-black uppercase tracking-[0.14em] text-stone-950">
            👉 Si no has venido aún, estás tardando
          </p>
        </div>
      </div>
    </section>
  );
}
