import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getStaffProcessById, listProcessTasks } from "@/lib/admin-kiosko/repositories/staff-process.repository";
import { ProcessProgress } from "@/components/staff/ProcessProgress";
import { ProcessTaskList } from "@/components/staff/ProcessTaskList";
import { AdminHeader } from "../../../_components/AdminHeader";

export default async function OnboardingDetailPage({ params }: { params: Promise<{ processId: string }> }) {
  await requireAdminPermission("staff:onboarding:read");
  const { processId } = await params;
  const [process, tasks] = await Promise.all([getStaffProcessById(processId), listProcessTasks(processId)]);
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Detalle onboarding" description="Tareas, evidencias, bloqueos e historial de incorporación." /><section className="mx-auto grid max-w-5xl gap-5 px-4 py-8 sm:px-6"><Link href="/admin-kiosko/personal/onboarding" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>{process.ok && process.data ? <ProcessProgress process={process.data} tasks={tasks.ok ? tasks.data : []} /> : <p>Proceso no encontrado.</p>}<ProcessTaskList tasks={tasks.ok ? tasks.data : []} /></section></main>;
}
