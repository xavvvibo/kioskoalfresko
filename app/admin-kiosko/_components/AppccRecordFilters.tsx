import type { AppccRecordListFilters } from "@/lib/admin-kiosko/appcc-record-filters";

type FilterOption = {
  label: string;
  value: string;
};

const datePresets: FilterOption[] = [
  { label: "7 días", value: "7d" },
  { label: "Último mes", value: "month" },
  { label: "Mes actual", value: "current_month" },
  { label: "Mes anterior", value: "previous_month" },
  { label: "Todo", value: "all" },
  { label: "Rango", value: "custom" },
];

export function AppccRecordFilters({
  filters,
  subjectLabel,
  subjectOptions,
  statusOptions,
  foundCount,
}: {
  filters: AppccRecordListFilters;
  subjectLabel: string;
  subjectOptions: FilterOption[];
  statusOptions: FilterOption[];
  foundCount: number;
}) {
  return (
    <section className="mt-6 rounded-[1.7rem] border border-white/10 bg-[#101010] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Filtrar registros</h2>
          <p className="mt-1 text-sm text-stone-300">{foundCount} registros encontrados</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {datePresets.map((preset) => {
          const active = filters.preset === preset.value;
          return (
            <a
              key={preset.value}
              href={`?period=${preset.value}`}
              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${active ? "border-[#d94b2b] bg-[#d94b2b] text-white" : "border-white/12 bg-white/6 text-stone-200"}`}
            >
              {preset.label}
            </a>
          );
        })}
      </div>

      <form className="mt-4 grid gap-3 md:grid-cols-4">
        <input type="hidden" name="period" value="custom" />
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#f2c6bb]">
          Desde
          <input name="dateFrom" type="date" defaultValue={filters.dateFrom || ""} className="rounded-2xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#f2c6bb]">
          Hasta
          <input name="dateTo" type="date" defaultValue={filters.dateTo || ""} className="rounded-2xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#f2c6bb]">
          {subjectLabel}
          <select name="subject" defaultValue={filters.subject || ""} className="rounded-2xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
            <option value="">Todos</option>
            {subjectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#f2c6bb]">
          Estado
          <select name="status" defaultValue={filters.status || ""} className="rounded-2xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
            <option value="">Todos</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="md:col-span-4 flex flex-wrap gap-2">
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white" type="submit">Aplicar filtros</button>
          <a href="?period=all" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Limpiar</a>
        </div>
      </form>
    </section>
  );
}
