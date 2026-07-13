import type { ScheduleDiffItem } from "@/lib/admin-kiosko/staff/schedule-publication-rules";

export function ScheduleDiff({ changes }: { changes: ScheduleDiffItem[] }) {
  return (
    <section className="grid gap-3">
      {changes.length ? changes.map((change, index) => (
        <article key={`${change.shiftId}-${change.changeType}-${index}`} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <p className="font-black text-white">{change.changeType} · {change.shiftId}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <pre className="overflow-auto rounded-2xl bg-black/30 p-3 text-xs text-stone-300">{JSON.stringify(change.before, null, 2)}</pre>
            <pre className="overflow-auto rounded-2xl bg-black/30 p-3 text-xs text-stone-300">{JSON.stringify(change.after, null, 2)}</pre>
          </div>
        </article>
      )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin cambios entre versiones.</p>}
    </section>
  );
}
