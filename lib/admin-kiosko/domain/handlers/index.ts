import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";
import { accountingHandler } from "./accounting.handler";
import { dashboardHandler } from "./dashboard.handler";
import { documentConfirmedHandler } from "./document-confirmed.handler";
import { goodsReceivedHandler } from "./goods-received.handler";
import { inventoryHandler } from "./inventory.handler";
import { labelHandler } from "./label.handler";

export const adminKioskoDomainHandlers: DomainEventHandler<AdminKioskoDomainEvent>[] = [
  documentConfirmedHandler,
  goodsReceivedHandler,
  inventoryHandler,
  labelHandler,
  accountingHandler,
  dashboardHandler,
];
