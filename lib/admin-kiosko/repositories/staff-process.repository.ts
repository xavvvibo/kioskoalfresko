type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function getSupabaseConfig() {
  return { url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "", serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "" };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return { ok: false as const, error: "Supabase no está configurado." };
  return { ok: true as const, config };
}

export async function phase4Request<T>(table: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
  const configResult = assertSupabaseConfig();
  if (!configResult.ok) return configResult;
  try {
    const response = await fetch(`${configResult.config.url}/rest/v1/${table}${init.query || ""}`, {
      ...init,
      headers: {
        apikey: configResult.config.serviceRoleKey,
        Authorization: `Bearer ${configResult.config.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      let error = text || `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text) as { message?: string; details?: string; hint?: string; code?: string };
        error = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(" · ");
      } catch {}
      return { ok: false, error };
    }
    if (response.status === 204 || !text) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(text) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

export type StaffProcessTemplate = {
  id: string;
  organization_id: string;
  location_id: string | null;
  process_type: "onboarding" | "offboarding";
  name: string;
  position: string | null;
  role_name: string | null;
  contract_type: string | null;
  department: string | null;
  exit_reason: string | null;
  version: number;
  active: boolean;
  status: "draft" | "active" | "archived";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffProcessTemplateTask = {
  id: string;
  template_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  task_type: string;
  sort_order: number;
  responsible_role: string | null;
  due_offset_days: number;
  mandatory: boolean;
  blocking: boolean;
  requires_evidence: boolean;
  requires_document: boolean;
  requires_signature: boolean;
  requires_approval: boolean;
  visible_to_employee: boolean;
  instructions: string | null;
  expires_after_days: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StaffProcess = {
  id: string;
  organization_id: string;
  location_id: string | null;
  employee_id: string;
  process_type: "onboarding" | "offboarding";
  position: string | null;
  role_name: string | null;
  manager_user_id: string | null;
  manager_employee_id: string | null;
  planned_date: string | null;
  effective_date: string | null;
  template_id: string | null;
  template_version: number | null;
  status: "draft" | "planned" | "in_progress" | "blocked" | "ready" | "completed" | "cancelled";
  completion_percent: number;
  blockers: Array<Record<string, unknown>>;
  notes: string | null;
  exit_reason: string | null;
  portal_access_until: string | null;
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffProcessTask = {
  id: string;
  process_id: string;
  organization_id: string;
  employee_id: string;
  template_task_id: string | null;
  template_version: number | null;
  title: string;
  description: string | null;
  task_type: string;
  responsible_user_id: string | null;
  due_at: string | null;
  status: "pending" | "available" | "in_progress" | "waiting_employee" | "waiting_manager" | "blocked" | "completed" | "waived" | "cancelled" | "expired";
  result: string | null;
  evidence: Record<string, unknown>;
  document_id: string | null;
  signature_id: string | null;
  training_assignment_id: string | null;
  equipment_assignment_id: string | null;
  checklist_run_id: string | null;
  comments: string | null;
  mandatory: boolean;
  blocking: boolean;
  requires_evidence: boolean;
  requires_document: boolean;
  requires_signature: boolean;
  requires_approval: boolean;
  visible_to_employee: boolean;
  completed_by: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  history: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
};

export async function listProcessTemplates(processType?: "onboarding" | "offboarding") {
  const filter = processType ? `&process_type=eq.${processType}` : "";
  return phase4Request<StaffProcessTemplate[]>("admin_kiosko_staff_process_templates", { method: "GET", query: `?select=*${filter}&order=created_at.desc` });
}

export async function listTemplateTasks(templateId: string) {
  return phase4Request<StaffProcessTemplateTask[]>("admin_kiosko_staff_process_template_tasks", { method: "GET", query: `?select=*&template_id=eq.${encodeURIComponent(templateId)}&order=sort_order.asc` });
}

export async function listStaffProcesses(processType?: "onboarding" | "offboarding", employeeId?: string) {
  const filters = [processType ? `process_type=eq.${processType}` : "", employeeId ? `employee_id=eq.${encodeURIComponent(employeeId)}` : ""].filter(Boolean).join("&");
  return phase4Request<StaffProcess[]>("admin_kiosko_staff_processes", { method: "GET", query: `?select=*${filters ? `&${filters}` : ""}&order=created_at.desc` });
}

export async function getStaffProcessById(id: string) {
  const result = await phase4Request<StaffProcess[]>("admin_kiosko_staff_processes", { method: "GET", query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] || null };
}

export async function listProcessTasks(processId?: string, employeeId?: string) {
  const filters = [processId ? `process_id=eq.${encodeURIComponent(processId)}` : "", employeeId ? `employee_id=eq.${encodeURIComponent(employeeId)}` : ""].filter(Boolean).join("&");
  return phase4Request<StaffProcessTask[]>("admin_kiosko_staff_process_tasks", { method: "GET", query: `?select=*${filters ? `&${filters}` : ""}&order=due_at.asc` });
}

export async function createStaffProcess(input: Partial<StaffProcess> & { organization_id: string; employee_id: string; process_type: StaffProcess["process_type"] }) {
  const result = await phase4Request<StaffProcess[]>("admin_kiosko_staff_processes", { method: "POST", body: JSON.stringify(input), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function createProcessTasks(tasks: Array<Partial<StaffProcessTask> & { process_id: string; organization_id: string; employee_id: string; title: string; task_type: string }>) {
  return phase4Request<StaffProcessTask[]>("admin_kiosko_staff_process_tasks", { method: "POST", body: JSON.stringify(tasks), headers: { Prefer: "return=representation" } });
}

export async function patchStaffProcess(id: string, payload: Partial<StaffProcess>) {
  const result = await phase4Request<StaffProcess[]>("admin_kiosko_staff_processes", { method: "PATCH", query: `?id=eq.${encodeURIComponent(id)}`, body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchProcessTask(id: string, payload: Partial<StaffProcessTask>) {
  const result = await phase4Request<StaffProcessTask[]>("admin_kiosko_staff_process_tasks", { method: "PATCH", query: `?id=eq.${encodeURIComponent(id)}`, body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
