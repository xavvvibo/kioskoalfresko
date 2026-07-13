import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId, listPublishedShiftsForEmployee } from "@/lib/admin-kiosko/repositories/staff.repository";
import { UpcomingShiftsList } from "@/components/staff/StaffCards";

export default async function StaffShiftsPage() {
  const session = await requireAdminSession("/staff/turnos");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const shifts = await listPublishedShiftsForEmployee(employee.data.id);

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mis turnos</h1>
        <UpcomingShiftsList shifts={shifts.ok ? shifts.data : []} />
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
