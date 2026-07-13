import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listNotifications } from "@/lib/admin-kiosko/repositories/staff-notifications.repository";
import { NotificationsPanel } from "@/components/staff/NotificationsPanel";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function NotificationsAdminPage() {
  await requireAdminPermission("staff:notification:read");
  const notifications = await listNotifications();
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Notificaciones" description="Notificaciones internas, lectura y trazabilidad sin proveedores externos." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <NotificationsPanel notifications={notifications.ok ? notifications.data : []} />
      </section>
    </main>
  );
}
