export function WhyCome() {
  const items = [
    { title: "Porque se propone fácil", text: "No hay que venderlo mucho. Quedamos allí y ya." },
    { title: "Porque una lleva a otra", text: "Pides una ronda, cae algo de tapa y el rato cambia solo." },
    { title: "Porque el sitio invita", text: "Parque, aire libre y cero sensación de plan encorsetado." },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr_0.9fr] md:items-stretch">
      {items.map((item, index) => (
        <article key={item.title} className={`rounded-[1.9rem] border border-stone-950 p-6 md:p-7 ${index === 1 ? "bg-[#d94b2b] text-white shadow-[0_24px_50px_rgba(217,75,43,0.24)] md:-translate-y-4" : "bg-white text-stone-950 shadow-[0_12px_26px_rgba(0,0,0,0.04)]"}`}>
          <h3 className="text-[1.9rem] font-black uppercase leading-[0.92] tracking-[-0.05em] md:text-[2.3rem]">{item.title}</h3>
          <p className={`mt-5 text-sm leading-6 md:text-base ${index === 1 ? "text-white/88" : "text-stone-700"}`}>{item.text}</p>
        </article>
      ))}
    </div>
  );
}
