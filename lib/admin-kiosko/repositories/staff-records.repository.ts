type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type StaffOrganization = {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  tax_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffPrivateProfile = {
  employee_id: string;
  organization_id: string | null;
  preferred_name: string | null;
  photo_path: string | null;
  dni_nie: string | null;
  social_security_number: string | null;
  birth_date: string | null;
  address: string | null;
  postal_code: string | null;
  municipality: string | null;
  province: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  iban: string | null;
  shirt_size: string | null;
  shoe_size: string | null;
  internal_notes: string | null;
  seniority_date: string | null;
  termination_reason: string | null;
  professional_group: string | null;
  professional_category: string | null;
  department: string | null;
  workday_type: string | null;
  salary_gross: string | null;
  salary_periodicity: string | null;
  estimated_company_cost: string | null;
  probation_period: string | null;
  probation_ends_at: string | null;
  labor_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffDocument = {
  id: string;
  organization_id: string;
  employee_id: string;
  category: string;
  visible_name: string;
  original_name: string;
  private_path: string;
  mime_type: string;
  size_bytes: number;
  document_date: string | null;
  expires_at: string | null;
  status: "active" | "archived" | "replaced" | "expired";
  notes: string | null;
  uploaded_by: string | null;
  file_hash: string;
  version: number;
  replaces_document_id: string | null;
  visible_to_employee: boolean;
  requires_signature: boolean;
  signature_status: "not_required" | "pending" | "signed" | "invalidated";
  created_at: string;
  updated_at: string;
};

export type StaffTrainingCatalogItem = {
  id: string;
  organization_id: string | null;
  category: string;
  name: string;
  provider: string | null;
  default_duration_minutes: number | null;
  validity_months: number | null;
  mandatory: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffTrainingAssignment = {
  id: string;
  organization_id: string;
  employee_id: string;
  training_id: string | null;
  status: "pending" | "in_progress" | "completed" | "expired" | "cancelled";
  assigned_at: string;
  completed_at: string | null;
  expires_at: string | null;
  provider: string | null;
  duration_minutes: number | null;
  result: string | null;
  notes: string | null;
  certificate_document_id: string | null;
  reminder_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffAbsence = {
  id: string;
  organization_id: string;
  employee_id: string;
  absence_type: string;
  status: "draft" | "requested" | "approved" | "rejected" | "cancelled";
  starts_at: string;
  ends_at: string;
  natural_days: number | null;
  estimated_working_days: number | null;
  hours: number | null;
  reason: string | null;
  notes: string | null;
  supporting_document_id: string | null;
  requested_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_reason: string | null;
  shift_impact: string | null;
  visible_to_employee: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffDisciplinaryCase = {
  id: string;
  organization_id: string;
  employee_id: string;
  case_type: string;
  title: string;
  facts: string;
  facts_date: string | null;
  opened_at: string;
  status: "draft" | "open" | "pending_allegations" | "investigation" | "resolved" | "archived";
  confidentiality_level: "restricted" | "hr" | "legal";
  instructor: string | null;
  document_ids: string[];
  allegations: string | null;
  resolution: string | null;
  resolved_at: string | null;
  visible_to_employee: boolean;
  signature_required: boolean;
  signature_received: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffSignature = {
  id: string;
  organization_id: string;
  employee_id: string;
  signer_name: string;
  signed_entity_type: string;
  signed_entity_id: string;
  document_id: string | null;
  document_version: number;
  signature_image_path: string | null;
  signature_trace: Record<string, unknown> | null;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  content_hash: string;
  signature_hash: string;
  consent_text: string;
  displayed_text: string;
  actor_user_id: string | null;
  evidence: Record<string, unknown>;
  status: "valid" | "invalidated";
  invalidated_at: string | null;
  invalidation_reason: string | null;
  created_at: string;
};

export type StaffTimelineEvent = {
  id: string;
  organization_id: string | null;
  employee_id: string;
  location_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  effective_at: string;
  registered_at: string;
  actor_user_id: string | null;
  source: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  visible_to_employee: boolean;
  severity: "info" | "warning" | "critical" | "positive";
  created_at: string;
};

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return { ok: false as const, error: "Supabase no está configurado." };
  return { ok: true as const, config };
}

async function staffRecordRequest<T>(table: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
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
      } catch {
        // Keep raw response.
      }
      return { ok: false, error };
    }
    if (response.status === 204 || !text) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(text) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

function first<T>(result: DbResult<T[]>): DbResult<T | null> {
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function listStaffOrganizations() {
  return staffRecordRequest<StaffOrganization[]>("admin_kiosko_staff_organizations", {
    method: "GET",
    query: "?select=*&order=name.asc",
  });
}

export async function getStaffPrivateProfile(employeeId: string) {
  const result = await staffRecordRequest<StaffPrivateProfile[]>("admin_kiosko_staff_employee_private_profiles", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&limit=1`,
  });
  return first(result);
}

export async function upsertStaffPrivateProfile(input: Partial<StaffPrivateProfile> & { employee_id: string }) {
  const result = await staffRecordRequest<StaffPrivateProfile[]>("admin_kiosko_staff_employee_private_profiles", {
    method: "POST",
    query: "?on_conflict=employee_id",
    body: JSON.stringify(input),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listStaffDocuments(employeeId: string, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "&visible_to_employee=eq.true";
  return staffRecordRequest<StaffDocument[]>("admin_kiosko_staff_documents", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}${privateFilter}&order=created_at.desc`,
  });
}

export async function getStaffDocumentById(id: string) {
  const result = await staffRecordRequest<StaffDocument[]>("admin_kiosko_staff_documents", {
    method: "GET",
    query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  });
  return first(result);
}

export async function createStaffDocument(input: Omit<StaffDocument, "created_at" | "updated_at" | "status" | "signature_status"> & {
  status?: StaffDocument["status"];
  signature_status?: StaffDocument["signature_status"];
}) {
  const result = await staffRecordRequest<StaffDocument[]>("admin_kiosko_staff_documents", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      status: input.status || "active",
      signature_status: input.signature_status || (input.requires_signature ? "pending" : "not_required"),
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchStaffDocument(id: string, payload: Partial<StaffDocument>) {
  const result = await staffRecordRequest<StaffDocument[]>("admin_kiosko_staff_documents", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listTrainingCatalog() {
  return staffRecordRequest<StaffTrainingCatalogItem[]>("admin_kiosko_staff_training_catalog", {
    method: "GET",
    query: "?select=*&active=eq.true&order=name.asc",
  });
}

export async function createTrainingCatalogItem(input: Partial<StaffTrainingCatalogItem> & { category: string; name: string }) {
  const result = await staffRecordRequest<StaffTrainingCatalogItem[]>("admin_kiosko_staff_training_catalog", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listTrainingAssignments(employeeId: string) {
  return staffRecordRequest<StaffTrainingAssignment[]>("admin_kiosko_staff_training_assignments", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&order=assigned_at.desc`,
  });
}

export async function createTrainingAssignment(input: Partial<StaffTrainingAssignment> & { organization_id: string; employee_id: string }) {
  const result = await staffRecordRequest<StaffTrainingAssignment[]>("admin_kiosko_staff_training_assignments", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listStaffAbsences(employeeId: string, onlyVisible = false) {
  const visibleFilter = onlyVisible ? "&visible_to_employee=eq.true" : "";
  return staffRecordRequest<StaffAbsence[]>("admin_kiosko_staff_absences", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}${visibleFilter}&order=starts_at.desc`,
  });
}

export async function createStaffAbsence(input: Partial<StaffAbsence> & { organization_id: string; employee_id: string; absence_type: string; starts_at: string; ends_at: string }) {
  const result = await staffRecordRequest<StaffAbsence[]>("admin_kiosko_staff_absences", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listDisciplinaryCases(employeeId: string, onlyVisible = false) {
  const visibleFilter = onlyVisible ? "&visible_to_employee=eq.true" : "";
  return staffRecordRequest<StaffDisciplinaryCase[]>("admin_kiosko_staff_disciplinary_cases", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}${visibleFilter}&order=opened_at.desc`,
  });
}

export async function createDisciplinaryCase(input: Partial<StaffDisciplinaryCase> & { organization_id: string; employee_id: string; case_type: string; title: string; facts: string }) {
  const result = await staffRecordRequest<StaffDisciplinaryCase[]>("admin_kiosko_staff_disciplinary_cases", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listStaffSignatures(employeeId: string) {
  return staffRecordRequest<StaffSignature[]>("admin_kiosko_staff_signatures", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&order=signed_at.desc`,
  });
}

export async function createStaffSignature(input: Omit<StaffSignature, "id" | "signed_at" | "status" | "invalidated_at" | "invalidation_reason" | "created_at">) {
  const result = await staffRecordRequest<StaffSignature[]>("admin_kiosko_staff_signatures", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listTimelineEvents(employeeId: string, onlyVisible = false) {
  const visibleFilter = onlyVisible ? "&visible_to_employee=eq.true" : "";
  return staffRecordRequest<StaffTimelineEvent[]>("admin_kiosko_staff_timeline_events", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}${visibleFilter}&order=effective_at.desc`,
  });
}

export async function createTimelineEvent(input: Omit<StaffTimelineEvent, "id" | "registered_at" | "created_at">) {
  const result = await staffRecordRequest<StaffTimelineEvent[]>("admin_kiosko_staff_timeline_events", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
