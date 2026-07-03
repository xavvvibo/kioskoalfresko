import type { RecentAdminRecord } from "@/lib/admin-kiosko/database";

function groupRecordsByDate(records: RecentAdminRecord[]) {
  return records.reduce<Array<{ date: string; records: RecentAdminRecord[] }>>((groups, record) => {
    const existing = groups.find((group) => group.date === record.record_date);
    if (existing) {
      existing.records.push(record);
      return groups;
    }

    groups.push({ date: record.record_date, records: [record] });
    return groups;
  }, []);
}

function displayObservation(observations?: string | null) {
  if (!observations) return "";

  return observations
    .replaceAll("Origen histórico: APPCC_2026(2).xlsx / sistema anterior. ", "")
    .replaceAll("Origen histórico: APPCC_2026(2).xlsx / sistema anterior.", "")
    .replaceAll("APPCC_2026_import", "")
    .replaceAll("Sistema anterior APPCC", "")
    .replaceAll("sistema anterior", "")
    .replaceAll("Sistema anterior", "")
    .replaceAll("Importación histórica", "")
    .replaceAll("importación histórica", "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function RecentRecords({
  records,
  title = "Últimos 10 registros",
  intro,
  showResponsible = true,
}: {
  records: RecentAdminRecord[];
  title?: string;
  intro?: string;
  showResponsible?: boolean;
}) {
  const emptyText = title.toLowerCase().includes("incidencia")
    ? "No constan incidencias abiertas."
    : title.toLowerCase().includes("recepcion")
      ? "No constan recepciones registradas en el periodo reciente."
      : "No hay registros para este rango";
  const groups = groupRecordsByDate(records);

  return (
    <section className="mt-6 rounded-[1.7rem] border border-white/10 bg-[#101010] p-4">
      <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title}</h2>
      {intro ? <p className="mt-1 text-sm text-stone-300">{intro}</p> : null}
      {records.length ? (
        <div className="mt-4 grid gap-3">
          {groups.map((group) => (
            <div key={group.date} className="grid gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{group.date}</p>
              {group.records.map((record) => (
                <article key={record.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-black text-white">{record.main}</p>
                    <p className="text-xs font-semibold text-stone-300">
                      {record.record_time ? record.record_time.slice(0, 5) : "Jornada"}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
                    {showResponsible ? (
                      <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-stone-200">
                        {record.responsible || "Responsable no consignado"}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[#d94b2b]/30 bg-[#d94b2b]/10 px-3 py-1 text-[#f2c6bb]">
                      {record.status || "Registro disponible"}
                    </span>
                  </div>
                  {displayObservation(record.observations) ? (
                    <p className="mt-3 text-sm leading-6 text-stone-300">{displayObservation(record.observations)}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stone-300">{emptyText}</p>
      )}
    </section>
  );
}
