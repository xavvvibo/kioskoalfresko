import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listProcessTemplates } from "@/lib/admin-kiosko/repositories/staff-process.repository";
import { AdminHeader } from "../../../_components/AdminHeader";

export default async function OnboardingTemplatesPage() {
  await requireAdminPermission("staff:onboarding:manage");
  const templates = await listProcessTemplates("onboarding");
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Plantillas onboarding" description="Plantillas versionadas por centro, puesto, rol y contrato." /><section className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:px-6">{(templates.ok ? templates.data : []).map((template) => <article key={template.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{template.name} · v{template.version}</p><p className="mt-1 text-sm text-stone-300">{template.position || "cualquier puesto"} · {template.status}</p></article>)}{templates.ok && !templates.data.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin plantillas.</p> : null}</section></main>;
}
