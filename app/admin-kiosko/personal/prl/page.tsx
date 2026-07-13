import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listPrlRecords } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function PrlAdminPage() {
  await requireAdminPermission("staff:prl:read");
  const records = await listPrlRecords();
  return <main className="min-h-screen bg-[#0d0d0d] text-white"><AdminHeader title="PRL" description="Seguimiento administrativo PRL sin datos clínicos." /><section className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:px-6">{(records.ok ? records.data : []).map((record) => <article key={record.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{record.title} · {record.status}</p><p className="mt-1 text-sm text-stone-300">{record.record_type} · aptitud {record.medical_fitness_status}</p></article>)}{records.ok && !records.data.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin registros PRL.</p> : null}</section></main>;
}
