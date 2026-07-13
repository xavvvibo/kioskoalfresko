import Link from "next/link";
import { listProcessTasks, listStaffProcesses } from "@/lib/admin-kiosko/repositories/staff-process.repository";
import { ProcessProgress } from "@/components/staff/ProcessProgress";
import { ProcessTaskList } from "@/components/staff/ProcessTaskList";
import { staffCompleteProcessTaskAction } from "../actions";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffOnboardingPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const [processes, tasks] = await Promise.all([listStaffProcesses("onboarding", current.employee.id), listProcessTasks(undefined, current.employee.id)]);
  const process = processes.ok ? processes.data[0] : null;
  const visibleTasks = (tasks.ok ? tasks.data : []).filter((task) => task.visible_to_employee);
  return <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white"><div className="mx-auto grid max-w-5xl gap-5"><Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link><h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mi incorporación</h1>{process ? <ProcessProgress process={process} tasks={visibleTasks} /> : null}<ProcessTaskList tasks={visibleTasks} action={staffCompleteProcessTaskAction} /></div></main>;
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
