export function TextField({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-200">
      {label}
      <input required={required} type={type} name={name} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
    </label>
  );
}

export function TextAreaField({ name, label, rows = 4 }: { name: string; label: string; rows?: number }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-200">
      {label}
      <textarea name={name} rows={rows} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
    </label>
  );
}

export function SelectField({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-200">
      {label}
      <select name={name} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function CheckField({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
      <input name={name} type="checkbox" className="h-5 w-5 accent-[#d94b2b]" />
      {label}
    </label>
  );
}

export function SubmitButton({ label = "Guardar" }: { label?: string }) {
  return (
    <button type="submit" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950">
      {label}
    </button>
  );
}
