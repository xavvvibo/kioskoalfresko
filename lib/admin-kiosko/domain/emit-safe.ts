import { dispatchDomainEvent } from "./dispatcher";
import type { AdminKioskoDomainEvent } from "./events";
import { markDomainEventFailed, markDomainEventHandled, recordDomainEvent } from "../repositories/events.repository";

function isDomainEventsDebugEnabled() {
  return process.env.ADMIN_KIOSKO_DOMAIN_EVENTS_DEBUG === "true";
}

export async function emitDomainEventSafe(event: AdminKioskoDomainEvent) {
  let eventRecorded = false;

  try {
    if (isDomainEventsDebugEnabled()) {
      console.info("[ERP DOMAIN DEBUG] emitting", {
        event: event.name,
        eventId: event.id,
        correlationId: event.correlationId,
      });
    }

    const recorded = await recordDomainEvent(event);
    eventRecorded = recorded.ok;

    if (!recorded.ok) {
      console.error("[ERP DOMAIN EVENT STORE ERROR]", {
        event: event.name,
        eventId: event.id,
        correlationId: event.correlationId,
        error: recorded.error,
      });
    }
  } catch (error) {
    console.error("[ERP DOMAIN EVENT STORE ERROR]", {
      event: event.name,
      eventId: event.id,
      correlationId: event.correlationId,
      error,
    });
  }

  try {
    const result = await dispatchDomainEvent(event);

    if (eventRecorded) {
      await Promise.all(result.handledBy.map(async (handlerName) => {
        const handled = await markDomainEventHandled(event.id, handlerName);
        if (!handled.ok) {
          console.error("[ERP DOMAIN HANDLER STATUS ERROR]", {
            event: event.name,
            eventId: event.id,
            handlerName,
            error: handled.error,
          });
        }
      }));
    }

    return result;
  } catch (error) {
    console.error("[ERP DOMAIN EVENT ERROR]", {
      event: event.name,
      eventId: event.id,
      correlationId: event.correlationId,
      error,
    });

    if (eventRecorded) {
      const failed = await markDomainEventFailed(event.id, "DomainEventDispatcher", error);
      if (!failed.ok) {
        console.error("[ERP DOMAIN HANDLER STATUS ERROR]", {
          event: event.name,
          eventId: event.id,
          handlerName: "DomainEventDispatcher",
          error: failed.error,
        });
      }
    }

    return null;
  }
}
