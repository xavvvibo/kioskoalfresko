import Link from "next/link";
import { listPublishedShiftsForEmployee, listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listShiftChangeRequests } from "@/lib/admin-kiosko/repositories/staff-shift-change.repository";
import { ShiftChangeCard, ShiftChangeForm } from "@/components/staff/ShiftChangeCard";
import { staffShiftChangeAction } from "../actions";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffShiftChangesPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const employeeData = current.employee;
  const [shifts, employees, requests] = await Promise.all([
    listPublishedShiftsForEmployee(employeeData.id),
    listStaffEmployees(),
    listShiftChangeRequests(employeeData.id),
  ]);
  const candidateEmployees = (employees.ok ? employees.data : []).filter((item) => {
    if (item.id === employeeData.id || item.status !== "active") return false;
    if (current.actor.isOwner) return true;
    return Boolean(item.primary_location_id && current.actor.locationIds.includes(item.primary_location_id));
  });
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-5xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Cambios de turno</h1>
        <ShiftChangeForm shifts={shifts.ok ? shifts.data : []} employees={candidateEmployees} action={staffShiftChangeAction} />
        <ShiftChangeCard requests={requests.ok ? requests.data : []} employees={candidateEmployees.concat(employeeData)} shifts={shifts.ok ? shifts.data : []} />
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
