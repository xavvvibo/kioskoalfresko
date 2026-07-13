import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees, listStaffShifts } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listShiftChangeRequests } from "@/lib/admin-kiosko/repositories/staff-shift-change.repository";
import { ShiftChangeCard } from "@/components/staff/ShiftChangeCard";
import { AdminHeader } from "../../_components/AdminHeader";
import { decideShiftChangeAction } from "./actions";

export default async function ShiftChangesAdminPage() {
  await requireAdminPermission("staff:shift-change:read");
  const [employees, shifts, requests] = await Promise.all([listStaffEmployees(), listStaffShifts(), listShiftChangeRequests()]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Cambios de turno" description="Solicitudes, cesiones, intercambios y aprobaciones administrativas." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ShiftChangeCard
          requests={requests.ok ? requests.data : []}
          employees={employees.ok ? employees.data : []}
          shifts={shifts.ok ? shifts.data : []}
          action={decideShiftChangeAction}
          admin
        />
      </section>
    </main>
  );
}
