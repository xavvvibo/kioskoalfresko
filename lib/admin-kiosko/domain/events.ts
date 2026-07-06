import type { PrintJobMetadata, PrintLabelData, PrintLabelTemplate } from "@/lib/admin-kiosko/printing/print-payload";
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

export type InboxDocumentUploadedPayload = DocumentUploadedPayload & {
  queueStatus: "uploaded" | "failed";
};

export type InboxDocumentClassifiedPayload = {
  uploadedDocumentId: string;
  detectedType: string;
  selectedType?: string;
  confidence?: number;
  reason?: string;
};

export type InboxOcrStartedPayload = {
  uploadedDocumentId: string;
  attempt: number;
  mimeType?: string;
};

export type InboxOcrCompletedPayload = {
  uploadedDocumentId: string;
  detectedType: string;
  confidence: number;
  status: string;
  warnings?: string[];
};

export type InboxOcrFailedPayload = {
  uploadedDocumentId: string;
  error: string;
  attempt?: number;
};

export type InboxNeedsReviewPayload = {
  uploadedDocumentId: string;
  reasons: string[];
};

export type InboxReviewCompletedPayload = {
  uploadedDocumentId: string;
  confirmedType: string;
  corrections?: Record<string, unknown>;
};

export type InboxImportConfirmedPayload = {
  uploadedDocumentId: string;
  confirmedType: string;
  targets: string[];
};

export type DocumentReconciliationProposedPayload = {
  uploadedDocumentId: string;
  reconciliationId?: string;
  status: string;
  supplierName?: string;
  matchedSupplierId?: string;
  lineCount: number;
  matchedLines: number;
  ambiguousLines: number;
  unrecognizedLines: number;
  warnings?: string[];
};

export type DocumentReconciliationFailedPayload = {
  uploadedDocumentId: string;
  error: string;
};

export type DocumentImportCompletedPayload = {
  uploadedDocumentId: string;
  status: string;
  durationMs: number;
  handlers: Array<{
    handler: string;
    status: string;
    recordType?: string;
    recordId?: string;
  }>;
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

export type ProductionBatchClosedPayload = {
  prepName: string;
  productionDate: string;
  productionTime: string;
  expiryDate: string;
  batchCode: string;
  productionBatchId: string;
  responsibleName: string;
  storageState: string;
  quantity?: number;
  unit?: string;
  createdFrom: string;
  reason: string;
};

export type ProductionBatchConsumedPayload = {
  batchId: string;
  batchCode: string;
  recipeId?: string;
  recipeName: string;
  quantity: number;
  unit?: string;
  stockMutation: false;
};

export type FinishedProductLotCreatedPayload = {
  productionBatchId: string;
  inventoryLotId: string;
  productId?: string;
  productName: string;
  batchNumber: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string;
};

export type PrepCreatedPayload = {
  prepName: string;
  productionDateTime?: string;
  expiryDateTime?: string;
  shelfLifeDays?: number;
  batchCode: string;
  responsibleName?: string;
  storageCondition?: string;
  requestedBy?: string;
  reason: string;
};

export type LabelRequestedPayload = {
  printerKey?: string;
  template: PrintLabelTemplate;
  data: PrintLabelData;
  metadata: PrintJobMetadata;
};

export type PrintJobCreatedPayload = {
  printJobId: string;
  printerKey: string;
  template?: string;
  sourceType?: string;
  sourceId?: string;
  reason?: string;
};

export type LabelPreparedPayload = {
  productionBatchId?: string;
  inventoryLotId?: string;
  productName: string;
  batchNumber?: string;
  template: string;
  expiryDate?: string;
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
  | DomainEventEnvelope<"InboxDocumentUploaded", InboxDocumentUploadedPayload>
  | DomainEventEnvelope<"InboxOcrStarted", InboxOcrStartedPayload>
  | DomainEventEnvelope<"InboxOcrCompleted", InboxOcrCompletedPayload>
  | DomainEventEnvelope<"InboxOcrFailed", InboxOcrFailedPayload>
  | DomainEventEnvelope<"InboxNeedsReview", InboxNeedsReviewPayload>
  | DomainEventEnvelope<"InboxDocumentClassified", InboxDocumentClassifiedPayload>
  | DomainEventEnvelope<"InboxReviewCompleted", InboxReviewCompletedPayload>
  | DomainEventEnvelope<"InboxImportConfirmed", InboxImportConfirmedPayload>
  | DomainEventEnvelope<"DocumentReconciliationProposed", DocumentReconciliationProposedPayload>
  | DomainEventEnvelope<"DocumentReconciliationFailed", DocumentReconciliationFailedPayload>
  | DomainEventEnvelope<"DocumentImportCompleted", DocumentImportCompletedPayload>
  | DomainEventEnvelope<"SupplierCreated", SupplierCreatedPayload>
  | DomainEventEnvelope<"GoodsReceived", GoodsReceivedPayload>
  | DomainEventEnvelope<"InventoryLotCreated", InventoryLotCreatedPayload>
  | DomainEventEnvelope<"InventoryLotConsumed", InventoryLotConsumedPayload>
  | DomainEventEnvelope<"ProductionBatchCreated", ProductionBatchCreatedPayload>
  | DomainEventEnvelope<"ProductionBatchClosed", ProductionBatchClosedPayload>
  | DomainEventEnvelope<"ProductionBatchConsumed", ProductionBatchConsumedPayload>
  | DomainEventEnvelope<"FinishedProductLotCreated", FinishedProductLotCreatedPayload>
  | DomainEventEnvelope<"PrepCreated", PrepCreatedPayload>
  | DomainEventEnvelope<"LabelRequested", LabelRequestedPayload>
  | DomainEventEnvelope<"PrintJobCreated", PrintJobCreatedPayload>
  | DomainEventEnvelope<"LabelPrepared", LabelPreparedPayload>
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
