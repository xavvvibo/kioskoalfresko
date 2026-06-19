export function BasicRecordForm({
  subjectLabel,
  options,
}: {
  subjectLabel: string;
  options: string[];
}) {
  return (
    <form className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Fecha
          <input type="date" name="date" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Hora
          <input type="time" name="time" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        {subjectLabel}
        <select name="subject" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Estado
        <select name="status" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
          <option>Correcto</option>
          <option>Revisar</option>
          <option>Incidencia</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Observaciones
        <textarea name="notes" rows={4} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Responsable
        <input name="responsible" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
      </label>
      <button
        type="button"
        className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-[#d94b2b] focus:ring-offset-2 focus:ring-offset-[#151515]"
      >
        Guardar
      </button>
    </form>
  );
}
