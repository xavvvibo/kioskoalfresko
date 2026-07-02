export type DomainEventName =
  | "DocumentUploaded"
  | "DocumentClassified"
  | "DocumentConfirmed"
  | "SupplierCreated"
  | "GoodsReceived"
  | "InventoryLotCreated"
  | "InventoryLotConsumed"
  | "ProductionBatchCreated"
  | "FinishedProductLotCreated"
  | "LabelPrepared"
  | "LabelPrinted"
  | "AccountingDocumentCreated"
  | "AccountingDocumentReconciled"
  | "InspectionRecordCreated"
  | "IncidentCreated"
  | "WaterControlRecorded"
  | "TemperatureRecorded"
  | "CleaningRecorded";

export type DomainEventId = string;

export type DomainActor = {
  id?: string;
  name?: string;
  role?: "owner" | "employee" | "inspector" | string;
};

export type DomainSource =
  | "ocr"
  | "inbox"
  | "accounting"
  | "appcc"
  | "inventory"
  | "production"
  | "labels"
  | "inspection"
  | "system";

export type EntityRef = {
  id?: string;
  type: string;
  label?: string;
};

export type TraceRef = {
  documentId?: string;
  supplierDocumentId?: string;
  supplierId?: string;
  productId?: string;
  inventoryLotId?: string;
  productionBatchId?: string;
  labelId?: string;
  accountingDocumentId?: string;
  appccRecordId?: string;
  incidentId?: string;
  caseId?: string;
};

export type DomainEventEnvelope<TName extends DomainEventName = DomainEventName, TPayload = unknown> = {
  id: DomainEventId;
  name: TName;
  occurredAt: string;
  source: DomainSource;
  actor?: DomainActor;
  subject?: EntityRef;
  correlationId?: string;
  causationId?: string;
  trace?: TraceRef;
  payload: TPayload;
};

export type DomainEventHandler<TEvent extends DomainEventEnvelope = DomainEventEnvelope> = {
  name: string;
  handles: readonly TEvent["name"][];
  handle(event: TEvent): Promise<void> | void;
};

export type DomainEventLogger = {
  info(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
};

export type DomainDispatchResult = {
  eventId: string;
  eventName: DomainEventName;
  handledBy: string[];
};
