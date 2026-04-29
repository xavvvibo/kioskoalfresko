import { maySalesFocus, maySchedule, maySpecialEvents, seasonalSchedule, siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

const statusClasses = {
  confirmed: "bg-[#d94b2b] text-white",
  pending: "bg-stone-200 text-stone-700",
  special: "bg-amber-200 text-amber-950",
};

export function SchedulePanel() {
  return (
    <div className="rounded-[2rem] border border-stone-950 bg-white p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">{siteConfig.schedule.currentLabel}</p>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[#d94b2b]">🔥 Hoy abierto</p>
          <p className="mt-2 text-sm font-semibold text-stone-700">👉 Consulta abajo horarios especiales</p>
          <h3 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.04em] text-stone-950 md:text-5xl">{siteConfig.schedule.currentSummary}</h3>
          <p className="mt-5 text-lg font-black uppercase tracking-[-0.03em] text-stone-950">{maySchedule.normalHours}</p>
          <p className="mt-4 inline-flex rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            {maySchedule.weekendNotice}
          </p>
          <p className="mt-4 text-sm font-semibold text-stone-800">Este finde abrimos hasta las 23:00 por Cruces y Día de la Bicicleta.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {maySalesFocus.microcopy.map((item) => (
              <span key={item} className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">{siteConfig.schedule.note}</p>
          <p className="mt-4 text-sm font-semibold text-stone-700">Consulta aquí antes de venir.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton href="/horarios" kind="secondary">Ver horarios</ActionButton>
          <ActionButton href={siteConfig.location.mapsUrl} newTab>📍 Llegar ahora</ActionButton>
        </div>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {maySpecialEvents.map((item) => (
          <article key={item.date} className="rounded-[1.5rem] border border-stone-950 bg-[#f8f1e7] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">{item.date}</p>
            <h4 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">{item.title}</h4>
            <p className="mt-4 text-lg font-black uppercase tracking-[-0.03em] text-stone-950">{item.hours}</p>
            {item.note ? <p className="mt-3 text-sm leading-6 text-stone-700">{item.note}</p> : null}
          </article>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {seasonalSchedule.map((item) => (
          <article key={item.month} className="rounded-[1.5rem] border border-stone-950 bg-stone-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{item.month}</h4>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${statusClasses[item.status]}`}>
                {item.status === "confirmed" ? "Confirmado" : item.status === "special" ? "Especial" : "Pendiente"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-800">{item.summary}</p>
            {item.note ? <p className="mt-3 text-sm leading-6 text-stone-600">{item.note}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
