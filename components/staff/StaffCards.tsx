import type {
  StaffAuditLog,
  StaffEmployee,
  StaffLocation,
  StaffShift,
  StaffTimeIncident,
  StaffWorkEntry,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import { calculatePlannedMinutes, calculateWeeklyVariance, isOpenClockEntry, shiftDurationMinutes } from "@/lib/admin-kiosko/staff/time";

function formatDateTime(value: string | null) {
  if (!value) return "Pendiente";
  return new Date(value).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TodayShiftCard({ shift }: { shift: StaffShift | null }) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Turno de hoy</p>
      {shift ? (
        <>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em]">{formatTime(shift.starts_at)} - {formatTime(shift.ends_at)}</h2>
          <p className="mt-2 text-sm font-bold text-stone-700">{shift.status === "published" ? "Publicado" : "No publicado"} · {shift.notes || "Sin notas"}</p>
        </>
      ) : (
        <p className="mt-3 text-lg font-bold text-stone-700">No hay turno publicado para hoy.</p>
      )}
    </section>
  );
}

export function UpcomingShiftsList({ shifts }: { shifts: StaffShift[] }) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Próximas jornadas</p>
      <div className="mt-4 grid gap-3">
        {shifts.length ? shifts.slice(0, 7).map((shift) => (
          <div key={shift.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-black text-white">{new Date(shift.starts_at).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "2-digit", month: "2-digit" })}</p>
            <p className="mt-1 text-sm text-stone-300">{formatTime(shift.starts_at)} - {formatTime(shift.ends_at)} · {shiftDurationMinutes(shift)} min</p>
          </div>
        )) : <p className="text-sm text-stone-300">No hay turnos publicados.</p>}
      </div>
    </section>
  );
}

export function WeeklyHoursSummary({ shifts, entries, contractedMinutes }: { shifts: StaffShift[]; entries: StaffWorkEntry[]; contractedMinutes?: number | null }) {
  const plannedMinutes = calculatePlannedMinutes(shifts);
  const workedMinutes = Math.round(entries.reduce((total, entry) => total + (entry.worked_seconds || 0), 0) / 60);
  const variance = calculateWeeklyVariance({ plannedMinutes, workedMinutes, contractedMinutes });

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {[
        ["Planificado", `${plannedMinutes} min`],
        ["Trabajado", `${workedMinutes} min`],
        ["Diferencia", `${variance.plannedVsWorkedMinutes} min`],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
      ))}
    </section>
  );
}

export function AttendanceStatusBoard({
  employees,
  entries,
}: {
  employees: StaffEmployee[];
  entries: StaffWorkEntry[];
}) {
  const openByEmployee = new Set(entries.filter(isOpenClockEntry).map((entry) => entry.employee_id));
  const completedToday = new Set(entries.filter((entry) => entry.clock_out_at).map((entry) => entry.employee_id));

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Estado de fichajes hoy</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {employees.map((employee) => {
          const status = openByEmployee.has(employee.id) ? "Trabajando" : completedToday.has(employee.id) ? "Salida registrada" : "Sin fichaje";
          return (
            <div key={employee.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-black text-white">{employee.display_name}</p>
              <p className="mt-1 text-sm text-stone-300">{employee.employee_code} · {status}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ShiftPlanner({
  shifts,
  employees,
  locations,
  action,
  publishAction,
  duplicateAction,
}: {
  shifts: StaffShift[];
  employees: StaffEmployee[];
  locations: StaffLocation[];
  action: (formData: FormData) => Promise<void>;
  publishAction: (formData: FormData) => Promise<void>;
  duplicateAction: (formData: FormData) => Promise<void>;
}) {
  const draftIds = shifts.filter((shift) => shift.status === "draft").map((shift) => shift.id);

  return (
    <div className="grid gap-5">
      <form action={action} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-2">Crear turno</h2>
        <select name="employeeId" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          <option value="">Empleado</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}</option>)}
        </select>
        <select name="locationId" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          <option value="">Centro</option>
          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        <input name="shiftDate" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="startsAt" type="time" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="endsAt" type="time" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="roleName" placeholder="Rol en turno" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <textarea name="notes" placeholder="Notas" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-2">Crear borrador</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <form action={publishAction} className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
          {draftIds.map((id) => <input key={id} type="hidden" name="shiftId" value={id} />)}
          <p className="text-sm text-stone-300">{draftIds.length} turnos en borrador listos para publicar.</p>
          <button disabled={!draftIds.length} className="mt-4 rounded-full border border-emerald-400 bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-stone-950 disabled:opacity-40">Publicar borradores</button>
        </form>
        <form action={duplicateAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
          <p className="text-sm font-bold text-white">Duplicar semana</p>
          <input name="fromDate" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="toDate" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="targetStartDate" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <button className="rounded-full border border-white/20 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-stone-950">Duplicar</button>
        </form>
      </div>

      <section className="grid gap-3">
        {shifts.map((shift) => (
          <div key={shift.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{new Date(shift.shift_date).toLocaleDateString("es-ES")} · {formatTime(shift.starts_at)} - {formatTime(shift.ends_at)}</p>
            <p className="mt-1 text-sm text-stone-300">{shift.status} · {shift.notes || "Sin notas"}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function TimeIncidentForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white">Comunicar incidencia</h2>
      <select name="incidentType" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
        <option value="missed_clock_in">Olvidé fichar entrada</option>
        <option value="missed_clock_out">Olvidé fichar salida</option>
        <option value="wrong_time">Hora incorrecta</option>
        <option value="wrong_location">Centro incorrecto</option>
        <option value="forgotten_break">Pausa olvidada</option>
        <option value="other">Otra incidencia</option>
      </select>
      <textarea name="description" required minLength={8} placeholder="Explica qué ha pasado" className="min-h-28 rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
      <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Enviar incidencia</button>
    </form>
  );
}

export function TimeIncidentReviewPanel({ incidents, action }: { incidents: StaffTimeIncident[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <section className="grid gap-3">
      {incidents.length ? incidents.map((incident) => (
        <form key={incident.id} action={action} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <input type="hidden" name="incidentId" value={incident.id} />
          <p className="font-black text-white">{incident.incident_type} · {incident.status}</p>
          <p className="mt-2 text-sm leading-6 text-stone-300">{incident.description}</p>
          <textarea name="resolution" placeholder="Resolución" className="mt-3 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button name="intent" value="approve" className="rounded-full border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-950">Aprobar</button>
            <button name="intent" value="reject" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Rechazar</button>
          </div>
        </form>
      )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay incidencias.</p>}
    </section>
  );
}

export function AuditTimeline({ logs }: { logs: StaffAuditLog[] }) {
  return (
    <section className="grid gap-3">
      {logs.map((log) => (
        <article key={log.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{log.action}</p>
          <p className="mt-2 text-sm text-stone-300">{log.entity_type} · {log.entity_id || "sin entidad"} · {formatDateTime(log.created_at)}</p>
        </article>
      ))}
    </section>
  );
}

export function EmployeeProfileTabs({ employee, contracts }: { employee: StaffEmployee; contracts: Array<{ id: string; contract_type: string; weekly_minutes: number; active: boolean; start_date: string }> }) {
  return (
    <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <div className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Empleado</p>
        <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white">{employee.display_name}</h2>
        <p className="mt-2 text-sm text-stone-300">{employee.employee_code} · {employee.status}</p>
      </div>
      <div className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Contratos</p>
        <div className="mt-3 grid gap-2">
          {contracts.map((contract) => (
            <p key={contract.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-stone-300">
              {contract.contract_type} · {contract.weekly_minutes} min/semana · {contract.active ? "activo" : "inactivo"}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
