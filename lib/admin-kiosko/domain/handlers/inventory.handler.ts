import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";

export const inventoryHandler: DomainEventHandler<AdminKioskoDomainEvent> = {
  name: "InventoryHandler",
  handles: ["GoodsReceived", "InventoryLotCreated", "InventoryLotConsumed", "ProductionBatchCreated"],
  handle() {
    // Future responsibility: keep inventory read models and stock summaries in
    // sync from domain events. No module should call inventory side effects
    // through another bounded context.
  },
};
