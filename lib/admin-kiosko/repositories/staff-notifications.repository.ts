import { phase3Request } from "./staff-availability.repository";

export type StaffNotification = {
  id: string;
  organization_id: string;
  recipient_employee_id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  read: boolean;
  read_at: string | null;
  archived: boolean;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

export type ReadConfirmation = {
  id: string;
  organization_id: string;
  employee_id: string;
  entity_type: string;
  entity_id: string;
  entity_version: number;
  delivered_at: string;
  read_at: string | null;
  explicitly_confirmed: boolean;
  confirmed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  confirmed_text: string | null;
  created_at: string;
  updated_at: string;
};

export async function listNotifications(employeeId?: string) {
  const filter = employeeId ? `&recipient_employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase3Request<StaffNotification[]>("admin_kiosko_staff_notifications", {
    method: "GET",
    query: `?select=*${filter}&archived=eq.false&order=created_at.desc`,
  });
}

export async function createNotification(input: Omit<Partial<StaffNotification>, "id" | "created_at" | "updated_at"> & {
  organization_id: string;
  recipient_employee_id: string;
  notification_type: string;
  title: string;
  message: string;
  idempotency_key: string;
}) {
  const result = await phase3Request<StaffNotification[]>("admin_kiosko_staff_notifications", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] || null };
}

export async function markNotificationRead(id: string, employeeId: string) {
  const result = await phase3Request<StaffNotification[]>("admin_kiosko_staff_notifications", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}&recipient_employee_id=eq.${encodeURIComponent(employeeId)}`,
    body: JSON.stringify({ read: true, read_at: new Date().toISOString() }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] || null };
}

export async function markAllNotificationsRead(employeeId: string) {
  return phase3Request<StaffNotification[]>("admin_kiosko_staff_notifications", {
    method: "PATCH",
    query: `?recipient_employee_id=eq.${encodeURIComponent(employeeId)}&read=eq.false`,
    body: JSON.stringify({ read: true, read_at: new Date().toISOString() }),
    headers: { Prefer: "return=representation" },
  });
}

export async function createReadConfirmation(input: {
  organizationId: string;
  employeeId: string;
  entityType: string;
  entityId: string;
  entityVersion?: number;
  explicitlyConfirmed?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  confirmedText?: string | null;
}) {
  const result = await phase3Request<ReadConfirmation[]>("admin_kiosko_staff_read_confirmations", {
    method: "POST",
    query: "?on_conflict=employee_id,entity_type,entity_id,entity_version",
    body: JSON.stringify({
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_version: input.entityVersion || 1,
      read_at: new Date().toISOString(),
      explicitly_confirmed: Boolean(input.explicitlyConfirmed),
      confirmed_at: input.explicitlyConfirmed ? new Date().toISOString() : null,
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
      confirmed_text: input.confirmedText || null,
    }),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
