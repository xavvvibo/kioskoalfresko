import { phase4Request } from "./staff-process.repository";

export type StaffInternalPolicy = {
  id: string;
  organization_id: string;
  location_id: string | null;
  title: string;
  code: string;
  category: string;
  content: string;
  version: number;
  effective_on: string | null;
  status: "draft" | "published" | "superseded" | "archived";
  requires_read: boolean;
  requires_confirmation: boolean;
  requires_signature: boolean;
  applicable_positions: string[];
  document_id: string | null;
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffPolicyAssignment = {
  id: string;
  organization_id: string;
  policy_id: string;
  employee_id: string;
  policy_version: number;
  delivered_at: string;
  read_at: string | null;
  acknowledged_at: string | null;
  signature_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  confirmed_text: string | null;
  status: "pending" | "delivered" | "read" | "acknowledged" | "signed" | "declined" | "expired" | "superseded";
  created_at: string;
  updated_at: string;
};

export type StaffTrainingModule = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  content: string;
  media_url: string | null;
  document_id: string | null;
  estimated_minutes: number | null;
  questions: Array<Record<string, unknown>>;
  min_score: number;
  attempts_allowed: number;
  version: number;
  status: "draft" | "published" | "archived";
  applicable_positions: string[];
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffComplianceAlert = {
  id: string;
  organization_id: string;
  location_id: string | null;
  employee_id: string | null;
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  responsible_user_id: string | null;
  due_at: string | null;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StaffPrlRecord = {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  record_type: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "expired" | "cancelled";
  medical_fitness_status: "not_required" | "pending" | "fit" | "fit_with_restrictions" | "not_fit" | "expired" | "unknown";
  responsible_user_id: string | null;
  effective_on: string | null;
  review_on: string | null;
  document_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listInternalPolicies() {
  return phase4Request<StaffInternalPolicy[]>("admin_kiosko_staff_internal_policies", { method: "GET", query: "?select=*&order=created_at.desc" });
}

export async function listPolicyAssignments(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase4Request<StaffPolicyAssignment[]>("admin_kiosko_staff_policy_assignments", { method: "GET", query: `?select=*${filter}&order=delivered_at.desc` });
}

export async function patchPolicyAssignment(id: string, payload: Partial<StaffPolicyAssignment>) {
  const result = await phase4Request<StaffPolicyAssignment[]>("admin_kiosko_staff_policy_assignments", { method: "PATCH", query: `?id=eq.${encodeURIComponent(id)}`, body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listTrainingModules() {
  return phase4Request<StaffTrainingModule[]>("admin_kiosko_staff_training_modules", { method: "GET", query: "?select=*&order=created_at.desc" });
}

export async function createTrainingAttempt(input: {
  organization_id: string;
  module_id: string;
  employee_id: string;
  module_version: number;
  answers: Record<string, unknown>;
  score: number;
  passed: boolean;
}) {
  const result = await phase4Request("admin_kiosko_staff_training_attempts", { method: "POST", body: JSON.stringify(input), headers: { Prefer: "return=representation" } });
  return result;
}

export async function listPrlRecords(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase4Request<StaffPrlRecord[]>("admin_kiosko_staff_prl_records", { method: "GET", query: `?select=*${filter}&order=created_at.desc` });
}

export async function listComplianceAlerts() {
  return phase4Request<StaffComplianceAlert[]>("admin_kiosko_staff_compliance_alerts", { method: "GET", query: "?select=*&order=severity.desc,due_at.asc" });
}

export async function createComplianceAlert(input: Partial<StaffComplianceAlert> & { organization_id: string; category: string; title: string }) {
  const result = await phase4Request<StaffComplianceAlert[]>("admin_kiosko_staff_compliance_alerts", { method: "POST", body: JSON.stringify(input), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
