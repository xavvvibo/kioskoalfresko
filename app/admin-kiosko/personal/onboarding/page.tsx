import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listProcessTasks, listStaffProcesses } from "@/lib/admin-kiosko/repositories/staff-process.repository";
import { ProcessTaskList } from "@/components/staff/ProcessTaskList";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function OnboardingAdminPage() {
  await requireAdminPermission("staff:onboarding:read");
  const [employees, processes, tasks] = await Promise.all([listStaffEmployees(), listStaffProcesses("onboarding"), listProcessTasks()]);
  const employeeById = new Map((employees.ok ? employees.data : []).map((item) => [item.id, item.display_name]));
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Onboarding" description="Procesos de incorporación, tareas, bloqueos y progreso por empleado." />
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6">
        <div className="grid gap-3 md:grid-cols-2">
          {(processes.ok ? processes.data : []).map((process) => (
            <article key={process.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{employeeById.get(process.employee_id) || process.employee_id} · {process.status}</p>
              <p className="mt-1 text-sm text-stone-300">{process.position || "puesto sin definir"} · {process.completion_percent}% · alta {process.planned_date || "--"}</p>
            </article>
          ))}
        </div>
        <ProcessTaskList tasks={tasks.ok ? tasks.data.filter((task) => (processes.ok ? processes.data.some((process) => process.id === task.process_id) : true)) : []} />
      </section>
    </main>
  );
}
