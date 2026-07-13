import type { StaffProcessTask } from "@/lib/admin-kiosko/repositories/staff-process.repository";

export function ProcessTaskList({ tasks, action }: { tasks: StaffProcessTask[]; action?: (formData: FormData) => Promise<void> }) {
  return (
    <section className="grid gap-3">
      {tasks.length ? tasks.map((task) => (
        <article key={task.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <div className="flex flex-wrap justify-between gap-3">
            <p className="font-black text-white">{task.title}</p>
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black uppercase text-white">{task.status}</span>
          </div>
          <p className="mt-1 text-sm text-stone-300">{task.description || task.task_type} · límite {task.due_at ? new Date(task.due_at).toLocaleDateString("es-ES") : "--"}</p>
          {task.blocking ? <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[#f2c6bb]">Bloqueante</p> : null}
          {action && task.visible_to_employee && !["completed", "waived", "cancelled"].includes(task.status) ? (
            <form action={action} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="taskId" value={task.id} />
              <input name="result" placeholder="Comentario o evidencia" className="min-w-52 rounded-2xl border border-white/10 bg-white px-4 py-2 text-sm text-stone-950" />
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase text-white">Completar</button>
            </form>
          ) : null}
        </article>
      )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay tareas.</p>}
    </section>
  );
}
