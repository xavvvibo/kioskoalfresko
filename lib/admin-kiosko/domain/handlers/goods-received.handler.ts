import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";

export const goodsReceivedHandler: DomainEventHandler<AdminKioskoDomainEvent> = {
  name: "GoodsReceivedHandler",
  handles: ["GoodsReceived"],
  handle() {
    // Future responsibility: react to APPCC reception without coupling OCR,
    // accounting or inventory modules directly.
  },
};
