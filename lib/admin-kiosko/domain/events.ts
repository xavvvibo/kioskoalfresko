import type { DomainActor, DomainEventEnvelope, DomainSource, TraceRef } from "./contracts";

type EventFactoryInput<TPayload> = {
  payload: TPayload;
  source: DomainSource;
  actor?: DomainActor;
  correlationId?: string;
  causationId?: string;
  trace?: TraceRef;
};

function newEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type DocumentUploadedPayload = {
  uploadedDocumentId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  storageBucket?: string;
  storagePath?: string;
  uploadGroupId?: string;
};

export type DocumentClassifiedPayload = {
  uploadedDocumentId: string;
  detectedType: string;
  confidence?: number;
  model?: string;
};

export type DocumentConfirmedPayload = {
  uploadedDocumentId: string;
  confirmedType: string;
  corrections?: Record<string, unknown>;
};

export type SupplierCreatedPayload = {
  supplierId?: string;
  name: string;
  taxId?: string;
  status?: string;
};

export type GoodsReceivedPayload = {
  receptionId?: string;
  supplierId?: string;
  supplierName: string;
  uploadedDocumentId?: string;
  items: Array<{
    productName: string;
    batchNumber?: string;
    quantity?: number;
    unit?: string;
    expiryDate?: string;
  }>;
};

export type InventoryLotCreatedPayload = {
  inventoryLotId?: string;
  productId?: string;
  productName: string;
  batchNumber?: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string;
};

export type InventoryLotConsumedPayload = {
  inventoryLotId?: string;
  productId?: string;
  quantity: number;
  unit?: string;
  reason: string;
};

export type ProductionBatchCreatedPayload = {
  productionBatchId: string;
  batchCode: string;
  outputProduct: string;
  outputQuantity?: number;
  outputUnit?: string;
  sourceInventoryLotId?: string;
};

export type LabelPrintedPayload = {
  labelRecordId?: string;
  template: string;
  copies: number;
  printer?: string;
  inventoryLotId?: string;
  productionBatchId?: string;
};

export type AccountingDocumentCreatedPayload = {
  accountingDocumentId: string;
  uploadedDocumentId?: string;
  documentType: string;
  supplierName?: string;
  totalAmount?: number;
};

export type AccountingDocumentReconciledPayload = {
  reconciliationId?: string;
  accountingDocumentId?: string;
  status: string;
};

export type InspectionRecordCreatedPayload = {
  inspectionRecordId?: string;
  result?: string;
  inspectionDate: string;
};

export type IncidentCreatedPayload = {
  incidentId?: string;
  severity?: string;
  incidentType: string;
};

export type WaterControlRecordedPayload = {
  waterRecordId?: string;
  recordDate: string;
  status?: string;
};

export type TemperatureRecordedPayload = {
  temperatureRecordId?: string;
  equipment: string;
  temperature: number;
  status: string;
};

export type CleaningRecordedPayload = {
  cleaningRecordId?: string;
  area: string;
  status?: string;
};

export type AdminKioskoDomainEvent =
  | DomainEventEnvelope<"DocumentUploaded", DocumentUploadedPayload>
  | DomainEventEnvelope<"DocumentClassified", DocumentClassifiedPayload>
  | DomainEventEnvelope<"DocumentConfirmed", DocumentConfirmedPayload>
  | DomainEventEnvelope<"SupplierCreated", SupplierCreatedPayload>
  | DomainEventEnvelope<"GoodsReceived", GoodsReceivedPayload>
  | DomainEventEnvelope<"InventoryLotCreated", InventoryLotCreatedPayload>
  | DomainEventEnvelope<"InventoryLotConsumed", InventoryLotConsumedPayload>
  | DomainEventEnvelope<"ProductionBatchCreated", ProductionBatchCreatedPayload>
  | DomainEventEnvelope<"LabelPrinted", LabelPrintedPayload>
  | DomainEventEnvelope<"AccountingDocumentCreated", AccountingDocumentCreatedPayload>
  | DomainEventEnvelope<"AccountingDocumentReconciled", AccountingDocumentReconciledPayload>
  | DomainEventEnvelope<"InspectionRecordCreated", InspectionRecordCreatedPayload>
  | DomainEventEnvelope<"IncidentCreated", IncidentCreatedPayload>
  | DomainEventEnvelope<"WaterControlRecorded", WaterControlRecordedPayload>
  | DomainEventEnvelope<"TemperatureRecorded", TemperatureRecordedPayload>
  | DomainEventEnvelope<"CleaningRecorded", CleaningRecordedPayload>;

export function createDomainEvent<TEvent extends AdminKioskoDomainEvent>(
  name: TEvent["name"],
  input: EventFactoryInput<TEvent["payload"]>,
): TEvent {
  return {
    id: newEventId(),
    name,
    occurredAt: new Date().toISOString(),
    source: input.source,
    actor: input.actor,
    correlationId: input.correlationId,
    causationId: input.causationId,
    trace: input.trace,
    payload: input.payload,
  } as TEvent;
}
