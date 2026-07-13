import type { CandidateRestriction } from "@/lib/admin-kiosko/staff/availability-rules";

export function WorkloadWarnings({ restrictions }: { restrictions: CandidateRestriction[] }) {
  return (
    <section className="grid gap-2">
      {restrictions.map((restriction) => (
        <p key={`${restriction.code}-${restriction.source}`} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-sm text-stone-200">
          <span className="font-black text-white">{restriction.severity}</span> · {restriction.message}
        </p>
      ))}
    </section>
  );
}
