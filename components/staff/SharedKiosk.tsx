import type { StaffEmployee, StaffWorkEntry, StaffBreakEntry } from "@/lib/admin-kiosko/repositories/staff.repository";
import { ClockActionButton } from "./ClockActionButton";

export function SharedKioskLogin({
  employees,
  action,
}: {
  employees: StaffEmployee[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="mx-auto grid max-w-xl gap-4 rounded-[1.8rem] border border-white/10 bg-[#151515] p-5">
      <h1 className="text-4xl font-black uppercase tracking-[-0.05em] text-white">Kiosko de fichaje</h1>
      <select name="employeeId" required className="rounded-2xl border border-white/10 bg-white px-4 py-4 text-lg text-stone-950">
        <option value="">Selecciona empleado</option>
        {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}</option>)}
      </select>
      <input name="pin" type="password" inputMode="numeric" autoComplete="one-time-code" placeholder="PIN" required className="rounded-2xl border border-white/10 bg-white px-4 py-4 text-lg text-stone-950" />
      <button className="min-h-16 rounded-2xl border border-[#d94b2b] bg-[#d94b2b] px-5 py-4 text-base font-black uppercase tracking-[0.12em] text-white">Entrar</button>
    </form>
  );
}

export function SharedKioskClockPanel({
  employee,
  openEntry,
  openBreak,
  action,
}: {
  employee: StaffEmployee;
  openEntry: StaffWorkEntry | null;
  openBreak: StaffBreakEntry | null;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="mx-auto grid max-w-xl gap-4 rounded-[1.8rem] border border-white/10 bg-[#151515] p-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Sesión temporal</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em] text-white">{employee.display_name}</h1>
      </div>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="employeeId" value={employee.id} />
        <ClockActionButton name="intent" value="clock_in" disabled={Boolean(openEntry)}>Fichar entrada</ClockActionButton>
        <ClockActionButton name="intent" value="start_break" variant="secondary" disabled={!openEntry || Boolean(openBreak)}>Iniciar pausa</ClockActionButton>
        <ClockActionButton name="intent" value="end_break" variant="secondary" disabled={!openBreak}>Finalizar pausa</ClockActionButton>
        <ClockActionButton name="intent" value="clock_out" variant="danger" disabled={!openEntry || Boolean(openBreak)}>Fichar salida</ClockActionButton>
      </form>
      <p className="text-center text-sm text-stone-300">La sesión se cierra automáticamente tras cada operación.</p>
    </section>
  );
}
