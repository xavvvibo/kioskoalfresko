export type TrainingQuestion = {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation?: string;
  points?: number;
};

export function gradeTrainingAttempt(input: {
  questions: TrainingQuestion[];
  answers: Record<string, string>;
  minScore: number;
}) {
  const total = input.questions.reduce((sum, question) => sum + (question.points || 1), 0);
  const earned = input.questions.reduce((sum, question) => {
    return sum + (input.answers[question.id] === question.correctOptionId ? (question.points || 1) : 0);
  }, 0);
  const score = total ? Math.round((earned / total) * 10000) / 100 : 0;
  return { score, passed: score >= input.minScore };
}

export function canAttemptTraining(input: { attemptsUsed: number; attemptsAllowed: number }) {
  return input.attemptsUsed < input.attemptsAllowed;
}

export function buildTrainingFeedback(input: { questions: TrainingQuestion[]; answers: Record<string, string> }) {
  return input.questions.map((question) => ({
    questionId: question.id,
    correct: input.answers[question.id] === question.correctOptionId,
    explanation: question.explanation || null,
  }));
}
