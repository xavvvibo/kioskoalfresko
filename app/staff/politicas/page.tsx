import Link from "next/link";
import { listInternalPolicies, listPolicyAssignments } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";
import { PolicyAcknowledgement } from "@/components/staff/PolicyAcknowledgement";
import { staffAcknowledgePolicyAction } from "../actions";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffPoliciesPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const [policies, assignments] = await Promise.all([listInternalPolicies(), listPolicyAssignments(current.employee.id)]);
  return <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white"><div className="mx-auto grid max-w-5xl gap-5"><Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link><h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Políticas internas</h1><PolicyAcknowledgement policies={policies.ok ? policies.data : []} assignments={assignments.ok ? assignments.data : []} action={staffAcknowledgePolicyAction} /></div></main>;
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
