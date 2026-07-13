type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type RecurringAvailability = {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  weekday: number;
  availability_type: "available" | "unavailable" | "positive_preference" | "negative_preference";
  starts_at: string | null;
  ends_at: string | null;
  full_day: boolean;
  notes: string | null;
  valid_from: string;
  valid_until: string | null;
  priority: number;
  origin: "employee" | "admin" | "contract" | "import";
  status: "draft" | "active" | "archived";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityExceptionRecord = {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  starts_at: string;
  ends_at: string;
  availability_type: "available" | "unavailable";
  reason: string | null;
  notes: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled";
  requested_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkPreference = {
  employee_id: string;
  organization_id: string;
  preferred_shift_parts: string[];
  preferred_free_weekdays: number[];
  preferred_location_id: string | null;
  preferred_roles: string[];
  avoid_split_shifts: boolean;
  preferred_max_consecutive_days: number | null;
  accepts_additional_hours: boolean;
  accepts_urgent_coverage: boolean;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OperationalRule = {
  id: string;
  organization_id: string;
  location_id: string | null;
  name: string;
  min_rest_minutes: number;
  max_daily_minutes: number | null;
  max_weekly_minutes: number | null;
  max_consecutive_days: number | null;
  overlap_tolerance_minutes: number;
  min_notice_minutes: number;
  additional_hours_limit_minutes: number | null;
  week_starts_on: number;
  split_shift_alert_minutes: number | null;
  active: boolean;
  created_by: string | null;
  updated_by: string | null;
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

export async function phase3Request<T>(table: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
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

export async function listRecurringAvailability(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase3Request<RecurringAvailability[]>("admin_kiosko_staff_recurring_availability", {
    method: "GET",
    query: `?select=*${filter}&order=weekday.asc,starts_at.asc`,
  });
}

export async function upsertRecurringAvailability(input: {
  organizationId: string;
  employeeId: string;
  locationId?: string | null;
  weekday: number;
  availabilityType: RecurringAvailability["availability_type"];
  startsAt?: string | null;
  endsAt?: string | null;
  fullDay?: boolean;
  notes?: string | null;
  validFrom: string;
  validUntil?: string | null;
  priority?: number;
  origin?: RecurringAvailability["origin"];
  actorUserId?: string | null;
}) {
  const result = await phase3Request<RecurringAvailability[]>("admin_kiosko_staff_recurring_availability", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      location_id: input.locationId || null,
      weekday: input.weekday,
      availability_type: input.availabilityType,
      starts_at: input.fullDay ? null : input.startsAt || null,
      ends_at: input.fullDay ? null : input.endsAt || null,
      full_day: Boolean(input.fullDay),
      notes: input.notes || null,
      valid_from: input.validFrom,
      valid_until: input.validUntil || null,
      priority: input.priority || 0,
      origin: input.origin || "employee",
      status: "active",
      created_by: input.actorUserId || null,
      updated_by: input.actorUserId || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listAvailabilityExceptions(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase3Request<AvailabilityExceptionRecord[]>("admin_kiosko_staff_availability_exceptions", {
    method: "GET",
    query: `?select=*${filter}&order=starts_at.desc`,
  });
}

export async function createAvailabilityException(input: {
  organizationId: string;
  employeeId: string;
  locationId?: string | null;
  startsAt: string;
  endsAt: string;
  availabilityType: AvailabilityExceptionRecord["availability_type"];
  reason?: string | null;
  notes?: string | null;
  status?: AvailabilityExceptionRecord["status"];
  actorUserId?: string | null;
}) {
  const result = await phase3Request<AvailabilityExceptionRecord[]>("admin_kiosko_staff_availability_exceptions", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      location_id: input.locationId || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      availability_type: input.availabilityType,
      reason: input.reason || null,
      notes: input.notes || null,
      status: input.status || "submitted",
      requested_by: input.actorUserId || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function patchAvailabilityException(id: string, payload: Partial<AvailabilityExceptionRecord>) {
  const result = await phase3Request<AvailabilityExceptionRecord[]>("admin_kiosko_staff_availability_exceptions", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function getWorkPreference(employeeId: string) {
  return first(await phase3Request<WorkPreference[]>("admin_kiosko_staff_work_preferences", {
    method: "GET",
    query: `?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&limit=1`,
  }));
}

export async function upsertWorkPreference(input: Partial<WorkPreference> & { employee_id: string; organization_id: string }) {
  const result = await phase3Request<WorkPreference[]>("admin_kiosko_staff_work_preferences", {
    method: "POST",
    query: "?on_conflict=employee_id",
    body: JSON.stringify(input),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listOperationalRules() {
  return phase3Request<OperationalRule[]>("admin_kiosko_staff_operational_rules", {
    method: "GET",
    query: "?select=*&active=eq.true&order=created_at.desc",
  });
}
