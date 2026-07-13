import type { StaffInternalPolicy, StaffPolicyAssignment } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";

export function PolicyAcknowledgement({ policies, assignments, action }: { policies: StaffInternalPolicy[]; assignments: StaffPolicyAssignment[]; action?: (formData: FormData) => Promise<void> }) {
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  return (
    <section className="grid gap-3">
      {assignments.map((assignment) => {
        const policy = policyById.get(assignment.policy_id);
        return (
          <article key={assignment.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{policy?.title || assignment.policy_id} · v{assignment.policy_version}</p>
            <p className="mt-1 text-sm text-stone-300">{policy?.category || "política"} · {assignment.status}</p>
            {action && ["pending", "delivered", "read"].includes(assignment.status) ? (
              <form action={action} className="mt-3">
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase text-white">Confirmar lectura</button>
              </form>
            ) : null}
          </article>
        );
      })}
      {!assignments.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay políticas pendientes.</p> : null}
    </section>
  );
}
