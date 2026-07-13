import type { StaffEquipmentAssignment } from "@/lib/admin-kiosko/repositories/staff-equipment.repository";

export function EquipmentAssignment({ assignments }: { assignments: StaffEquipmentAssignment[] }) {
  return <section className="grid gap-3">{assignments.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{item.item_name} · {item.status}</p><p className="mt-1 text-sm text-stone-300">Cantidad {item.quantity} · talla {item.size || "--"} · devolución {item.expected_return_at || "--"}</p></article>)}{!assignments.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin material asignado.</p> : null}</section>;
}
