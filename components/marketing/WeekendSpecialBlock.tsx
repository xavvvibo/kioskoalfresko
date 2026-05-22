import { specialWeekendCampaign, siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { getQamareroReservationUrl } from "@/lib/integrations/qamarero";

export function WeekendSpecialBlock() {
  return (
    <section className="border-b border-stone-950 bg-[linear-gradient(180deg,#0a0a0a_0%,#141414_54%,#1b0905_100%)] py-7 text-white md:py-9">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(217,75,43,0.18),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.01)_100%)] p-6 shadow-[0_22px_54px_rgba(0,0,0,0.18)] md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2c6bb]">
                {specialWeekendCampaign.eyebrow}
              </p>
              <h2 className="mt-4 max-w-3xl text-[2rem] font-black uppercase leading-[0.96] tracking-[-0.04em] text-[#fff8ef] md:text-[3.2rem]">
                {specialWeekendCampaign.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 md:text-base">
                {specialWeekendCampaign.intro}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {specialWeekendCampaign.highlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm font-semibold leading-6 text-white/85">
                {specialWeekendCampaign.reservationNote}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ActionButton href={getQamareroReservationUrl("special_weekend")} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "special_weekend" }}>
                  Reservar mesa
                </ActionButton>
                <ActionButton href={siteConfig.contact.instagramUrl} kind="secondary" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "special_weekend" }}>
                  Ver Instagram
                </ActionButton>
                <ActionButton href={siteConfig.location.mapsUrl} kind="ghost" newTab analyticsEvent="click_como_llegar" analyticsPayload={{ location: "special_weekend" }}>
                  Cómo llegar
                </ActionButton>
              </div>
            </div>

            <div className="grid gap-4 self-stretch sm:grid-cols-2 lg:grid-cols-1">
              <article className="rounded-[1.7rem] border border-white/12 bg-[#c94c2f] p-5 text-white shadow-[0_12px_24px_rgba(217,75,43,0.15)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/75">
                  Este fin de semana
                </p>
                <h3 className="mt-3 text-[1.35rem] font-black uppercase tracking-[-0.03em]">
                  {specialWeekendCampaign.scheduleTitle}
                </h3>
              </article>
              {specialWeekendCampaign.schedule.map((item) => (
                <article key={item.day} className="rounded-[1.7rem] border border-white/12 bg-white/6 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">
                    {item.day}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[#fff8ef]">
                    {item.hours}
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
