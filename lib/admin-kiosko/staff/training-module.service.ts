import { createTrainingAttempt, type StaffTrainingModule } from "../repositories/staff-compliance.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { canAttemptTraining, gradeTrainingAttempt, type TrainingQuestion } from "./training-module-rules";
import { sanitizeProcessAuditMetadata } from "./process-rules";

export async function submitTrainingAttempt(input: {
  actorUserId: string | null;
  employeeId: string;
  module: StaffTrainingModule;
  previousAttempts: number;
  answers: Record<string, string>;
}) {
  if (!canAttemptTraining({ attemptsUsed: input.previousAttempts, attemptsAllowed: input.module.attempts_allowed })) {
    return { ok: false as const, error: "Se ha alcanzado el límite de intentos." };
  }
  const grade = gradeTrainingAttempt({
    questions: input.module.questions as TrainingQuestion[],
    answers: input.answers,
    minScore: input.module.min_score,
  });
  const saved = await createTrainingAttempt({
    organization_id: input.module.organization_id,
    module_id: input.module.id,
    employee_id: input.employeeId,
    module_version: input.module.version,
    answers: input.answers,
    score: grade.score,
    passed: grade.passed,
  });
  if (!saved.ok) return saved;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_training_module",
    entityId: input.module.id,
    action: grade.passed ? "training_module.passed" : "training_module.failed",
    afterData: { score: grade.score, passed: grade.passed, module_version: input.module.version },
    metadata: sanitizeProcessAuditMetadata({ questionCount: input.module.questions.length }),
  });
  return { ok: true as const, data: grade };
}
