import {
  createNotification,
  createReadConfirmation,
  markAllNotificationsRead,
  markNotificationRead,
} from "../repositories/staff-notifications.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { buildNotificationIdempotencyKey, prepareNotificationMetadata, type StaffNotificationType } from "./notification-rules";

export async function notifyEmployee(input: {
  actorUserId: string | null;
  organizationId: string;
  recipientEmployeeId: string;
  type: StaffNotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
  version?: number | null;
}) {
  const notification = await createNotification({
    organization_id: input.organizationId,
    recipient_employee_id: input.recipientEmployeeId,
    notification_type: input.type,
    title: input.title,
    message: input.message,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    priority: input.priority || "normal",
    expires_at: input.expiresAt || null,
    metadata: prepareNotificationMetadata(input.metadata || {}),
    created_by: input.actorUserId,
    idempotency_key: buildNotificationIdempotencyKey({
      recipientEmployeeId: input.recipientEmployeeId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      version: input.version,
    }),
  });
  if (!notification.ok) return notification;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.recipientEmployeeId,
    entityType: "staff_notification",
    entityId: notification.data?.id || null,
    action: "notification.create",
    afterData: { type: input.type, entity_type: input.entityType || null },
    metadata: prepareNotificationMetadata(input.metadata || {}),
  });
  return notification;
}

export async function markStaffNotificationRead(input: { actorUserId: string | null; employeeId: string; notificationId: string }) {
  const notification = await markNotificationRead(input.notificationId, input.employeeId);
  if (!notification.ok) return notification;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_notification",
    entityId: input.notificationId,
    action: "notification.read",
    afterData: { read: true },
    metadata: {},
  });
  return notification;
}

export async function markEveryStaffNotificationRead(input: { actorUserId: string | null; employeeId: string }) {
  const notifications = await markAllNotificationsRead(input.employeeId);
  if (!notifications.ok) return notifications;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_notification",
    entityId: input.employeeId,
    action: "notification.read_all",
    afterData: { count: notifications.data.length },
    metadata: {},
  });
  return notifications;
}

export async function confirmInternalRead(input: {
  actorUserId: string | null;
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
  const confirmation = await createReadConfirmation(input);
  if (!confirmation.ok) return confirmation;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_read_confirmation",
    entityId: confirmation.data.id,
    action: input.explicitlyConfirmed ? "read_confirmation.confirm" : "read_confirmation.read",
    afterData: { entity_type: input.entityType, entity_id: input.entityId, entity_version: input.entityVersion || 1 },
    metadata: prepareNotificationMetadata({ explicit: Boolean(input.explicitlyConfirmed) }),
  });
  return confirmation;
}
