import type { StaffTrainingModule } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";

export function TrainingModule({ modules }: { modules: StaffTrainingModule[] }) {
  return (
    <section className="grid gap-3">
      {modules.map((module) => (
        <article key={module.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <p className="font-black text-white">{module.title} · v{module.version}</p>
          <p className="mt-1 text-sm text-stone-300">{module.description || "Formación interna"} · {module.estimated_minutes || "--"} min</p>
        </article>
      ))}
      {!modules.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay módulos formativos.</p> : null}
    </section>
  );
}
