import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listProcessTasks, listStaffProcesses } from "@/lib/admin-kiosko/repositories/staff-process.repository";
import { ProcessProgress } from "@/components/staff/ProcessProgress";
import { ProcessTaskList } from "@/components/staff/ProcessTaskList";
import { staffCompleteProcessTaskAction } from "../actions";

export default async function StaffOffboardingPage() {
  const session = await requireAdminSession("/staff/salida");
  if (!session.id) return <Empty text="Accede con usuario nominal." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const [processes, tasks] = await Promise.all([listStaffProcesses("offboarding", employee.data.id), listProcessTasks(undefined, employee.data.id)]);
  const process = processes.ok ? processes.data[0] : null;
  const visibleTasks = (tasks.ok ? tasks.data : []).filter((task) => task.visible_to_employee);
  return <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white"><div className="mx-auto grid max-w-5xl gap-5"><Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link><h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mi salida</h1>{process ? <ProcessProgress process={process} tasks={visibleTasks} /> : null}<ProcessTaskList tasks={visibleTasks} action={staffCompleteProcessTaskAction} /></div></main>;
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
