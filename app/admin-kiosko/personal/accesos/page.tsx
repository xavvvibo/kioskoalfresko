import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listAccessAssignments } from "@/lib/admin-kiosko/repositories/staff-equipment.repository";
import { AccessChecklist } from "@/components/staff/AccessChecklist";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function AccessAdminPage() {
  await requireAdminPermission("staff:access:read");
  const assignments = await listAccessAssignments();
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Accesos" description="Accesos operativos sin almacenar contraseñas." /><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><AccessChecklist assignments={assignments.ok ? assignments.data : []} /></section></main>;
}
