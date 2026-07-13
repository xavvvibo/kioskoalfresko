import type { StaffAccessAssignment } from "@/lib/admin-kiosko/repositories/staff-equipment.repository";

export function AccessChecklist({ assignments }: { assignments: StaffAccessAssignment[] }) {
  return <section className="grid gap-3">{assignments.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{item.access_type} · {item.status}</p><p className="mt-1 text-sm text-stone-300">{item.external_identifier ? "Identificador externo registrado" : "Sin identificador externo"} · sin contraseñas</p></article>)}{!assignments.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin accesos asignados.</p> : null}</section>;
}
