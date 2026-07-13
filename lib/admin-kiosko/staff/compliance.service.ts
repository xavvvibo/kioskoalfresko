import type { StaffComplianceAlert } from "../repositories/staff-compliance.repository";
import type { StaffProcess, StaffProcessTask } from "../repositories/staff-process.repository";

export function summarizeEmployeeCompliance(input: {
  processes: StaffProcess[];
  tasks: StaffProcessTask[];
  alerts: StaffComplianceAlert[];
}) {
  return {
    onboarding: input.processes.filter((item) => item.process_type === "onboarding" && item.status !== "completed").length,
    offboarding: input.processes.filter((item) => item.process_type === "offboarding" && item.status !== "completed").length,
    pendingTasks: input.tasks.filter((task) => !["completed", "waived", "cancelled"].includes(task.status)).length,
    blockingTasks: input.tasks.filter((task) => task.blocking && !["completed", "waived", "cancelled"].includes(task.status)).length,
    criticalAlerts: input.alerts.filter((alert) => alert.severity === "critical" && alert.status === "open").length,
    openAlerts: input.alerts.filter((alert) => alert.status === "open").length,
  };
}

export function classifyComplianceAlert(category: string) {
  const critical = new Set(["checklist_critical_missed", "document_expired", "offboarding_incomplete", "prl_pending"]);
  return critical.has(category) ? "critical" : "warning";
}
