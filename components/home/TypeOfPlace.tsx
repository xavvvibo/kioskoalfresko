export function TypeOfPlace() {
  const statements = [
    "No es un restaurante.",
    "No vienes con prisa.",
    "Vienes a echar el rato.",
    "Vienes a tomar algo.",
    "Y si os liáis, mejor.",
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[1.08fr_0.92fr] md:items-start">
      <div className="relative overflow-hidden rounded-[2.4rem] border border-stone-950 bg-stone-950 p-8 text-white md:p-10">
        <div className="absolute -right-8 top-0 h-28 w-28 rounded-full border border-white/20" />
        <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-[#d94b2b]" />
        <p className="relative z-10 text-sm font-black uppercase tracking-[0.18em] text-[#efb7a8]">Qué tipo de sitio es</p>
        <p className="relative z-10 mt-6 max-w-xl text-[2.4rem] font-black uppercase leading-[0.94] tracking-[-0.05em] md:text-[4.2rem]">Una terraza para quedar, pedir una ronda y dejar que el plan se alargue solo.</p>
      </div>
      <div className="grid gap-3 md:pt-6">
        {statements.map((item, index) => (
          <div key={item} className={`rounded-[1.7rem] border border-stone-950 px-5 py-5 text-[1.7rem] font-black uppercase leading-[0.95] tracking-[-0.04em] shadow-[0_12px_26px_rgba(0,0,0,0.04)] md:px-6 md:py-6 ${index % 2 === 0 ? "bg-white text-stone-950" : "bg-[#d94b2b] text-white"}`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
