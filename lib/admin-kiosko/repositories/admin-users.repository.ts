type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type AdminUserRole = "owner" | "employee";
export type AdminUserStatus = "active" | "disabled";

export type AdminUser = {
  id: string;
  email: string | null;
  username: string;
  display_name: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  password_hash: string | null;
  pin_hash: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  created_by: string | null;
  disabled_at: string | null;
};

export type AdminAuditLog = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
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
  if (!config.url || !config.serviceRoleKey) {
    return { ok: false as const, error: "Supabase no está configurado." };
  }
  return { ok: true as const, config };
}

async function adminRequest<T>(table: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
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
        // Keep raw Supabase error.
      }
      return { ok: false, error };
    }

    if (response.status === 204 || !responseText) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

function selectUserQuery(query: string) {
  return `?select=*&${query}`;
}

export async function listAdminUsers(): Promise<DbResult<AdminUser[]>> {
  return adminRequest<AdminUser[]>("admin_users", {
    method: "GET",
    query: "?select=*&order=created_at.desc",
  });
}

export async function getAdminUserById(id: string): Promise<DbResult<AdminUser | null>> {
  const result = await adminRequest<AdminUser[]>("admin_users", {
    method: "GET",
    query: selectUserQuery(`id=eq.${encodeURIComponent(id)}&limit=1`),
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function findAdminUserForLogin(identifier: string): Promise<DbResult<AdminUser | null>> {
  const value = identifier.trim().toLowerCase();
  if (!value) return { ok: true, data: null };

  const result = await adminRequest<AdminUser[]>("admin_users", {
    method: "GET",
    query: `?select=*&or=(username.eq.${encodeURIComponent(value)},email.eq.${encodeURIComponent(value)})&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function createAdminUser(input: {
  email?: string | null;
  username: string;
  displayName: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
  passwordHash?: string | null;
  createdBy?: string | null;
}): Promise<DbResult<AdminUser>> {
  const result = await adminRequest<AdminUser[]>("admin_users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email?.trim().toLowerCase() || null,
      username: input.username.trim().toLowerCase(),
      display_name: input.displayName.trim(),
      role: input.role,
      status: input.status || "active",
      password_hash: input.passwordHash || null,
      created_by: input.createdBy || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] };
}

export async function updateAdminUser(input: {
  id: string;
  email?: string | null;
  username?: string;
  displayName?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  passwordHash?: string | null;
}): Promise<DbResult<AdminUser>> {
  const payload: Record<string, unknown> = {};
  if (input.email !== undefined) payload.email = input.email?.trim().toLowerCase() || null;
  if (input.username !== undefined) payload.username = input.username.trim().toLowerCase();
  if (input.displayName !== undefined) payload.display_name = input.displayName.trim();
  if (input.role !== undefined) payload.role = input.role;
  if (input.passwordHash !== undefined) payload.password_hash = input.passwordHash;
  if (input.status !== undefined) {
    payload.status = input.status;
    payload.disabled_at = input.status === "disabled" ? new Date().toISOString() : null;
  }

  const result = await adminRequest<AdminUser[]>("admin_users", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(input.id)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] };
}

export async function updateAdminUserLastLogin(id: string): Promise<DbResult> {
  return adminRequest("admin_users", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify({ last_login_at: new Date().toISOString() }),
    headers: { Prefer: "return=minimal" },
  });
}

export async function listAdminAuditLogs(limit = 80): Promise<DbResult<AdminAuditLog[]>> {
  return adminRequest<AdminAuditLog[]>("admin_audit_log", {
    method: "GET",
    query: `?select=*&order=created_at.desc&limit=${limit}`,
  });
}

export async function writeAdminAuditLog(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<DbResult> {
  return adminRequest("admin_audit_log", {
    method: "POST",
    body: JSON.stringify({
      actor_user_id: input.actorUserId || null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      metadata: input.metadata || {},
    }),
    headers: { Prefer: "return=minimal" },
  });
}
