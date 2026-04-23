export function QuickDecision() {
  const items = [
    ["Qué plan es", "Pides una. Y te quedas."],
    ["Dónde está", "Parque San Sebastián. Ogíjares."],
    ["Qué pasa aquí", "Bebida, tapas y rato largo."],
    ["Qué miras ahora", "Carta, horario y cómo llegar."],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map(([title, body]) => (
        <article key={title} className="rounded-[1.75rem] border border-stone-950 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#d94b2b]">{title}</h3>
          <p className="mt-4 text-2xl font-black uppercase leading-tight tracking-[-0.03em] text-stone-950">{body}</p>
        </article>
      ))}
    </div>
  );
}
