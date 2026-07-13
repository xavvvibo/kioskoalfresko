import type { StaffWorkEntry, StaffBreakEntry } from "@/lib/admin-kiosko/repositories/staff.repository";
import { isOpenClockEntry } from "@/lib/admin-kiosko/staff/time";
import { ClockActionButton } from "./ClockActionButton";

export function CurrentWorkEntryStatus({
  openEntry,
  openBreak,
}: {
  openEntry: StaffWorkEntry | null;
  openBreak: StaffBreakEntry | null;
}) {
  const hasOpenEntry = isOpenClockEntry(openEntry);
  const label = !hasOpenEntry
    ? "Sin fichaje abierto"
    : openBreak
      ? "En pausa"
      : "Trabajando";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Estado actual</p>
      <p className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-white">{label}</p>
      {hasOpenEntry && openEntry ? <p className="mt-2 text-sm text-stone-300">Entrada: {new Date(openEntry.clock_in_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</p> : null}
      {openBreak ? <p className="mt-1 text-sm text-amber-100">Pausa iniciada: {new Date(openBreak.started_at).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}</p> : null}
    </div>
  );
}

export function EmployeeClockCard({
  openEntry,
  openBreak,
  action,
}: {
  openEntry: StaffWorkEntry | null;
  openBreak: StaffBreakEntry | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const hasOpenEntry = isOpenClockEntry(openEntry);
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-4 sm:p-5">
      <CurrentWorkEntryStatus openEntry={openEntry} openBreak={openBreak} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <ClockActionButton name="intent" value="clock_in" disabled={hasOpenEntry}>
          Fichar entrada
        </ClockActionButton>
        <ClockActionButton name="intent" value="start_break" variant="secondary" disabled={!hasOpenEntry || Boolean(openBreak)}>
          Iniciar pausa
        </ClockActionButton>
        <ClockActionButton name="intent" value="end_break" variant="secondary" disabled={!openBreak}>
          Finalizar pausa
        </ClockActionButton>
        <ClockActionButton name="intent" value="clock_out" variant="danger" disabled={!hasOpenEntry || Boolean(openBreak)}>
          Fichar salida
        </ClockActionButton>
      </form>
    </section>
  );
}
