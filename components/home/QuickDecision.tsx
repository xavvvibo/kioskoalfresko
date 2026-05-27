export function QuickDecision() {
  const items = [
    ["El plan", "Noches de terraza y sobremesa larga."],
    ["Dónde estamos", "Parque San Sebastián. Ogíjares."],
    ["Qué hay", "Tapas, cerveza fría y smash burgers."],
    ["Lo básico", "Reserva, carta e Instagram."],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map(([title, body]) => (
        <article key={title} className="rounded-[1.75rem] border border-stone-950/90 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#d94b2b]">{title}</h3>
          <p className="mt-4 text-xl font-semibold leading-tight tracking-[-0.02em] text-stone-950">{body}</p>
        </article>
      ))}
    </div>
  );
}
