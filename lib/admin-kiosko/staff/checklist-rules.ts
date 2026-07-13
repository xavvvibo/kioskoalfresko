export type ChecklistResponseType = "checkbox" | "text" | "number" | "temperature" | "photo" | "selection" | "signature";
export type ChecklistIssueStatus = "open" | "acknowledged" | "corrective_action" | "resolved" | "dismissed";

export type ChecklistItemRule = {
  id: string;
  text: string;
  responseType: ChecklistResponseType;
  mandatory: boolean;
  critical: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  requiresEvidence: boolean;
  generatesIncident: boolean;
};

export function evaluateChecklistResult(input: {
  item: ChecklistItemRule;
  valueText?: string | null;
  valueNumber?: number | null;
  evidence?: Record<string, unknown> | null;
}) {
  const failures: string[] = [];
  if (input.item.mandatory && input.item.responseType !== "checkbox" && !input.valueText && input.valueNumber == null) failures.push("Respuesta obligatoria.");
  if (input.item.requiresEvidence && !input.evidence?.valid) failures.push("Falta evidencia.");
  if (input.item.responseType === "checkbox" && input.item.mandatory && input.valueText !== "true") failures.push("Confirmación obligatoria.");
  if (input.valueNumber != null && input.item.minValue != null && input.valueNumber < input.item.minValue) failures.push("Valor inferior al mínimo.");
  if (input.valueNumber != null && input.item.maxValue != null && input.valueNumber > input.item.maxValue) failures.push("Valor superior al máximo.");
  const passed = failures.length === 0;
  return {
    passed,
    failures,
    createsIssue: !passed && (input.item.critical || input.item.generatesIncident),
  };
}

export function determineChecklistRunStatus(results: Array<{ passed: boolean | null; critical: boolean }>, missed = false) {
  if (missed) return "missed";
  if (!results.length) return "pending";
  if (results.some((result) => result.passed === false && result.critical)) return "completed_with_issues";
  if (results.every((result) => result.passed !== null)) return "completed";
  return "in_progress";
}

export function canCloseChecklistIssue(status: ChecklistIssueStatus) {
  return ["open", "acknowledged", "corrective_action"].includes(status);
}
