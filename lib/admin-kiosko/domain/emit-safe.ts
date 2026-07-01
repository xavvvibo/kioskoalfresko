import { dispatchDomainEvent } from "./dispatcher";
import type { AdminKioskoDomainEvent } from "./events";

function isDomainEventsDebugEnabled() {
  return process.env.ADMIN_KIOSKO_DOMAIN_EVENTS_DEBUG === "true";
}

export async function emitDomainEventSafe(event: AdminKioskoDomainEvent) {
  try {
    if (isDomainEventsDebugEnabled()) {
      console.info("[ERP DOMAIN DEBUG] emitting", {
        event: event.name,
        eventId: event.id,
        correlationId: event.correlationId,
      });
    }

    return await dispatchDomainEvent(event);
  } catch (error) {
    console.error("[ERP DOMAIN EVENT ERROR]", {
      event: event.name,
      eventId: event.id,
      correlationId: event.correlationId,
      error,
    });

    return null;
  }
}
