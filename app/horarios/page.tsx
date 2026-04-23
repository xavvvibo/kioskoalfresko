import { seasonalSchedule, siteConfig } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Horarios de Kiosko Alfresko | Ogíjares",
  description: "Consulta la reapertura del 25 de abril y los horarios estacionales de Kiosko Alfresko.",
  path: "/horarios",
});

export default function HorariosPage() {
  return (
    <main className="bg-[#f5efe5]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Horarios</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-5xl">Horario actual</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">Abrimos desde el 25 de abril.</p>
        <div className="mt-8 rounded-[2rem] border border-stone-950 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">{siteConfig.schedule.currentSummary}</h2>
          <p className="mt-4 text-lg font-black uppercase tracking-[-0.03em] text-stone-950">Mayo · Sábados y domingos · 12:00 a 18:00</p>
          <p className="mt-3 text-sm leading-6 text-stone-700">{siteConfig.schedule.note}</p>
          <p className="mt-4 text-sm font-semibold text-stone-700">Consulta aquí antes de venir.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {seasonalSchedule.map((item) => (
            <article key={item.month} className="rounded-[1.7rem] border border-stone-950 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{item.month}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">{item.summary}</p>
              {item.note ? <p className="mt-3 text-sm leading-6 text-stone-600">{item.note}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
