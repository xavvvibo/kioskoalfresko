import type { InboxDocumentType } from "../../inbox";

export type DocumentImportStatus = "success" | "warning" | "needs_review" | "failed" | "skipped";

export type DocumentImportContext = {
  uploadedDocumentId: string;
  eventId: string;
  correlationId?: string;
  confirmedType: InboxDocumentType;
  filename: string;
  uploadedAt?: string;
  supplier?: string;
  supplierTaxId?: string;
  documentNumber?: string;
  documentDate?: string;
  totalAmount?: number;
  taxableBase?: number;
  vatAmount?: number;
  product?: string;
  products?: string;
  batchNumber?: string;
  expiryDate?: string;
  temperature?: number;
  location?: string;
  category?: string;
  traceability?: string;
  appcc?: string;
  rawCorrections: Record<string, unknown>;
};

export type DocumentImportHandlerResult = {
  handler: string;
  status: DocumentImportStatus;
  message: string;
  recordType?: string;
  recordId?: string;
  warnings?: string[];
  errors?: string[];
  durationMs: number;
};

export type DocumentImportPipelineResult = {
  uploadedDocumentId: string;
  status: Exclude<DocumentImportStatus, "skipped">;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  results: DocumentImportHandlerResult[];
};

export type DocumentImportHandler = {
  name: string;
  supports(context: DocumentImportContext): boolean;
  execute(context: DocumentImportContext): Promise<DocumentImportHandlerResult>;
};

export const purchaseInvoiceTypes: InboxDocumentType[] = ["purchase_invoice", "credit_note", "accounting_document"];
export const purchaseDeliveryNoteTypes: InboxDocumentType[] = ["purchase_delivery_note", "receipt"];
export const supplierTraceabilityLabelTypes: InboxDocumentType[] = ["supplier_traceability_label", "traceability_label"];
export const appccDocumentTypes: InboxDocumentType[] = [
  "technical_sheet",
  "sanitary_document",
  "training_document",
  "maintenance_document",
  "supplier_contract",
  "appcc_document",
];
