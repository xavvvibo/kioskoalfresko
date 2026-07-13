import type { CandidateInput } from "./availability-rules";
import { rankCandidates, scoreCandidate } from "./workload-rules";

export { rankCandidates, scoreCandidate };

export function explainCandidate(input: CandidateInput) {
  const score = scoreCandidate(input);
  return {
    ...score,
    summary: score.eligible
      ? `Candidato compatible con puntuación ${score.score}.`
      : `Candidato no compatible: ${score.blockingReasons.join(" ")}`,
  };
}
