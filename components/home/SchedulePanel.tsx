import { seasonalSchedule, siteConfig } from "@/content/site";
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
          <h3 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.04em] text-stone-950 md:text-5xl">{siteConfig.schedule.currentSummary}</h3>
          <p className="mt-5 text-lg font-black uppercase tracking-[-0.03em] text-stone-950">Mayo · Sábados y domingos · 12:00 a 18:00</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">{siteConfig.schedule.note}</p>
          <p className="mt-4 text-sm font-semibold text-stone-700">Consulta aquí antes de venir.</p>
        </div>
        <ActionButton href="/horarios" kind="secondary">Ver horarios</ActionButton>
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
