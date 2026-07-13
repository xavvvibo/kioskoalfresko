import type { StaffEmployee, StaffShift } from "@/lib/admin-kiosko/repositories/staff.repository";
import type { ShiftChangeRequestRecord } from "@/lib/admin-kiosko/repositories/staff-shift-change.repository";

export function ShiftChangeCard({
  requests,
  employees,
  shifts,
  action,
  admin = false,
}: {
  requests: ShiftChangeRequestRecord[];
  employees: StaffEmployee[];
  shifts: StaffShift[];
  action?: (formData: FormData) => Promise<void>;
  admin?: boolean;
}) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee.display_name]));
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  return (
    <section className="grid gap-3">
      {requests.length ? requests.map((request) => {
        const shift = shiftById.get(request.original_shift_id);
        return (
          <article key={request.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{request.request_type} · {request.status}</p>
            <p className="mt-1 text-sm text-stone-300">{employeeById.get(request.requester_employee_id) || request.requester_employee_id} · {shift ? new Date(shift.starts_at).toLocaleString("es-ES") : request.original_shift_id}</p>
            <p className="mt-2 text-sm text-stone-300">{request.reason}</p>
            {admin && action ? (
              <form action={action} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <input name="resolution" required placeholder="Comentario" className="min-w-52 rounded-2xl border border-white/10 bg-white px-4 py-2 text-sm text-stone-950" />
                <button name="decision" value="approve" className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black uppercase text-stone-950">Aprobar</button>
                <button name="decision" value="reject" className="rounded-full bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase text-white">Rechazar</button>
              </form>
            ) : null}
          </article>
        );
      }) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay solicitudes de cambio.</p>}
    </section>
  );
}

export function ShiftChangeForm({ shifts, employees, action }: { shifts: StaffShift[]; employees: StaffEmployee[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-3 rounded-[1.4rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-3">
      <input type="hidden" name="intent" value="shift_change" />
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-3">Solicitar cambio</h2>
      <select name="originalShiftId" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
        {shifts.map((shift) => <option key={shift.id} value={shift.id}>{new Date(shift.starts_at).toLocaleString("es-ES")} - {new Date(shift.ends_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</option>)}
      </select>
      <select name="requestType" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
        {["give_away", "swap", "release", "change_time", "change_location", "request_cover"].map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select name="proposedEmployeeId" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950"><option value="">Sin candidato</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}</option>)}</select>
      <input name="deadlineAt" type="datetime-local" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <input name="reason" required placeholder="Motivo" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
      <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-3">Enviar solicitud</button>
    </form>
  );
}
