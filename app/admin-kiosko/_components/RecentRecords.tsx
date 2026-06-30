import type { RecentAdminRecord } from "@/lib/admin-kiosko/database";

export function RecentRecords({ records, title = "Últimos 10 registros" }: { records: RecentAdminRecord[]; title?: string }) {
  const emptyText = title.toLowerCase().includes("incidencia")
    ? "No constan incidencias abiertas."
    : title.toLowerCase().includes("recepcion")
      ? "No constan recepciones registradas en el periodo reciente."
      : "Último registro no disponible todavía.";

  return (
    <section className="mt-6 rounded-[1.7rem] border border-white/10 bg-[#101010] p-4">
      <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title}</h2>
      {records.length ? (
        <div className="mt-4 grid gap-3">
          {records.map((record) => (
            <article key={record.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-white">{record.main}</p>
                <p className="text-xs font-semibold text-stone-300">
                  {record.record_date}{record.record_time ? ` · ${record.record_time.slice(0, 5)}` : ""}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-stone-200">
                  {record.responsible || "Responsable no consignado"}
                </span>
                <span className="rounded-full border border-[#d94b2b]/30 bg-[#d94b2b]/10 px-3 py-1 text-[#f2c6bb]">
                  {record.status || "Registro disponible"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stone-300">{emptyText}</p>
      )}
    </section>
  );
}
