import { festivalProgramme } from "@/content/fiestas-2026";

export function FestivalProgramme() {
  return (
    <div className="grid gap-5">
      {festivalProgramme.map((day) => (
        <article key={day.date} className="rounded-[1.75rem] border border-stone-950 bg-white p-5 shadow-[0_14px_34px_rgba(0,0,0,0.05)] md:p-6">
          <div className="flex flex-col gap-2 border-b border-stone-950/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-2xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-3xl">{day.date}</h3>
            <span className="w-fit rounded-full bg-[#d94b2b] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white">
              {day.shortDate}
            </span>
          </div>
          <ol className="mt-5 divide-y divide-stone-950/10">
            {day.events.map((event) => (
              <li key={`${day.date}-${event.time}-${event.name}`} className="grid gap-2 py-3 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                <time className="text-sm font-black tabular-nums text-[#d94b2b]">{event.time}</time>
                <div>
                  <p className="text-base font-black leading-6 text-stone-950">{event.name}</p>
                  {event.location ? <p className="mt-1 text-sm font-semibold leading-5 text-stone-600">{event.location}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}
