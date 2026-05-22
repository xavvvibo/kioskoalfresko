import { corpusClosureNotice, siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function CorpusClosureNotice() {
  return (
    <section className="rounded-[2rem] border border-stone-950/90 bg-[linear-gradient(180deg,#111111_0%,#1a1a1a_100%)] p-6 text-white shadow-[0_18px_42px_rgba(0,0,0,0.14)] md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2c6bb]">
            {corpusClosureNotice.eyebrow}
          </p>
          <h2 className="mt-3 text-[1.8rem] font-black uppercase leading-[0.98] tracking-[-0.04em] text-[#fff8ef] md:text-[2.5rem]">
            {corpusClosureNotice.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-stone-200 md:text-lg">
            {corpusClosureNotice.body}
          </p>
          <p className="mt-4 text-sm font-semibold leading-6 text-stone-300">
            {corpusClosureNotice.support}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton href={siteConfig.contact.instagramUrl} kind="secondary" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "corpus_notice" }}>
            Ver Instagram
          </ActionButton>
          <ActionButton href="/carta" kind="ghost" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "corpus_notice" }}>
            Ver carta
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
