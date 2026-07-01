import type { Metadata } from "next";
import { requireOwnerRole } from "@/lib/admin-kiosko/roles";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Calendario operativo | Panel interno",
  description: "Configuración visual de días abiertos, descanso, cierres y eventos.",
};

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function statusFor(day: number, weekday: number) {
  if (weekday === 1 || weekday === 2) return "descanso";
  if ((weekday === 0 && [14, 21, 28].includes(day)) || (weekday === 6 && day === 20)) return "cerrado";
  return "abierto";
}

export default async function CalendarioOperativoPage() {
  await requireOwnerRole();
  const { year, month } = currentMonth();
  const days = new Date(year, month, 0).getDate();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Calendario operativo" description="Planificación visual de aperturas, descansos, cierres y eventos especiales." role="owner" />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Reglas activas</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Lunes y martes", "Descanso"],
                ["Domingos 14, 21, 28", "Cerrado"],
                ["Sábado 20", "Cerrado"],
                ["Resto de días", "Abierto con controles APPCC"],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-lg font-black text-white">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Vista preparada</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: days }, (_, index) => {
                const day = index + 1;
                const weekday = new Date(year, month - 1, day).getDay();
                const status = statusFor(day, weekday);
                const className = status === "descanso"
                  ? "border-stone-400 bg-stone-200 text-stone-900"
                  : status === "cerrado"
                    ? "border-white bg-white text-stone-900"
                    : "border-emerald-300 bg-emerald-100 text-emerald-950";
                return (
                  <article key={day} className={`rounded-2xl border p-4 ${className}`}>
                    <p className="text-2xl font-black">{day}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em]">{status}</p>
                  </article>
                );
              })}
            </div>
            <p className="mt-5 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
              Persistencia preparada para una fase posterior. El calendario APPCC sigue usando estas reglas actuales.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
