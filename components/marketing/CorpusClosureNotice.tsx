import { corpusClosureNotice, siteConfig, summerReopening } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { getQamareroReservationUrl } from "@/lib/integrations/qamarero";

export function CorpusClosureNotice() {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-stone-950/90 bg-[linear-gradient(90deg,#111111_0%,#111111_56%,#c74428_56%,#d94b2b_100%)] text-white shadow-[0_18px_42px_rgba(0,0,0,0.14)]">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-6 md:p-8">
          <p className="inline-flex rounded-full border border-white/14 bg-white/8 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f2c6bb]">
            {corpusClosureNotice.eyebrow}
          </p>
          <h2 className="mt-4 text-[1.9rem] font-black uppercase leading-[0.98] tracking-[-0.04em] text-[#fff8ef] md:text-[2.8rem]">
            {corpusClosureNotice.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-200 md:text-lg">
            {corpusClosureNotice.body}
          </p>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-stone-300">
            {corpusClosureNotice.support}
          </p>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#f2c6bb]">
            {summerReopening.claim}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton href={getQamareroReservationUrl("closure_banner")} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "closure_banner" }}>
              Reservar mesa
            </ActionButton>
            <ActionButton href={siteConfig.contact.instagramUrl} kind="secondary" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "closure_banner" }}>
              Ver Instagram
            </ActionButton>
            <ActionButton href={siteConfig.location.mapsUrl} kind="ghost" newTab analyticsEvent="click_como_llegar" analyticsPayload={{ location: "closure_banner" }}>
              Cómo llegar
            </ActionButton>
          </div>
        </div>

        <div className="border-t border-white/12 p-6 lg:border-l lg:border-t-0 md:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">
            Temporada de verano 2026
          </p>
          <div className="mt-5 rounded-[1.7rem] border border-white/14 bg-black/14 p-5 shadow-[0_10px_22px_rgba(0,0,0,0.14)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/75">
              {summerReopening.returnTitle}
            </p>
            <p className="mt-4 text-[2rem] font-black uppercase leading-[0.96] tracking-[-0.04em] text-white md:text-[2.5rem]">
              {summerReopening.days}
            </p>
            <p className="mt-3 text-[1.65rem] font-black uppercase leading-none tracking-[-0.03em] text-[#fff8ef] md:text-[2rem]">
              {summerReopening.hours}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
