import type { DomainEventHandler } from "../contracts";
import type { AdminKioskoDomainEvent } from "../events";

export const dashboardHandler: DomainEventHandler<AdminKioskoDomainEvent> = {
  name: "DashboardHandler",
  handles: [
    "DocumentUploaded",
    "DocumentClassified",
    "DocumentConfirmed",
    "InboxDocumentUploaded",
    "InboxDocumentClassified",
    "InboxReviewCompleted",
    "InboxImportConfirmed",
    "DocumentImportCompleted",
    "SupplierCreated",
    "GoodsReceived",
    "InventoryLotCreated",
    "InventoryLotConsumed",
    "ProductionBatchCreated",
    "LabelPrinted",
    "AccountingDocumentCreated",
    "AccountingDocumentReconciled",
    "InspectionRecordCreated",
    "IncidentCreated",
    "WaterControlRecorded",
    "TemperatureRecorded",
    "CleaningRecorded",
  ],
  handle() {
    // Future responsibility: update dashboard/inbox projections without
    // coupling operational modules to presentation queries.
  },
};
