import { reopeningCampaign } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function ReopeningPanel() {
  return (
    <div className="grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
      <div className="relative overflow-hidden rounded-[2.3rem] border border-stone-950 bg-stone-950 p-8 text-white shadow-[0_24px_60px_rgba(0,0,0,0.18)] md:p-10">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[2.3rem] bg-[#d94b2b]" />
        <p className="relative z-10 text-xs font-black uppercase tracking-[0.24em] text-[#f0b7a8]">Reapertura</p>
        <h3 className="relative z-10 mt-5 text-[2.8rem] font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-[4.6rem]">
          {reopeningCampaign.title}
        </h3>
        <p className="relative z-10 mt-5 max-w-xl text-xl font-black uppercase leading-tight tracking-[-0.03em] text-stone-100 md:text-2xl">
          {reopeningCampaign.subtitle}
        </p>
        <p className="relative z-10 mt-4 max-w-xl text-base leading-7 text-stone-200">
          {reopeningCampaign.note}
        </p>
        <div className="relative z-10 mt-7 flex flex-wrap gap-3">
          <ActionButton href="/ubicacion-ogijares">Cómo llegar</ActionButton>
          <ActionButton href="/horarios" kind="secondary">Ver horarios</ActionButton>
        </div>
        <p className="relative z-10 mt-5 text-sm font-semibold text-stone-300">{reopeningCampaign.microcopy}</p>
      </div>
      <div className="grid gap-4">
        <article className="rounded-[1.9rem] border border-stone-950 bg-white p-6 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d94b2b]">Horario</p>
          <p className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.05em] text-stone-950">11:00–14:00</p>
          <p className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.05em] text-stone-950">17:00–20:00</p>
          <p className="mt-4 text-sm leading-6 text-stone-700">Coincide con la Feria de la Cultura y del Ocio de Ogíjares.</p>
        </article>
        <article className="rounded-[1.9rem] border border-stone-950 bg-[#d94b2b] p-6 text-white shadow-[0_18px_34px_rgba(217,75,43,0.24)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">Mensaje</p>
          <p className="mt-4 text-[2rem] font-black uppercase leading-[0.94] tracking-[-0.04em]">Abrimos y el plan ya está montado.</p>
        </article>
      </div>
    </div>
  );
}
