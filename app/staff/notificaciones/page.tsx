import Link from "next/link";
import { listNotifications } from "@/lib/admin-kiosko/repositories/staff-notifications.repository";
import { NotificationsPanel } from "@/components/staff/NotificationsPanel";
import { staffNotificationAction } from "../actions";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffNotificationsPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const notifications = await listNotifications(current.employee.id);
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-5xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Notificaciones</h1>
        <NotificationsPanel notifications={notifications.ok ? notifications.data : []} action={staffNotificationAction} />
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
