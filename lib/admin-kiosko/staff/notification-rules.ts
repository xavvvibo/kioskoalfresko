import { sanitizeOperationalMetadata } from "./availability-rules.ts";

export type StaffNotificationType =
  | "shift_published"
  | "shift_changed"
  | "shift_cancelled"
  | "swap_requested"
  | "swap_accepted"
  | "swap_rejected"
  | "coverage_offer"
  | "coverage_assigned"
  | "leave_approved"
  | "leave_rejected"
  | "availability_resolved"
  | "document_signature_required"
  | "period_locked"
  | "generic";

export function buildNotificationIdempotencyKey(input: {
  recipientEmployeeId: string;
  type: StaffNotificationType;
  entityType?: string | null;
  entityId?: string | null;
  version?: number | null;
}) {
  return [
    input.recipientEmployeeId,
    input.type,
    input.entityType || "none",
    input.entityId || "none",
    input.version || 1,
  ].join(":");
}

export function prepareNotificationMetadata(metadata: Record<string, unknown>) {
  return sanitizeOperationalMetadata(metadata);
}

export function canRespondToOffer(input: { offerStatus: string; response: string; deadlineAt?: string | null; alreadyResponded?: boolean }) {
  if (input.offerStatus !== "published") return { ok: false, reason: "La oferta no está publicada." };
  if (input.deadlineAt && new Date(input.deadlineAt).getTime() < Date.now()) return { ok: false, reason: "La oferta ha expirado." };
  if (input.alreadyResponded) return { ok: false, reason: "Ya existe una respuesta registrada." };
  if (!["accepted", "declined", "interested", "unavailable"].includes(input.response)) return { ok: false, reason: "Respuesta no válida." };
  return { ok: true as const };
}
