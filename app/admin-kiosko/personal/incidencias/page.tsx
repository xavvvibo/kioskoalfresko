import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffTimeIncidents } from "@/lib/admin-kiosko/repositories/staff.repository";
import { TimeIncidentReviewPanel } from "@/components/staff/StaffCards";
import { AdminHeader } from "../../_components/AdminHeader";
import { reviewTimeIncidentAction } from "../actions";

export default async function StaffIncidentsAdminPage() {
  await requireAdminPermission("staff:time:review");
  const incidents = await listStaffTimeIncidents();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Incidencias de tiempo" description="Revisa, aprueba o rechaza rectificaciones con auditoría." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <TimeIncidentReviewPanel incidents={incidents.ok ? incidents.data : []} action={reviewTimeIncidentAction} />
      </section>
    </main>
  );
}
