import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getAppccRecords, type AppccRecord } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = { title: "Calendario APPCC | Panel interno", description: "Vista mensual de registros APPCC." };

function getMadridMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function monthRange(year: number, month: number) {
  const days = new Date(year, month, 0).getDate();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
  return { days, start, end };
}

function dayStatus(records: AppccRecord[]) {
  if (records.some((record) => record.status === "incidencia")) return { label: "🔴 Incidencias", className: "border-red-300 bg-red-50 text-red-900" };
  if (!records.length || records.some((record) => record.status === "revisar")) return { label: "🟡 Pendiente", className: "border-amber-300 bg-amber-50 text-amber-950" };
  return { label: "🟢 Completo", className: "border-emerald-300 bg-emerald-50 text-emerald-950" };
}

function group(records: AppccRecord[], label: string) {
  return records.filter((record) => record.typeLabel === label);
}

export default async function CalendarioAppccPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string; day?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const current = getMadridMonth();
  const year = Number(params?.year) || current.year;
  const month = Number(params?.month) || current.month;
  const { days, start, end } = monthRange(year, month);
  const selectedDay = params?.day || start;
  const result = await getAppccRecords({ dateFrom: start, dateTo: end });
  const records = result.ok ? result.data : [];
  const selectedRecords = records.filter((record) => record.record_date === selectedDay);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Calendario APPCC" description="Vista mensual para revisión rápida durante inspecciones." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{month.toString().padStart(2, "0")} / {year}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: days }, (_, index) => {
                const day = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
                const dayRecords = records.filter((record) => record.record_date === day);
                const status = dayStatus(dayRecords);
                return (
                  <a key={day} href={`/admin-kiosko/calendario?year=${year}&month=${month}&day=${day}`} className={`rounded-2xl border p-3 ${status.className}`}>
                    <p className="text-2xl font-black">{index + 1}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em]">{status.label}</p>
                  </a>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{selectedDay}</h2>
            {["Temperaturas", "Limpieza", "Aceite freidora", "Recepción mercancía", "Incidencias"].map((label) => {
              const items = group(selectedRecords, label);
              return (
                <div key={label} className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</h3>
                  {items.length ? (
                    <div className="mt-3 grid gap-2">
                      {items.map((record) => (
                        <p key={`${record.type}-${record.id}`} className="text-sm text-stone-200">{record.subject} · {record.main} · {record.status || "sin estado"}</p>
                      ))}
                    </div>
                  ) : <p className="mt-3 text-sm text-stone-400">Sin registros.</p>}
                </div>
              );
            })}
          </section>
        </div>
      </section>
    </main>
  );
}
