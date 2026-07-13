import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId, listPublishedShiftsForEmployee, listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listShiftChangeRequests } from "@/lib/admin-kiosko/repositories/staff-shift-change.repository";
import { ShiftChangeCard, ShiftChangeForm } from "@/components/staff/ShiftChangeCard";
import { staffShiftChangeAction } from "../actions";

export default async function StaffShiftChangesPage() {
  const session = await requireAdminSession("/staff/cambios");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const employeeData = employee.data;
  const [shifts, employees, requests] = await Promise.all([
    listPublishedShiftsForEmployee(employeeData.id),
    listStaffEmployees(),
    listShiftChangeRequests(employeeData.id),
  ]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-5xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Cambios de turno</h1>
        <ShiftChangeForm shifts={shifts.ok ? shifts.data : []} employees={(employees.ok ? employees.data : []).filter((item) => item.id !== employeeData.id)} action={staffShiftChangeAction} />
        <ShiftChangeCard requests={requests.ok ? requests.data : []} employees={employees.ok ? employees.data : []} shifts={shifts.ok ? shifts.data : []} />
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
