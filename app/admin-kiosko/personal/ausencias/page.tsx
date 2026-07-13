import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listLeaveRequests, listShiftAbsenceImpacts } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { LeaveRequestBoard } from "@/components/staff/LeaveAdmin";
import { AdminHeader } from "../../_components/AdminHeader";
import { decideLeaveRequestAction } from "./actions";

export default async function LeaveRequestsAdminPage() {
  await requireAdminPermission("staff:absence:read");
  const [employees, requests, impacts] = await Promise.all([listStaffEmployees(), listLeaveRequests(), listShiftAbsenceImpacts()]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Ausencias" description="Bandeja de solicitudes, conflictos, saldos y turnos afectados." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <LeaveRequestBoard requests={requests.ok ? requests.data : []} employees={employees.ok ? employees.data : []} impacts={impacts.ok ? impacts.data : []} action={decideLeaveRequestAction} />
      </section>
    </main>
  );
}
