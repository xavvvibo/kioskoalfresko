import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";
import { documentImportOrchestrator } from "../document-import/orchestrator";

export const inboxImportHandler: DomainEventHandler<AdminKioskoDomainEvent> = {
  name: "DocumentImportOrchestrator",
  handles: ["InboxImportConfirmed"],
  async handle(event) {
    if (event.name !== "InboxImportConfirmed") return;
    await documentImportOrchestrator.handle(event);
  },
};
