import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listEquipmentAssignments } from "@/lib/admin-kiosko/repositories/staff-equipment.repository";
import { EquipmentAssignment } from "@/components/staff/EquipmentAssignment";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function EquipmentAdminPage() {
  await requireAdminPermission("staff:equipment:read");
  const assignments = await listEquipmentAssignments();
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Material y EPIs" description="Entregas, devoluciones, uniformes, EPIs, llaves y dispositivos." /><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><EquipmentAssignment assignments={assignments.ok ? assignments.data : []} /></section></main>;
}
