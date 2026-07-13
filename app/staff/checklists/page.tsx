import Link from "next/link";
import { listChecklistRuns } from "@/lib/admin-kiosko/repositories/staff-checklist.repository";
import { ShiftChecklist } from "@/components/staff/ShiftChecklist";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffChecklistsPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const runs = await listChecklistRuns(current.employee.id);
  return <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white"><div className="mx-auto grid max-w-5xl gap-5"><Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link><h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mis checklists</h1><ShiftChecklist runs={runs.ok ? runs.data : []} /></div></main>;
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
