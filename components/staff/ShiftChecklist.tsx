import type { StaffChecklistRun } from "@/lib/admin-kiosko/repositories/staff-checklist.repository";

export function ShiftChecklist({ runs }: { runs: StaffChecklistRun[] }) {
  return <section className="grid gap-3">{runs.map((run) => <article key={run.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">Checklist · {run.status}</p><p className="mt-1 text-sm text-stone-300">Versión {run.template_version} · límite {run.due_at ? new Date(run.due_at).toLocaleString("es-ES") : "--"}</p>{["pending", "available", "in_progress"].includes(run.status) ? <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[#f2c6bb]">No bloquea fichaje, pero puede requerir revisión antes de salir.</p> : null}</article>)}{!runs.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin checklists asignados.</p> : null}</section>;
}
