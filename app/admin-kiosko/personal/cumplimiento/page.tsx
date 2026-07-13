import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listComplianceAlerts } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";
import { ComplianceAlerts } from "@/components/staff/ComplianceAlerts";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function ComplianceAdminPage() {
  await requireAdminPermission("staff:compliance:read");
  const alerts = await listComplianceAlerts();
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Cumplimiento" description="Alertas de onboarding, documentos, firmas, formación, PRL, APPCC, material y offboarding." /><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><ComplianceAlerts alerts={alerts.ok ? alerts.data : []} /></section></main>;
}
