import { phase4Request } from "./staff-process.repository";

export type StaffChecklistTemplate = {
  id: string;
  organization_id: string;
  location_id: string | null;
  name: string;
  checklist_type: string;
  position: string | null;
  role_name: string | null;
  shift_kind: string | null;
  weekday: number | null;
  version: number;
  status: "draft" | "published" | "archived";
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffChecklistRun = {
  id: string;
  organization_id: string;
  location_id: string | null;
  shift_id: string | null;
  employee_id: string | null;
  template_id: string | null;
  template_version: number;
  tasks_snapshot: Array<Record<string, unknown>>;
  status: "pending" | "available" | "in_progress" | "completed" | "completed_with_issues" | "missed" | "waived";
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  evidence: Record<string, unknown>;
  incident_ids: string[];
  signature_id: string | null;
  supervised_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffChecklistIssue = {
  id: string;
  organization_id: string;
  location_id: string | null;
  run_id: string | null;
  result_id: string | null;
  shift_id: string | null;
  employee_id: string | null;
  item_text: string;
  observed_value: string | null;
  expected_limit: string | null;
  evidence: Record<string, unknown>;
  status: "open" | "acknowledged" | "corrective_action" | "resolved" | "dismissed";
  corrective_action: string | null;
  responsible_user_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listChecklistTemplates() {
  return phase4Request<StaffChecklistTemplate[]>("admin_kiosko_staff_checklist_templates", { method: "GET", query: "?select=*&order=created_at.desc" });
}

export async function listChecklistRuns(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase4Request<StaffChecklistRun[]>("admin_kiosko_staff_checklist_runs", { method: "GET", query: `?select=*${filter}&order=due_at.desc` });
}

export async function patchChecklistRun(id: string, payload: Partial<StaffChecklistRun>) {
  const result = await phase4Request<StaffChecklistRun[]>("admin_kiosko_staff_checklist_runs", { method: "PATCH", query: `?id=eq.${encodeURIComponent(id)}`, body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listChecklistIssues() {
  return phase4Request<StaffChecklistIssue[]>("admin_kiosko_staff_checklist_issues", { method: "GET", query: "?select=*&order=created_at.desc" });
}
