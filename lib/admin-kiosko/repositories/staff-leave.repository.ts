type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type LeavePolicy = {
  id: string;
  organization_id: string;
  location_id: string | null;
  name: string;
  absence_type: string;
  unit: "natural_days" | "working_days" | "hours";
  accrual_method: "annual" | "monthly" | "proportional" | "manual";
  annual_amount: number;
  cycle_starts_on: string;
  prorate_enabled: boolean;
  carryover_enabled: boolean;
  max_carryover: number;
  carryover_expires_on: string | null;
  negative_balance_allowed: boolean;
  negative_limit: number;
  requires_document: boolean;
  requires_approval: boolean;
  approver_count: number;
  min_notice_days: number;
  min_duration: number;
  max_duration: number | null;
  allows_half_days: boolean;
  allows_hours: boolean;
  visible_to_employee: boolean;
  active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaveBalancePeriod = {
  id: string;
  organization_id: string;
  employee_id: string;
  policy_id: string;
  period_label: string;
  starts_on: string;
  ends_on: string;
  opening_balance: number;
  accrued_amount: number;
  consumed_amount: number;
  reserved_amount: number;
  adjusted_amount: number;
  carried_over_amount: number;
  expired_amount: number;
  status: "open" | "locked" | "closed";
  locked_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaveLedgerEntry = {
  id: string;
  organization_id: string;
  employee_id: string;
  policy_id: string;
  period_id: string;
  movement_type: "accrual" | "reservation" | "consumption" | "release" | "adjustment" | "carryover" | "expiration" | "reversal";
  amount: number;
  unit: "natural_days" | "working_days" | "hours";
  effective_on: string;
  source: string;
  reference_type: string | null;
  reference_id: string | null;
  reverses_ledger_id: string | null;
  actor_user_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string;
  created_at: string;
};

export type LeaveRequest = {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  policy_id: string;
  absence_type: string;
  starts_at: string;
  ends_at: string;
  partial_mode: "full_day" | "half_day" | "hours";
  requested_amount: number;
  requested_unit: "natural_days" | "working_days" | "hours";
  reason: string | null;
  employee_notes: string | null;
  supporting_document_id: string | null;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "cancelled" | "withdrawn" | "partially_approved";
  submitted_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_reason: string | null;
  reserved_amount: number;
  consumed_amount: number;
  approved_starts_at: string | null;
  approved_ends_at: string | null;
  approved_amount: number | null;
  conflict_summary: Array<Record<string, unknown>>;
  shift_impact_summary: Array<Record<string, unknown>>;
  visible_to_employee: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaveRequestDecision = {
  id: string;
  request_id: string;
  organization_id: string;
  decision: string;
  approved_starts_at: string | null;
  approved_ends_at: string | null;
  approved_amount: number | null;
  previous_status: string | null;
  next_status: string;
  comment: string;
  actor_user_id: string | null;
  created_at: string;
};

export type ShiftAbsenceImpact = {
  id: string;
  organization_id: string;
  request_id: string;
  shift_id: string;
  employee_id: string;
  impact_type: "absence_overlap" | "coverage_needed" | "resolved";
  proposed_action: "keep_with_warning" | "unassign_employee" | "convert_to_vacant" | "reassign_employee" | "cancel_shift" | "resolve_later";
  resolution_status: "pending" | "resolved" | "ignored";
  previous_data: Record<string, unknown>;
  after_data: Record<string, unknown>;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PeriodLock = {
  id: string;
  organization_id: string;
  location_id: string | null;
  period_type: "work_entries" | "absences" | "balances" | "payroll_variables";
  starts_on: string;
  ends_on: string;
  status: "open" | "soft_locked" | "hard_locked" | "closed";
  locked_by: string | null;
  locked_at: string | null;
  reason: string | null;
  reopened_by: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PayrollVariable = {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  period_lock_id: string | null;
  period_start: string;
  period_end: string;
  concept: string;
  quantity: number;
  unit: "hours" | "days" | "events";
  source: string;
  reference_type: string | null;
  reference_id: string | null;
  status: "draft" | "reviewed" | "locked" | "exported";
  notes: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
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

async function leaveRequest<T>(table: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
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

function first<T>(result: DbResult<T[]>): DbResult<T | null> {
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function listLeavePolicies(organizationId?: string, onlyVisible = false) {
  const filters = [
    "select=*",
    "order=name.asc",
    organizationId ? `organization_id=eq.${encodeURIComponent(organizationId)}` : "",
    onlyVisible ? "visible_to_employee=eq.true" : "",
    "active=eq.true",
  ].filter(Boolean).join("&");
  return leaveRequest<LeavePolicy[]>("admin_kiosko_staff_leave_policies", { method: "GET", query: `?${filters}` });
}

export async function createLeavePolicy(input: Partial<LeavePolicy> & { organization_id: string; name: string; absence_type: string; unit: LeavePolicy["unit"]; accrual_method: LeavePolicy["accrual_method"] }) {
  const result = await leaveRequest<LeavePolicy[]>("admin_kiosko_staff_leave_policies", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function getLeavePolicyById(id: string) {
  return first(await leaveRequest<LeavePolicy[]>("admin_kiosko_staff_leave_policies", { method: "GET", query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` }));
}

export async function listLeaveBalancePeriods(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return leaveRequest<LeaveBalancePeriod[]>("admin_kiosko_staff_leave_balance_periods", { method: "GET", query: `?select=*${filter}&order=starts_on.desc` });
}

export async function getLeaveBalancePeriodById(id: string) {
  return first(await leaveRequest<LeaveBalancePeriod[]>("admin_kiosko_staff_leave_balance_periods", { method: "GET", query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` }));
}

export async function createLeaveBalancePeriod(input: Partial<LeaveBalancePeriod> & { organization_id: string; employee_id: string; policy_id: string; period_label: string; starts_on: string; ends_on: string }) {
  const result = await leaveRequest<LeaveBalancePeriod[]>("admin_kiosko_staff_leave_balance_periods", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchLeaveBalancePeriod(id: string, payload: Partial<LeaveBalancePeriod>) {
  const result = await leaveRequest<LeaveBalancePeriod[]>("admin_kiosko_staff_leave_balance_periods", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listLeaveLedgerEntries(periodId?: string) {
  const filter = periodId ? `&period_id=eq.${encodeURIComponent(periodId)}` : "";
  return leaveRequest<LeaveLedgerEntry[]>("admin_kiosko_staff_leave_balance_ledger", { method: "GET", query: `?select=*${filter}&order=created_at.desc` });
}

export async function createLeaveLedgerEntry(input: Omit<LeaveLedgerEntry, "id" | "created_at">) {
  const result = await leaveRequest<LeaveLedgerEntry[]>("admin_kiosko_staff_leave_balance_ledger", {
    method: "POST",
    query: "?on_conflict=idempotency_key",
    body: JSON.stringify(input),
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] || null };
}

export async function listLeaveRequests(filters?: { employeeId?: string; status?: string; from?: string; to?: string }) {
  const query = ["select=*", "order=starts_at.desc"];
  if (filters?.employeeId) query.push(`employee_id=eq.${encodeURIComponent(filters.employeeId)}`);
  if (filters?.status) query.push(`status=eq.${encodeURIComponent(filters.status)}`);
  if (filters?.from) query.push(`starts_at=gte.${encodeURIComponent(filters.from)}`);
  if (filters?.to) query.push(`starts_at=lte.${encodeURIComponent(filters.to)}`);
  return leaveRequest<LeaveRequest[]>("admin_kiosko_staff_leave_requests", { method: "GET", query: `?${query.join("&")}` });
}

export async function getLeaveRequestById(id: string) {
  return first(await leaveRequest<LeaveRequest[]>("admin_kiosko_staff_leave_requests", { method: "GET", query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` }));
}

export async function createLeaveRequest(input: Partial<LeaveRequest> & { organization_id: string; employee_id: string; policy_id: string; absence_type: string; starts_at: string; ends_at: string; requested_unit: LeaveRequest["requested_unit"] }) {
  const result = await leaveRequest<LeaveRequest[]>("admin_kiosko_staff_leave_requests", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchLeaveRequest(id: string, payload: Partial<LeaveRequest>) {
  const result = await leaveRequest<LeaveRequest[]>("admin_kiosko_staff_leave_requests", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function createLeaveDecision(input: Omit<LeaveRequestDecision, "id" | "created_at">) {
  const result = await leaveRequest<LeaveRequestDecision[]>("admin_kiosko_staff_leave_request_decisions", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function createShiftAbsenceImpact(input: Omit<ShiftAbsenceImpact, "id" | "created_at" | "updated_at">) {
  const result = await leaveRequest<ShiftAbsenceImpact[]>("admin_kiosko_staff_shift_absence_impacts", {
    method: "POST",
    query: "?on_conflict=request_id,shift_id",
    body: JSON.stringify(input),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listShiftAbsenceImpacts(requestId?: string) {
  const filter = requestId ? `&request_id=eq.${encodeURIComponent(requestId)}` : "";
  return leaveRequest<ShiftAbsenceImpact[]>("admin_kiosko_staff_shift_absence_impacts", { method: "GET", query: `?select=*${filter}&order=created_at.desc` });
}

export async function listPeriodLocks(filters?: { organizationId?: string; periodType?: string }) {
  const query = ["select=*", "order=starts_on.desc"];
  if (filters?.organizationId) query.push(`organization_id=eq.${encodeURIComponent(filters.organizationId)}`);
  if (filters?.periodType) query.push(`period_type=eq.${encodeURIComponent(filters.periodType)}`);
  return leaveRequest<PeriodLock[]>("admin_kiosko_staff_period_locks", { method: "GET", query: `?${query.join("&")}` });
}

export async function createPeriodLock(input: Partial<PeriodLock> & { organization_id: string; period_type: PeriodLock["period_type"]; starts_on: string; ends_on: string }) {
  const result = await leaveRequest<PeriodLock[]>("admin_kiosko_staff_period_locks", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listPayrollVariables() {
  return leaveRequest<PayrollVariable[]>("admin_kiosko_staff_payroll_variables", { method: "GET", query: "?select=*&order=period_start.desc" });
}

export async function createPayrollVariable(input: Partial<PayrollVariable> & { organization_id: string; employee_id: string; period_start: string; period_end: string; concept: string; quantity: number; unit: PayrollVariable["unit"] }) {
  const result = await leaveRequest<PayrollVariable[]>("admin_kiosko_staff_payroll_variables", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
