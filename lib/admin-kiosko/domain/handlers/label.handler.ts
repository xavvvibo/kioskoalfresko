import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";
import { labelEventService } from "../label-event.service";

export const labelHandler: DomainEventHandler<AdminKioskoDomainEvent> = {
  name: "LabelHandler",
  handles: ["ProductionBatchClosed", "PrepCreated", "GoodsReceived", "LabelRequested"],
  async handle(event) {
    if (event.name === "ProductionBatchClosed" || event.name === "PrepCreated" || event.name === "GoodsReceived" || event.name === "LabelRequested") {
      const result = await labelEventService.handleDomainEvent(event);
      if (!result.ok) {
        if (/without|sin|pending|no_policy|legacy_payload_ignored|prep_without_batch_code|prep_without_name/i.test(result.error)) {
          console.info("[LABEL EVENT SERVICE SKIPPED]", {
            eventName: event.name,
            eventId: event.id,
            reason: result.error,
          });
          return result;
        }
        console.error("[LABEL EVENT SERVICE ERROR]", {
          eventName: event.name,
          eventId: event.id,
          error: result.error,
        });
      }
      return result;
    }
  },
};
