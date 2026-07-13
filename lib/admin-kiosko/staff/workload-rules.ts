import type { CandidateInput } from "./availability-rules.ts";
import { detectCandidateRestrictions, minutesBetween, resolveAvailabilityForShift } from "./availability-rules.ts";

export type CandidateScore = {
  employeeId: string;
  eligible: boolean;
  score: number;
  blockingReasons: string[];
  warnings: string[];
  positiveFactors: string[];
  plannedHours: number;
  contractHours: number | null;
};

export function scoreCandidate(input: CandidateInput & {
  acceptsUrgentCoverage?: boolean;
  acceptsAdditionalHours?: boolean;
  preferredLocationId?: string | null;
  preferredRoles?: string[];
  targetRole?: string | null;
}) {
  const restrictions = detectCandidateRestrictions(input);
  let score = 50;
  const positiveFactors: string[] = [];
  const warnings = restrictions.filter((item) => !item.blocking).map((item) => item.message);
  const blockingReasons = restrictions.filter((item) => item.blocking).map((item) => item.message);

  const availability = resolveAvailabilityForShift({
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    recurring: input.recurringAvailability || [],
    exceptions: input.availabilityExceptions || [],
  });
  if (availability.type === "available" || availability.type === "positive_preference") {
    score += 20;
    positiveFactors.push("Disponibilidad declarada.");
  }
  if (input.preferredLocationId && input.preferredLocationId === input.shiftLocationId) {
    score += 10;
    positiveFactors.push("Centro preferido.");
  }
  if (input.targetRole && input.preferredRoles?.includes(input.targetRole)) {
    score += 10;
    positiveFactors.push("Puesto preferido.");
  }
  if (input.acceptsUrgentCoverage) {
    score += 8;
    positiveFactors.push("Acepta cobertura urgente.");
  }
  if (input.acceptsAdditionalHours) {
    score += 5;
    positiveFactors.push("Acepta horas adicionales.");
  }
  const shiftMinutes = minutesBetween(input.shiftStart, input.shiftEnd);
  const plannedAfter = (input.plannedWeekMinutes || 0) + shiftMinutes;
  const contract = input.contractWeeklyMinutes || null;
  if (contract && plannedAfter <= contract) {
    score += 8;
    positiveFactors.push("Encaja dentro de horas contratadas.");
  }
  score -= warnings.length * 8;
  for (const blocker of blockingReasons) {
    score -= 40;
    if (!blocker) score -= 0;
  }
  return {
    employeeId: input.employeeId,
    eligible: blockingReasons.length === 0,
    score: Math.max(0, Math.min(100, Math.round(score))),
    blockingReasons,
    warnings,
    positiveFactors,
    plannedHours: Math.round(((input.plannedWeekMinutes || 0) + shiftMinutes) / 60 * 100) / 100,
    contractHours: contract ? Math.round(contract / 60 * 100) / 100 : null,
  } satisfies CandidateScore;
}

export function rankCandidates(candidates: Array<Parameters<typeof scoreCandidate>[0]>) {
  return candidates.map(scoreCandidate).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}
