import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId } from "@/lib/admin-kiosko/repositories/staff.repository";
import { getWorkPreference, listAvailabilityExceptions, listRecurringAvailability } from "@/lib/admin-kiosko/repositories/staff-availability.repository";
import { AvailabilityEditor } from "@/components/staff/AvailabilityEditor";
import { staffAvailabilityAction } from "../actions";

export default async function StaffAvailabilityPage() {
  const session = await requireAdminSession("/staff/disponibilidad");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const [availability, exceptions, preference] = await Promise.all([
    listRecurringAvailability(employee.data.id),
    listAvailabilityExceptions(employee.data.id),
    getWorkPreference(employee.data.id),
  ]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-5xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mi disponibilidad</h1>
        <AvailabilityEditor
          availability={availability.ok ? availability.data : []}
          exceptions={exceptions.ok ? exceptions.data : []}
          preference={preference.ok ? preference.data : null}
          action={staffAvailabilityAction}
        />
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
