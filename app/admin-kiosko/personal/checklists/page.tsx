import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listChecklistIssues, listChecklistRuns, listChecklistTemplates } from "@/lib/admin-kiosko/repositories/staff-checklist.repository";
import { ChecklistIssueCard } from "@/components/staff/ChecklistIssueCard";
import { ShiftChecklist } from "@/components/staff/ShiftChecklist";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function StaffChecklistsAdminPage() {
  await requireAdminPermission("staff:checklist:read");
  const [templates, runs, issues] = await Promise.all([listChecklistTemplates(), listChecklistRuns(), listChecklistIssues()]);
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Checklists RRHH/APPCC" description="Plantillas versionadas, ejecuciones por turno e incidencias críticas." /><section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6"><section className="grid gap-3">{(templates.ok ? templates.data : []).map((template) => <article key={template.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{template.name} · v{template.version}</p><p className="mt-1 text-sm text-stone-300">{template.checklist_type} · {template.status}</p></article>)}</section><ShiftChecklist runs={runs.ok ? runs.data : []} /><ChecklistIssueCard issues={issues.ok ? issues.data : []} /></section></main>;
}
