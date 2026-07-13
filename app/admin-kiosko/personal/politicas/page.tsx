import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listStaffLocations } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listLeavePolicies } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { LeavePolicyForm } from "@/components/staff/LeaveAdmin";
import { AdminHeader } from "../../_components/AdminHeader";
import { createLeavePolicyAction } from "../ausencias/actions";

export default async function LeavePoliciesPage() {
  await requireAdminPermission("staff:policy:read");
  const [locations, policies] = await Promise.all([listStaffLocations(), listLeavePolicies()]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Políticas de ausencia" description="Configuración flexible de devengo, unidades, aprobaciones y límites." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <LeavePolicyForm locations={locations.ok ? locations.data : []} action={createLeavePolicyAction} />
        <section className="grid gap-3">
          {policies.ok && policies.data.length ? policies.data.map((policy) => (
            <article key={policy.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{policy.name} · {policy.absence_type}</p>
              <p className="mt-1 text-sm text-stone-300">{policy.accrual_method} · {policy.annual_amount} {policy.unit} · aprobación {policy.requires_approval ? "sí" : "no"}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin políticas.</p>}
        </section>
      </section>
    </main>
  );
}
