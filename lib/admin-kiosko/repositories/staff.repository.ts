import { buildAuditEvent, calculateWorkedSeconds } from "../staff/time";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type StaffLocation = {
  id: string;
  organization_id?: string | null;
  name: string;
  slug: string;
  timezone: string;
  address: string | null;
  active: boolean;
  allows_kiosk_clock: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffEmployeeStatus = "draft" | "active" | "inactive" | "terminated";
export type StaffEmployee = {
  id: string;
  organization_id?: string | null;
  auth_user_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: StaffEmployeeStatus;
  hire_date: string | null;
  termination_date: string | null;
  primary_location_id: string | null;
  manager_employee_id: string | null;
  pin_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffContract = {
  id: string;
  organization_id?: string | null;
  employee_id: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  weekly_minutes: number;
  annual_minutes: number | null;
  workday_distribution: Record<string, unknown>;
  job_title: string | null;
  collective_agreement: string | null;
  salary_reference: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffShiftTemplate = {
  id: string;
  location_id: string;
  name: string;
  start_time: string;
  end_time: string;
  default_break_minutes: number;
  color_key: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffShift = {
  id: string;
  organization_id?: string | null;
  location_id: string;
  template_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published" | "cancelled" | "completed";
  published_at: string | null;
  published_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffShiftAssignment = {
  id: string;
  shift_id: string;
  employee_id: string;
  role_name: string | null;
  assignment_status: "assigned" | "acknowledged" | "declined" | "removed";
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffWorkEntry = {
  id: string;
  organization_id?: string | null;
  employee_id: string;
  shift_id: string | null;
  location_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_source: "employee_web" | "shared_kiosk" | "manager_assisted" | "system_import";
  clock_out_source: "employee_web" | "shared_kiosk" | "manager_assisted" | "system_import" | null;
  clock_in_device: string | null;
  clock_out_device: string | null;
  worked_seconds: number | null;
  status: "open" | "completed" | "pending_review" | "approved" | "locked";
  created_at: string;
  updated_at: string;
};

export type StaffBreakEntry = {
  id: string;
  work_entry_id: string;
  started_at: string;
  ended_at: string | null;
  break_type: string;
  paid: boolean;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
};

export type StaffTimeIncident = {
  id: string;
  employee_id: string;
  work_entry_id: string | null;
  shift_id: string | null;
  incident_type: "missed_clock_in" | "missed_clock_out" | "wrong_time" | "wrong_location" | "forgotten_break" | "other";
  description: string;
  status: "open" | "approved" | "rejected" | "cancelled";
  requested_change: Record<string, unknown>;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffAuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_employee_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type StaffShiftWithAssignment = StaffShift & {
  assignment_id?: string;
  employee_id?: string;
  role_name?: string | null;
  employee?: StaffEmployee | null;
  location?: StaffLocation | null;
};

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    return { ok: false as const, error: "Supabase no está configurado." };
  }
  return { ok: true as const, config };
}

async function staffRequest<T>(table: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
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
    const responseText = await response.text();
    if (!response.ok) {
      let error = responseText || `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(responseText) as { message?: string; details?: string; hint?: string; code?: string };
        error = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(" · ");
      } catch {
        // Keep raw response.
      }
      return { ok: false, error };
    }
    if (response.status === 204 || !responseText) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

function orderByDateRange(from?: string, to?: string) {
  const parts = ["select=*"];
  if (from) parts.push(`shift_date=gte.${encodeURIComponent(from)}`);
  if (to) parts.push(`shift_date=lte.${encodeURIComponent(to)}`);
  parts.push("order=shift_date.asc,starts_at.asc");
  return `?${parts.join("&")}`;
}

export async function listStaffLocations() {
  return staffRequest<StaffLocation[]>("admin_kiosko_staff_locations", {
    method: "GET",
    query: "?select=*&order=name.asc",
  });
}

export async function listStaffEmployees() {
  return staffRequest<StaffEmployee[]>("admin_kiosko_staff_employees", {
    method: "GET",
    query: "?select=*&order=display_name.asc",
  });
}

export async function getStaffEmployeeById(id: string): Promise<DbResult<StaffEmployee | null>> {
  const result = await staffRequest<StaffEmployee[]>("admin_kiosko_staff_employees", {
    method: "GET",
    query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function getStaffEmployeeByAuthUserId(authUserId: string): Promise<DbResult<StaffEmployee | null>> {
  const result = await staffRequest<StaffEmployee[]>("admin_kiosko_staff_employees", {
    method: "GET",
    query: `?select=*&auth_user_id=eq.${encodeURIComponent(authUserId)}&status=eq.active&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function createStaffEmployee(input: {
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  status?: StaffEmployee["status"];
  hireDate?: string | null;
  primaryLocationId?: string | null;
  authUserId?: string | null;
}) {
  const result = await staffRequest<StaffEmployee[]>("admin_kiosko_staff_employees", {
    method: "POST",
    body: JSON.stringify({
      employee_code: input.employeeCode.trim(),
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      display_name: input.displayName.trim(),
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      status: input.status || "active",
      hire_date: input.hireDate || null,
      primary_location_id: input.primaryLocationId || null,
      auth_user_id: input.authUserId || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listStaffContracts(employeeId?: string) {
  const query = employeeId
    ? `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&order=start_date.desc`
    : "?select=*&order=start_date.desc";
  return staffRequest<StaffContract[]>("admin_kiosko_staff_contracts", { method: "GET", query });
}

export async function createStaffContract(input: {
  employeeId: string;
  contractType: string;
  startDate: string;
  endDate?: string | null;
  weeklyMinutes: number;
  annualMinutes?: number | null;
  workdayDistribution?: Record<string, unknown>;
  jobTitle?: string | null;
  collectiveAgreement?: string | null;
  salaryReference?: string | null;
}) {
  const result = await staffRequest<StaffContract[]>("admin_kiosko_staff_contracts", {
    method: "POST",
    body: JSON.stringify({
      employee_id: input.employeeId,
      contract_type: input.contractType,
      start_date: input.startDate,
      end_date: input.endDate || null,
      weekly_minutes: input.weeklyMinutes,
      annual_minutes: input.annualMinutes || null,
      workday_distribution: input.workdayDistribution || {},
      job_title: input.jobTitle || null,
      collective_agreement: input.collectiveAgreement || null,
      salary_reference: input.salaryReference || null,
      active: true,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listStaffShiftTemplates() {
  return staffRequest<StaffShiftTemplate[]>("admin_kiosko_staff_shift_templates", {
    method: "GET",
    query: "?select=*&active=eq.true&order=name.asc",
  });
}

export async function listStaffShifts(from?: string, to?: string) {
  return staffRequest<StaffShift[]>("admin_kiosko_staff_shifts", {
    method: "GET",
    query: orderByDateRange(from, to),
  });
}

export async function listStaffAssignments() {
  return staffRequest<StaffShiftAssignment[]>("admin_kiosko_staff_shift_assignments", {
    method: "GET",
    query: "?select=*&order=created_at.desc",
  });
}

export async function listPublishedShiftsForEmployee(employeeId: string) {
  const assignments = await staffRequest<StaffShiftAssignment[]>("admin_kiosko_staff_shift_assignments", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&assignment_status=in.(assigned,acknowledged)`,
  });
  if (!assignments.ok) return assignments;
  if (!assignments.data.length) return { ok: true as const, data: [] as StaffShift[] };

  const shiftIds = assignments.data.map((assignment) => assignment.shift_id).join(",");
  return staffRequest<StaffShift[]>("admin_kiosko_staff_shifts", {
    method: "GET",
    query: `?select=*&id=in.(${shiftIds})&status=eq.published&order=starts_at.asc`,
  });
}

export async function createStaffShift(input: {
  locationId: string;
  employeeId?: string | null;
  templateId?: string | null;
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
  roleName?: string | null;
}) {
  const shiftResult = await staffRequest<StaffShift[]>("admin_kiosko_staff_shifts", {
    method: "POST",
    body: JSON.stringify({
      location_id: input.locationId,
      template_id: input.templateId || null,
      shift_date: input.shiftDate,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: "draft",
      notes: input.notes || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!shiftResult.ok) return shiftResult;
  const shift = shiftResult.data[0];

  if (input.employeeId) {
    const assignment = await createStaffShiftAssignment({
      shiftId: shift.id,
      employeeId: input.employeeId,
      roleName: input.roleName || null,
    });
    if (!assignment.ok) return assignment;
  }

  return { ok: true as const, data: shift };
}

export async function createStaffShiftAssignment(input: { shiftId: string; employeeId: string; roleName?: string | null }) {
  const result = await staffRequest<StaffShiftAssignment[]>("admin_kiosko_staff_shift_assignments", {
    method: "POST",
    body: JSON.stringify({
      shift_id: input.shiftId,
      employee_id: input.employeeId,
      role_name: input.roleName || null,
      assignment_status: "assigned",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchStaffShift(id: string, payload: Partial<StaffShift>) {
  const result = await staffRequest<StaffShift[]>("admin_kiosko_staff_shifts", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function getOpenWorkEntry(employeeId: string): Promise<DbResult<StaffWorkEntry | null>> {
  const result = await staffRequest<StaffWorkEntry[]>("admin_kiosko_staff_work_entries", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&status=eq.open&clock_out_at=is.null&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function listWorkEntriesForEmployee(employeeId: string) {
  return staffRequest<StaffWorkEntry[]>("admin_kiosko_staff_work_entries", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&order=clock_in_at.desc&limit=90`,
  });
}

export async function listStaffWorkEntries(limit = 200) {
  return staffRequest<StaffWorkEntry[]>("admin_kiosko_staff_work_entries", {
    method: "GET",
    query: `?select=*&order=clock_in_at.desc&limit=${Math.max(1, Math.min(limit, 500))}`,
  });
}

export async function createStaffWorkEntry(input: {
  employeeId: string;
  shiftId?: string | null;
  locationId?: string | null;
  source: StaffWorkEntry["clock_in_source"];
  device?: string | null;
  status?: StaffWorkEntry["status"];
}) {
  const result = await staffRequest<StaffWorkEntry[]>("admin_kiosko_staff_work_entries", {
    method: "POST",
    body: JSON.stringify({
      employee_id: input.employeeId,
      shift_id: input.shiftId || null,
      location_id: input.locationId || null,
      clock_in_at: new Date().toISOString(),
      clock_in_source: input.source,
      clock_in_device: input.device || null,
      status: input.status || "open",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchStaffWorkEntry(id: string, payload: Partial<StaffWorkEntry>) {
  const result = await staffRequest<StaffWorkEntry[]>("admin_kiosko_staff_work_entries", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listBreaksForWorkEntry(workEntryId: string) {
  return staffRequest<StaffBreakEntry[]>("admin_kiosko_staff_break_entries", {
    method: "GET",
    query: `?select=*&work_entry_id=eq.${encodeURIComponent(workEntryId)}&order=started_at.asc`,
  });
}

export async function createStaffBreakEntry(input: { workEntryId: string; breakType?: string; paid?: boolean }) {
  const result = await staffRequest<StaffBreakEntry[]>("admin_kiosko_staff_break_entries", {
    method: "POST",
    body: JSON.stringify({
      work_entry_id: input.workEntryId,
      started_at: new Date().toISOString(),
      break_type: input.breakType || "rest",
      paid: input.paid || false,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchStaffBreakEntry(id: string, payload: Partial<StaffBreakEntry>) {
  const result = await staffRequest<StaffBreakEntry[]>("admin_kiosko_staff_break_entries", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listOpenBreaks(workEntryId: string): Promise<DbResult<StaffBreakEntry[]>> {
  return staffRequest<StaffBreakEntry[]>("admin_kiosko_staff_break_entries", {
    method: "GET",
    query: `?select=*&work_entry_id=eq.${encodeURIComponent(workEntryId)}&ended_at=is.null`,
  });
}

export async function createStaffTimeIncident(input: {
  employeeId: string;
  workEntryId?: string | null;
  shiftId?: string | null;
  incidentType: StaffTimeIncident["incident_type"];
  description: string;
  requestedChange?: Record<string, unknown>;
}) {
  const result = await staffRequest<StaffTimeIncident[]>("admin_kiosko_staff_time_incidents", {
    method: "POST",
    body: JSON.stringify({
      employee_id: input.employeeId,
      work_entry_id: input.workEntryId || null,
      shift_id: input.shiftId || null,
      incident_type: input.incidentType,
      description: input.description.trim(),
      status: "open",
      requested_change: input.requestedChange || {},
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listTimeIncidentsForEmployee(employeeId: string) {
  return staffRequest<StaffTimeIncident[]>("admin_kiosko_staff_time_incidents", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&order=created_at.desc`,
  });
}

export async function listStaffTimeIncidents() {
  return staffRequest<StaffTimeIncident[]>("admin_kiosko_staff_time_incidents", {
    method: "GET",
    query: "?select=*&order=created_at.desc&limit=200",
  });
}

export async function patchStaffTimeIncident(id: string, payload: Partial<StaffTimeIncident>) {
  const result = await staffRequest<StaffTimeIncident[]>("admin_kiosko_staff_time_incidents", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listStaffAuditLogs(limit = 100) {
  return staffRequest<StaffAuditLog[]>("admin_kiosko_staff_audit_log", {
    method: "GET",
    query: `?select=*&order=created_at.desc&limit=${Math.max(1, Math.min(limit, 500))}`,
  });
}

export async function writeStaffAuditLog(input: Parameters<typeof buildAuditEvent>[0]) {
  return staffRequest("admin_kiosko_staff_audit_log", {
    method: "POST",
    body: JSON.stringify(buildAuditEvent(input)),
    headers: { Prefer: "return=minimal" },
  });
}

export function calculateEntryWorkedSeconds(entry: StaffWorkEntry, breaks: StaffBreakEntry[]) {
  return calculateWorkedSeconds({
    clockInAt: entry.clock_in_at,
    clockOutAt: entry.clock_out_at,
    breaks: breaks.map((item) => ({
      startedAt: item.started_at,
      endedAt: item.ended_at,
      paid: item.paid,
    })),
  });
}
