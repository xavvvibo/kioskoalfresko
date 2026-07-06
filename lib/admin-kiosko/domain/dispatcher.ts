import type { DomainDispatchResult, DomainEventHandler, DomainEventLogger } from "./contracts";
import type { AdminKioskoDomainEvent } from "./events";
import { adminKioskoDomainHandlers } from "./handlers";

const defaultLogger: DomainEventLogger = {
  info(message, meta) {
    console.info(`[ERP DOMAIN] ${message}`, meta || "");
  },
  error(message, meta) {
    console.error(`[ERP DOMAIN ERROR] ${message}`, meta || "");
  },
};

export class DomainEventDispatcher {
  constructor(
    private readonly handlers: DomainEventHandler<AdminKioskoDomainEvent>[] = [],
    private readonly logger: DomainEventLogger = defaultLogger,
  ) {}

  async dispatch(event: AdminKioskoDomainEvent): Promise<DomainDispatchResult> {
    const matchingHandlers = this.handlers.filter((handler) => handler.handles.includes(event.name));
    const handledBy: string[] = [];
    const handlerResults: DomainDispatchResult["handlerResults"] = [];

    for (const handler of matchingHandlers) {
      try {
        const result = await handler.handle(event);
        handledBy.push(handler.name);
        handlerResults.push({ handlerName: handler.name, result });
      } catch (error) {
        this.logger.error(`Handler ${handler.name} failed for ${event.name}`, {
          eventId: event.id,
          error,
        });
        throw error;
      }
    }

    this.logger.info(`Dispatched ${event.name}`, { eventId: event.id, handledBy });

    return {
      eventId: event.id,
      eventName: event.name,
      handledBy,
      handlerResults,
    };
  }
}

export const adminKioskoDomainDispatcher = new DomainEventDispatcher(adminKioskoDomainHandlers);

export async function dispatchDomainEvent(event: AdminKioskoDomainEvent) {
  return adminKioskoDomainDispatcher.dispatch(event);
}
