import type { DomainEventName } from "../domain/contracts";
import type { AdminKioskoDomainEvent } from "../domain/events";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type StoredDomainEvent = {
  id: string;
  event_id: string;
  event_type: DomainEventName;
  occurred_at: string;
  correlation_id: string | null;
  causation_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  source: string | null;
  trace: Record<string, unknown>;
  payload: Record<string, unknown>;
  status: "recorded" | "handled" | "failed" | "ignored";
  handler_status: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  created_at: string;
};

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
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

async function eventStoreRequest<T>(init: RequestInit & { query?: string }): Promise<DbResult<T>> {
  const configResult = assertSupabaseConfig();
  if (!configResult.ok) return configResult;

  try {
    const response = await fetch(`${configResult.config.url}/rest/v1/admin_domain_events${init.query || ""}`, {
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
        // Event Store can be absent before SQL execution. Keep the original response.
      }

      return { ok: false, error };
    }

    if (response.status === 204 || !responseText) {
      return { ok: true, data: undefined as T };
    }

    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

function toStoredPayload(event: AdminKioskoDomainEvent) {
  return {
    event_id: event.id,
    event_type: event.name,
    occurred_at: event.occurredAt,
    correlation_id: event.correlationId,
    causation_id: event.causationId,
    actor_id: event.actor?.id,
    actor_role: event.actor?.role,
    source: event.source,
    trace: event.trace || {},
    payload: event.payload || {},
    status: "recorded",
    handler_status: {},
  };
}

async function getStoredDomainEvent(eventId: string): Promise<DbResult<StoredDomainEvent | null>> {
  const result = await eventStoreRequest<StoredDomainEvent[]>({
    method: "GET",
    query: `?select=*&event_id=eq.${encodeURIComponent(eventId)}&limit=1`,
  });

  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

async function patchDomainEvent(eventId: string, payload: Record<string, unknown>) {
  return eventStoreRequest<undefined>({
    method: "PATCH",
    query: `?event_id=eq.${encodeURIComponent(eventId)}`,
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=minimal",
    },
  });
}

function handlerStatusPatch(current: StoredDomainEvent | null, handlerName: string, status: "handled" | "failed", error?: unknown) {
  const handlerStatus = {
    ...(current?.handler_status || {}),
    [handlerName]: {
      status,
      at: new Date().toISOString(),
      error: error instanceof Error ? error.message : error ? String(error) : undefined,
    },
  };

  return handlerStatus;
}

export async function recordDomainEvent(event: AdminKioskoDomainEvent) {
  return eventStoreRequest<undefined>({
    method: "POST",
    query: "?on_conflict=event_id",
    body: JSON.stringify(toStoredPayload(event)),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
  });
}

export async function markDomainEventHandled(eventId: string, handlerName: string) {
  const current = await getStoredDomainEvent(eventId);
  if (!current.ok) return current;

  const handlerStatus = handlerStatusPatch(current.data, handlerName, "handled");
  const failedHandlers = Object.values(handlerStatus).some((value) => {
    return typeof value === "object" && value !== null && "status" in value && value.status === "failed";
  });

  return patchDomainEvent(eventId, {
    status: failedHandlers ? "failed" : "handled",
    handler_status: handlerStatus,
    error_message: failedHandlers ? current.data?.error_message : null,
  });
}

export async function markDomainEventFailed(eventId: string, handlerName: string, error: unknown) {
  const current = await getStoredDomainEvent(eventId);
  if (!current.ok) return current;

  return patchDomainEvent(eventId, {
    status: "failed",
    handler_status: handlerStatusPatch(current.data, handlerName, "failed", error),
    error_message: error instanceof Error ? error.message : String(error || "Handler failed"),
    retry_count: (current.data?.retry_count || 0) + 1,
  });
}

export async function listRecentDomainEvents(limit = 50): Promise<DbResult<StoredDomainEvent[]>> {
  const safeLimit = Math.max(1, Math.min(200, Math.round(limit)));
  return eventStoreRequest<StoredDomainEvent[]>({
    method: "GET",
    query: `?select=*&order=occurred_at.desc&limit=${safeLimit}`,
  });
}

export async function findDomainEventsByCorrelationId(correlationId: string): Promise<DbResult<StoredDomainEvent[]>> {
  if (!correlationId) return { ok: true, data: [] };

  return eventStoreRequest<StoredDomainEvent[]>({
    method: "GET",
    query: `?select=*&correlation_id=eq.${encodeURIComponent(correlationId)}&order=occurred_at.asc`,
  });
}
