import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listTrainingModules } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";
import { listTrainingCatalog } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { TrainingModule } from "@/components/staff/TrainingModule";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function TrainingAdminPage() {
  await requireAdminPermission("staff:training:read");
  const [catalog, modules] = await Promise.all([listTrainingCatalog(), listTrainingModules()]);
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="Formación" description="Catálogo existente, requisitos por puesto y módulos internos." /><section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6"><TrainingModule modules={modules.ok ? modules.data : []} /><section className="grid gap-3">{(catalog.ok ? catalog.data : []).map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{item.name}</p><p className="mt-1 text-sm text-stone-300">{item.category} · obligatorio {item.mandatory ? "sí" : "no"}</p></article>)}</section></section></main>;
}
