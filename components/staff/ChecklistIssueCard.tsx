import type { StaffChecklistIssue } from "@/lib/admin-kiosko/repositories/staff-checklist.repository";

export function ChecklistIssueCard({ issues }: { issues: StaffChecklistIssue[] }) {
  return <section className="grid gap-3">{issues.map((issue) => <article key={issue.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="font-black text-white">{issue.item_text} · {issue.status}</p><p className="mt-1 text-sm text-stone-300">Valor {issue.observed_value || "--"} · límite {issue.expected_limit || "--"}</p></article>)}{!issues.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin incidencias de checklist.</p> : null}</section>;
}
