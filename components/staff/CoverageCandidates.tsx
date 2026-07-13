import type { CandidateScore } from "@/lib/admin-kiosko/staff/workload-rules";

export function CoverageCandidates({ candidates }: { candidates: CandidateScore[] }) {
  return (
    <section className="grid gap-3">
      {candidates.length ? candidates.map((candidate) => (
        <article key={candidate.employeeId} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-black text-white">{candidate.employeeId}</p>
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black uppercase text-white">{candidate.eligible ? "Compatible" : "Bloqueado"} · {candidate.score}</span>
          </div>
          <p className="mt-2 text-sm text-stone-300">Planificadas {candidate.plannedHours} h · Contrato {candidate.contractHours ?? "--"} h</p>
          {candidate.blockingReasons.length ? <p className="mt-2 text-sm text-[#f2c6bb]">Bloqueos: {candidate.blockingReasons.join(" · ")}</p> : null}
          {candidate.warnings.length ? <p className="mt-2 text-sm text-amber-200">Avisos: {candidate.warnings.join(" · ")}</p> : null}
          {candidate.positiveFactors.length ? <p className="mt-2 text-sm text-emerald-200">Factores: {candidate.positiveFactors.join(" · ")}</p> : null}
        </article>
      )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin candidatos calculados.</p>}
    </section>
  );
}
