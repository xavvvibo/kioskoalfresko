import { serviceHours, specialOpeningHours } from "@/content/fiestas-2026";

export function FestivalHoursCard({
  compact = false,
  showServiceInfo = true,
}: {
  compact?: boolean;
  showServiceInfo?: boolean;
}) {
  return (
    <div className={`rounded-[1.75rem] border border-stone-950 bg-white text-stone-950 shadow-[0_18px_42px_rgba(0,0,0,0.08)] ${compact ? "p-4" : "p-5 md:p-6"}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d94b2b]">
        Nuestro horario estas fiestas
      </p>
      <div className="mt-4 grid gap-3">
        {specialOpeningHours.map((item) => (
          <article key={item.day} className="rounded-[1.25rem] border border-stone-950/10 bg-[#f8f1e7] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{item.day}</h3>
              <div className="grid gap-2 sm:min-w-44">
                {item.shifts.map((shift) => (
                  <p key={shift} className="rounded-full bg-stone-950 px-3 py-2 text-center text-sm font-black text-white">
                    {shift}
                  </p>
                ))}
              </div>
            </div>
            {showServiceInfo ? <p className="mt-3 text-sm font-semibold leading-6 text-stone-700">{item.service}</p> : null}
          </article>
        ))}
      </div>
      {showServiceInfo ? (
        <div className="mt-4 rounded-[1.25rem] border border-[#d94b2b]/25 bg-[#fff8ef] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">Servicio</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-stone-800">
            {serviceHours.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
