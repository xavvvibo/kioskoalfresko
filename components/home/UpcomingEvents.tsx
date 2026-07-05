import { upcomingEvents } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function UpcomingEvents() {
  return (
    <div className="grid gap-6">
      <div className="rounded-[2rem] border border-stone-950/90 bg-stone-950 p-7 text-white shadow-[0_18px_44px_rgba(0,0,0,0.14)] md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
          {upcomingEvents.eyebrow}
        </p>
        <h3 className="mt-4 max-w-3xl text-[1.95rem] font-black uppercase leading-[0.96] tracking-[-0.04em] md:text-[2.9rem]">
          {upcomingEvents.title}
        </h3>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
          {upcomingEvents.intro}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          {upcomingEvents.items.map((item) => (
            <article
              key={`${item.date}-${item.title}`}
              className="rounded-[1.8rem] border border-stone-950 bg-white p-6 shadow-[0_14px_34px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">
                    {item.date}
                  </p>
                  <h4 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">
                    {item.title}
                  </h4>
                </div>
                <span className="rounded-full border border-stone-950 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">
                  {item.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-stone-700">
                {item.description}
              </p>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">
                Alta afluencia prevista · kioskoalfresko.es
              </p>
              <div className="mt-5">
                <ActionButton href={item.cta.href} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "upcoming_events_card", event_title: item.title }}>{item.cta.label}</ActionButton>
              </div>
            </article>
          ))}
        </div>

        <article className="rounded-[1.8rem] border border-stone-950 bg-[#f8f1e7] p-6 shadow-[0_14px_34px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">
            Reserva fácil
          </p>
          <h4 className="mt-3 text-[1.8rem] font-black uppercase leading-[0.98] tracking-[-0.03em] text-stone-950">
            {upcomingEvents.reservationTitle}
          </h4>
          <p className="mt-4 text-sm leading-6 text-stone-700">
            {upcomingEvents.reservationBody}
          </p>
          <p className="mt-4 text-sm font-semibold leading-6 text-stone-800">
            {upcomingEvents.reservationMicrocopy}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton href={upcomingEvents.primaryCta.href} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "upcoming_events_sidebar" }}>
              {upcomingEvents.primaryCta.label}
            </ActionButton>
            <ActionButton href={upcomingEvents.secondaryCta.href} kind="secondary" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "upcoming_events_sidebar" }}>
              {upcomingEvents.secondaryCta.label}
            </ActionButton>
          </div>
        </article>
      </div>

      <div className="rounded-[1.8rem] border border-stone-950/12 bg-stone-100 p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">
          Histórico
        </p>
        <h4 className="mt-3 text-[1.7rem] font-black uppercase leading-none tracking-[-0.03em] text-stone-950">
          {upcomingEvents.historicTitle}
        </h4>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          {upcomingEvents.historicIntro}
        </p>
        <div className="mt-5 grid gap-3">
          {upcomingEvents.pastItems.map((item) => (
            <article
              key={`${item.date}-${item.title}`}
              className="rounded-[1.4rem] border border-stone-950/10 bg-white/70 p-5 text-stone-600"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">
                    {item.date}
                  </p>
                  <h5 className="mt-2 text-lg font-black uppercase tracking-[-0.02em] text-stone-700">
                    {item.title}
                  </h5>
                </div>
                <span className="rounded-full border border-stone-950/10 bg-stone-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-600">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
