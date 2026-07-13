import type { StaffProcess, StaffProcessTask } from "@/lib/admin-kiosko/repositories/staff-process.repository";
import { calculateProcessProgress } from "@/lib/admin-kiosko/staff/process-rules";

export function ProcessProgress({ process, tasks }: { process: StaffProcess; tasks: StaffProcessTask[] }) {
  const progress = calculateProcessProgress(tasks);
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{process.process_type} · {process.status}</p>
      <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-white">{progress.percent}% completado</h2>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#d94b2b]" style={{ width: `${progress.percent}%` }} /></div>
      <p className="mt-3 text-sm text-stone-300">{progress.completed}/{progress.total} tareas · {progress.blockingPending} bloqueantes pendientes</p>
    </section>
  );
}
