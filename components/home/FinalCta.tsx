import { ActionButton } from "@/components/ui/ActionButton";

export function FinalCta() {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-950 bg-stone-950 px-6 py-12 text-white shadow-[0_32px_90px_rgba(0,0,0,0.24)] md:px-10 md:py-14">
      <div className="absolute -left-10 bottom-8 h-28 w-28 rounded-full border border-white/12" />
      <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-[2.5rem] bg-[#d94b2b]" />
      <div className="mx-auto max-w-4xl text-center">
        <p className="relative z-10 text-xs font-black uppercase tracking-[0.28em] text-[#f2c6bb]">Temporada abierta</p>
        <h2 className="relative z-10 mt-5 text-[3rem] font-black uppercase leading-[0.88] tracking-[-0.06em] md:text-[5.6rem]">Si os apetece terraceo, ya está abierto.</h2>
        <p className="relative z-10 mt-5 text-lg font-semibold text-stone-300 md:text-xl">Desde el 25 de abril.</p>
        <div className="relative z-10 mt-9 flex flex-wrap justify-center gap-3">
          <ActionButton href="/ubicacion-ogijares">Cómo llegar</ActionButton>
          <ActionButton href="/horarios" kind="secondary">Ver horarios</ActionButton>
        </div>
        <p className="relative z-10 mt-6 text-sm font-semibold text-stone-300">Perfecto para una ronda, unas tapas y echar el rato.</p>
      </div>
    </div>
  );
}
