import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listProcessTemplates } from "@/lib/admin-kiosko/repositories/staff-process.repository";
import { AdminHeader } from "../../../_components/AdminHeader";

export default async function OffboardingTemplatesPage() {
  await requireAdminPermission("staff:offboarding:manage");
  const templates = await listProcessTemplates("offboarding");
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Plantillas offboarding" description="Plantillas versionadas por tipo de salida, centro, puesto y rol." /><section className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:px-6">{(templates.ok ? templates.data : []).map((template) => <article key={template.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{template.name} · v{template.version}</p><p className="mt-1 text-sm text-stone-300">{template.exit_reason || "cualquier salida"} · {template.status}</p></article>)}{templates.ok && !templates.data.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin plantillas.</p> : null}</section></main>;
}
