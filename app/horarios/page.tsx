import { maySalesFocus, maySchedule, maySpecialEvents, seasonalSchedule, siteConfig } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Horarios de Kiosko Alfresko | Ogíjares",
  description: "Consulta el horario de mayo, los eventos especiales del finde y los horarios estacionales de Kiosko Alfresko.",
  path: "/horarios",
});

export default function HorariosPage() {
  return (
    <main className="bg-[#f5efe5]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Horarios</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-5xl">Horario actual</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">{maySchedule.normalSummary}</p>
        <div className="mt-8 rounded-[2rem] border border-stone-950 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d94b2b]">🔥 Hoy abierto</p>
          <p className="mt-2 text-sm font-semibold text-stone-700">👉 Consulta abajo horarios especiales</p>
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">{siteConfig.schedule.currentSummary}</h2>
          <p className="mt-4 text-lg font-black uppercase tracking-[-0.03em] text-stone-950">{maySchedule.normalHours}</p>
          <p className="mt-4 inline-flex rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            {maySchedule.weekendNotice}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {maySalesFocus.microcopy.map((item) => (
              <span key={item} className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-700">{siteConfig.schedule.note}</p>
          <p className="mt-4 text-sm font-semibold text-stone-700">Consulta aquí antes de venir.</p>
          <div className="mt-6">
            <ActionButton href={siteConfig.location.mapsUrl} newTab>📍 Llegar ahora</ActionButton>
          </div>
        </div>
        <div className="mt-8 rounded-[2rem] border border-stone-950 bg-stone-950 p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f2c6bb]">Horarios especiales</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {maySpecialEvents.map((item) => (
              <article key={item.date} className="rounded-[1.6rem] border border-white/12 bg-white/6 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">{item.date}</p>
                <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{item.title}</h2>
                <p className="mt-4 text-lg font-black uppercase tracking-[-0.03em] text-white">{item.hours}</p>
                {item.note ? <p className="mt-3 text-sm leading-6 text-stone-300">{item.note}</p> : null}
              </article>
            ))}
          </div>
        </div>
        <div className="mt-8 rounded-[2rem] border border-stone-950/12 bg-stone-100 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Próximamente</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {seasonalSchedule
              .filter((item) => item.month !== "Mayo" && item.month !== "Abril")
              .map((item) => (
                <article key={item.month} className="rounded-[1.7rem] border border-stone-950/10 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{item.month}</h2>
                  <p className="mt-3 text-sm leading-6 text-stone-700">Próximamente.</p>
                </article>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
