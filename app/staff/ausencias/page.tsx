import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listStaffAbsences } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { listLeaveBalancePeriods, listLeavePolicies, listLeaveRequests } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { calculateProjectedBalance } from "@/lib/admin-kiosko/staff/leave-rules";
import { staffCreateLeaveRequestAction } from "../actions";

export default async function StaffAbsencesPage() {
  const session = await requireAdminSession("/staff/ausencias");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const [absences, policies, periods, requests] = await Promise.all([
    listStaffAbsences(employee.data.id, true),
    listLeavePolicies(employee.data.organization_id || undefined, true),
    listLeaveBalancePeriods(employee.data.id),
    listLeaveRequests({ employeeId: employee.data.id }),
  ]);
  const policyById = new Map((policies.ok ? policies.data : []).map((policy) => [policy.id, policy]));
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Vacaciones y ausencias</h1>
        <section className="grid gap-3 md:grid-cols-3">
          {periods.ok && periods.data.length ? periods.data.map((period) => (
            <article key={period.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{policyById.get(period.policy_id)?.name || "Saldo"}</p>
              <p className="mt-1 text-sm text-stone-300">Reservado {period.reserved_amount} · Consumido {period.consumed_amount}</p>
              <p className="mt-2 text-3xl font-black">{calculateProjectedBalance({
                openingBalance: period.opening_balance,
                accrued: period.accrued_amount,
                consumed: period.consumed_amount,
                reserved: period.reserved_amount,
                adjusted: period.adjusted_amount,
                carriedOver: period.carried_over_amount,
                expired: period.expired_amount,
              })}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay saldos configurados.</p>}
        </section>
        <form action={staffCreateLeaveRequestAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-2">Nueva solicitud</h2>
          <select name="policyId" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
            <option value="">Política</option>
            {policies.ok ? policies.data.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>) : null}
          </select>
          <select name="partialMode" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
            <option value="full_day">Jornada completa</option>
            <option value="half_day">Media jornada</option>
            <option value="hours">Horas</option>
          </select>
          <input name="startsAt" type="datetime-local" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="endsAt" type="datetime-local" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="hours" type="number" step="0.25" min="0" placeholder="Horas si aplica" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="reason" placeholder="Motivo" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <textarea name="employeeNotes" placeholder="Observaciones" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
          <label className="text-sm font-bold text-stone-200"><input name="submit" type="checkbox" className="mr-2" defaultChecked /> Enviar a aprobación</label>
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-2">Crear solicitud</button>
        </form>
        <section className="grid gap-3">
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white">Mis solicitudes</h2>
          {requests.ok && requests.data.length ? requests.data.map((request) => (
            <article key={request.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{request.absence_type} · {request.status}</p>
              <p className="mt-1 text-sm text-stone-300">{new Date(request.starts_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} - {new Date(request.ends_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay solicitudes.</p>}
        </section>
        <section className="grid gap-3">
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white">Ausencias registradas</h2>
          {absences.ok && absences.data.length ? absences.data.map((absence) => (
            <article key={absence.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{absence.absence_type} · {absence.status}</p>
              <p className="mt-1 text-sm text-stone-300">{new Date(absence.starts_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} - {new Date(absence.ends_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay ausencias visibles.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
