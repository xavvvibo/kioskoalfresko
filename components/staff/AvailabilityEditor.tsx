import type { AvailabilityExceptionRecord, RecurringAvailability, WorkPreference } from "@/lib/admin-kiosko/repositories/staff-availability.repository";

const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function AvailabilityEditor({
  availability,
  exceptions,
  preference,
  action,
}: {
  availability: RecurringAvailability[];
  exceptions: AvailabilityExceptionRecord[];
  preference: WorkPreference | null;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="grid gap-4">
      <form action={action} className="grid gap-3 rounded-[1.4rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-4">
        <input type="hidden" name="intent" value="recurring_availability" />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-4">Disponibilidad recurrente</h2>
        <select name="weekday" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select>
        <select name="availabilityType" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          <option value="available">Disponible</option>
          <option value="unavailable">No disponible</option>
          <option value="positive_preference">Preferencia positiva</option>
          <option value="negative_preference">Preferencia negativa</option>
        </select>
        <input name="startsAt" type="time" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="endsAt" type="time" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <label className="text-sm font-bold text-stone-200"><input name="fullDay" type="checkbox" className="mr-2" /> Jornada completa</label>
        <input name="validFrom" type="date" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="validUntil" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="notes" placeholder="Observaciones" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-4">Guardar disponibilidad</button>
      </form>

      <form action={action} className="grid gap-3 rounded-[1.4rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-3">
        <input type="hidden" name="intent" value="availability_exception" />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-3">Indisponibilidad puntual</h2>
        <select name="availabilityType" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950"><option value="unavailable">No disponible</option><option value="available">Disponible</option></select>
        <input name="startsAt" type="datetime-local" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="endsAt" type="datetime-local" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="reason" placeholder="Motivo general" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="notes" placeholder="Observaciones" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-3">Enviar excepción</button>
      </form>

      <form action={action} className="grid gap-3 rounded-[1.4rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-3">
        <input type="hidden" name="intent" value="work_preferences" />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-3">Preferencias no vinculantes</h2>
        <input name="preferredShiftParts" defaultValue={preference?.preferred_shift_parts.join(", ") || ""} placeholder="mañana, tarde, cierre" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="preferredFreeWeekdays" defaultValue={preference?.preferred_free_weekdays.join(",") || ""} placeholder="Días libres 0-6" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="preferredRoles" defaultValue={preference?.preferred_roles.join(", ") || ""} placeholder="Puestos preferidos" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <label className="text-sm font-bold text-stone-200"><input name="avoidSplitShifts" type="checkbox" defaultChecked={preference?.avoid_split_shifts} className="mr-2" /> Evitar partidos</label>
        <label className="text-sm font-bold text-stone-200"><input name="acceptsAdditionalHours" type="checkbox" defaultChecked={preference?.accepts_additional_hours} className="mr-2" /> Horas adicionales</label>
        <label className="text-sm font-bold text-stone-200"><input name="acceptsUrgentCoverage" type="checkbox" defaultChecked={preference?.accepts_urgent_coverage} className="mr-2" /> Cobertura urgente</label>
        <textarea name="notes" defaultValue={preference?.notes || ""} placeholder="Observaciones" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-3" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-3">Guardar preferencias</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {availability.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{weekdays[item.weekday]} · {item.availability_type}</p><p className="text-sm text-stone-300">{item.full_day ? "Jornada completa" : `${item.starts_at || "--"} - ${item.ends_at || "--"}`} · {item.valid_from} - {item.valid_until || "sin fin"}</p></article>)}
        {exceptions.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{item.availability_type} · {item.status}</p><p className="text-sm text-stone-300">{new Date(item.starts_at).toLocaleString("es-ES")} - {new Date(item.ends_at).toLocaleString("es-ES")}</p></article>)}
      </div>
    </section>
  );
}
