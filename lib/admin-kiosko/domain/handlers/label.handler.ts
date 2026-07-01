import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";

export const labelHandler: DomainEventHandler<AdminKioskoDomainEvent> = {
  name: "LabelHandler",
  handles: ["GoodsReceived", "InventoryLotCreated", "ProductionBatchCreated", "LabelPrinted"],
  handle() {
    // Future responsibility: prepare label intents/history from domain events.
    // Production and reception must not know Zebra implementation details.
  },
};
