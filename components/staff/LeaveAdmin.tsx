import type { StaffEmployee, StaffLocation } from "@/lib/admin-kiosko/repositories/staff.repository";
import type { LeaveBalancePeriod, LeavePolicy, LeaveRequest, PeriodLock, PayrollVariable, ShiftAbsenceImpact } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { calculateProjectedBalance } from "@/lib/admin-kiosko/staff/leave-rules";

export function LeaveRequestBoard({
  requests,
  employees,
  impacts,
  action,
}: {
  requests: LeaveRequest[];
  employees: StaffEmployee[];
  impacts: ShiftAbsenceImpact[];
  action: (formData: FormData) => Promise<void>;
}) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const impactCount = new Map<string, number>();
  for (const impact of impacts) impactCount.set(impact.request_id, (impactCount.get(impact.request_id) || 0) + 1);
  return (
    <section className="grid gap-3">
      {requests.length ? requests.map((request) => (
        <form key={request.id} action={action} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <input type="hidden" name="requestId" value={request.id} />
          <p className="font-black text-white">{employeeById.get(request.employee_id)?.display_name || request.employee_id} · {request.absence_type} · {request.status}</p>
          <p className="mt-1 text-sm text-stone-300">{new Date(request.starts_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} - {new Date(request.ends_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {request.requested_amount} {request.requested_unit}</p>
          <p className="mt-1 text-xs font-bold text-[#f2c6bb]">Conflictos: {request.conflict_summary.length} · Turnos afectados: {impactCount.get(request.id) || 0}</p>
          <textarea name="comment" required placeholder="Comentario de resolución" className="mt-3 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button name="decision" value="approve" className="rounded-full border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-950">Aprobar</button>
            <button name="decision" value="partially_approve" className="rounded-full border border-amber-300 bg-amber-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-950">Parcial</button>
            <button name="decision" value="reject" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Rechazar</button>
            <button name="decision" value="request_documentation" className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Pedir doc.</button>
          </div>
        </form>
      )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay solicitudes.</p>}
    </section>
  );
}

export function LeaveBalanceCards({ periods, policies, employees }: { periods: LeaveBalancePeriod[]; policies: LeavePolicy[]; employees: StaffEmployee[] }) {
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {periods.map((period) => (
        <article key={period.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <p className="font-black text-white">{employeeById.get(period.employee_id)?.display_name || period.employee_id}</p>
          <p className="mt-1 text-sm text-stone-300">{policyById.get(period.policy_id)?.name || period.policy_id} · {period.period_label} · {period.status}</p>
          <p className="mt-3 text-3xl font-black text-white">{calculateProjectedBalance({
            openingBalance: period.opening_balance,
            accrued: period.accrued_amount,
            consumed: period.consumed_amount,
            reserved: period.reserved_amount,
            adjusted: period.adjusted_amount,
            carriedOver: period.carried_over_amount,
            expired: period.expired_amount,
          })}</p>
          <p className="text-xs font-bold text-stone-400">Reservado {period.reserved_amount} · Consumido {period.consumed_amount}</p>
        </article>
      ))}
    </section>
  );
}

export function LeavePolicyForm({ locations, action }: { locations: StaffLocation[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-3">
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-3">Nueva política</h2>
      <input name="name" required placeholder="Nombre" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <select name="absenceType" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{["vacation", "paid_leave", "unpaid_leave", "personal_leave", "sick_leave", "work_accident", "parental_leave", "unjustified_absence", "other"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select name="unit" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{["natural_days", "working_days", "hours"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select name="accrualMethod" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{["annual", "monthly", "proportional", "manual"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <input name="annualAmount" type="number" step="0.01" min="0" placeholder="Cantidad anual" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <input name="cycleStartsOn" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <select name="locationId" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950"><option value="">Toda la organización</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
      <input name="maxCarryover" type="number" step="0.01" min="0" placeholder="Arrastre máximo" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <input name="negativeLimit" type="number" step="0.01" min="0" placeholder="Límite negativo" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <label className="text-sm font-bold text-stone-200"><input name="carryoverEnabled" type="checkbox" className="mr-2" /> Arrastre</label>
      <label className="text-sm font-bold text-stone-200"><input name="negativeBalanceAllowed" type="checkbox" className="mr-2" /> Saldo negativo</label>
      <label className="text-sm font-bold text-stone-200"><input name="requiresDocument" type="checkbox" className="mr-2" /> Justificante</label>
      <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-3">Crear política</button>
    </form>
  );
}

export function PeriodLockForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-3">
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-3">Bloquear periodo</h2>
      <select name="periodType" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{["work_entries", "absences", "balances", "payroll_variables"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select name="status" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{["soft_locked", "hard_locked", "closed"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <input name="startsOn" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <input name="endsOn" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <input name="reason" required placeholder="Motivo" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
      <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-3">Crear bloqueo</button>
    </form>
  );
}

export function PeriodLockList({ locks }: { locks: PeriodLock[] }) {
  return <section className="grid gap-3">{locks.map((lock) => <article key={lock.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{lock.period_type} · {lock.status}</p><p className="mt-1 text-sm text-stone-300">{lock.starts_on} - {lock.ends_on} · {lock.reason || "sin motivo"}</p></article>)}</section>;
}

export function PayrollVariableList({ variables, employees }: { variables: PayrollVariable[]; employees: StaffEmployee[] }) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee.display_name]));
  return <section className="grid gap-3">{variables.map((variable) => <article key={variable.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{employeeById.get(variable.employee_id) || variable.employee_id} · {variable.concept}</p><p className="mt-1 text-sm text-stone-300">{variable.quantity} {variable.unit} · {variable.status} · {variable.period_start} - {variable.period_end}</p></article>)}</section>;
}
