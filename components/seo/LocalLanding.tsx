import { SeoLanding } from "@/types/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function LocalLanding({ page }: { page: SeoLanding }) {
  return (
    <main className="bg-[#fffaf4]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">SEO local</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">{page.h1}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">{page.intro}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {page.bullets.map((item) => (
            <div key={item} className="rounded-3xl border border-stone-200 bg-white p-5 text-sm leading-6 text-stone-700 shadow-sm">{item}</div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <ActionButton href="/ubicacion-ogijares">Cómo llegar</ActionButton>
          <ActionButton href="/carta" kind="secondary">Ver carta</ActionButton>
        </div>
      </div>
    </main>
  );
}
