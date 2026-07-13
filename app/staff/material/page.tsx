import Link from "next/link";
import { listEquipmentAssignments } from "@/lib/admin-kiosko/repositories/staff-equipment.repository";
import { EquipmentAssignment } from "@/components/staff/EquipmentAssignment";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffMaterialPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const assignments = await listEquipmentAssignments(current.employee.id);
  return <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white"><div className="mx-auto grid max-w-5xl gap-5"><Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link><h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mi material</h1><EquipmentAssignment assignments={assignments.ok ? assignments.data : []} /></div></main>;
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
