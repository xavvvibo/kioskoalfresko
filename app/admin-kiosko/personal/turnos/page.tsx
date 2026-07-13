import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees, listStaffLocations, listStaffShifts } from "@/lib/admin-kiosko/repositories/staff.repository";
import { ShiftPlanner } from "@/components/staff/StaffCards";
import { AdminHeader } from "../../_components/AdminHeader";
import { createStaffShiftAction, duplicateStaffWeekAction, publishStaffShiftsAction } from "../actions";

export default async function StaffShiftsAdminPage() {
  await requireAdminPermission("staff:shifts:manage");
  const [employees, locations, shifts] = await Promise.all([
    listStaffEmployees(),
    listStaffLocations(),
    listStaffShifts(),
  ]);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Cuadrantes y turnos" description="Crea borradores, duplica semanas y publica turnos para que el empleado vea solo lo confirmado." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ShiftPlanner
          employees={employees.ok ? employees.data : []}
          locations={locations.ok ? locations.data : []}
          shifts={shifts.ok ? shifts.data : []}
          action={createStaffShiftAction}
          publishAction={publishStaffShiftsAction}
          duplicateAction={duplicateStaffWeekAction}
        />
      </section>
    </main>
  );
}
