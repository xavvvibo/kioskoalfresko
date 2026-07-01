import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";

export const accountingHandler: DomainEventHandler<AdminKioskoDomainEvent> = {
  name: "AccountingHandler",
  handles: ["DocumentConfirmed", "AccountingDocumentCreated", "AccountingDocumentReconciled"],
  handle() {
    // Future responsibility: derive accounting documents and reconciliation
    // read models from confirmed document events.
  },
};
