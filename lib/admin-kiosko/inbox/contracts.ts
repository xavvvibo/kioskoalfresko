import type { DocumentProcessingStatus, DocumentType } from "../repositories/documents.repository";

export type InboxDocumentType = DocumentType;

export type InboxDocumentStatus = DocumentProcessingStatus;

export type InboxDocumentInput = {
  file: File;
  selectedType?: InboxDocumentType;
  responsible?: string;
  uploadGroupId?: string;
};

export type InboxDocumentRecord = {
  uploadedDocumentId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  uploadedAt?: string;
  detectedType?: InboxDocumentType;
  selectedType?: InboxDocumentType;
  confirmedType?: InboxDocumentType;
  status: InboxDocumentStatus;
  uploadGroupId?: string;
  storageBucket?: string;
  storagePath?: string;
  classificationSource?: string;
  classificationConfidence?: number;
  classificationReason?: string;
  processingError?: string;
  ocrAttempts?: number;
  ocrStartedAt?: string;
  ocrCompletedAt?: string;
  ocrModel?: string;
  ocrJson?: Record<string, unknown>;
  ocrWarnings?: string[];
  ocrReprocessRequested?: boolean;
  possibleDuplicate?: boolean;
  duplicateOf?: string;
  duplicateScore?: number;
  relatedRecordType?: string;
  relatedRecordId?: string;
  importedAt?: string;
  importStatus?: string;
  importDurationMs?: number;
  importError?: string;
  importHandlerResults?: Array<{
    handler: string;
    status: string;
    message: string;
    recordType?: string;
    recordId?: string;
    warnings?: string[];
    errors?: string[];
    durationMs?: number;
  }>;
  reconciliation?: {
    status: string;
    supplierName?: string;
    supplierTaxId?: string;
    matchedSupplierId?: string;
    supplierMatchStatus: string;
    supplierMatchConfidence: number;
    documentNumber?: string;
    documentDate?: string;
    taxableBase?: number;
    vatAmount?: number;
    totalAmount?: number;
    lineCount: number;
    matchedLines: number;
    ambiguousLines: number;
    unrecognizedLines: number;
    priceAlerts: number;
    taxAlerts: number;
    unitAlerts: number;
    warnings: string[];
    errors: string[];
    summary?: string;
  };
};

export type InboxConfirmation = {
  uploadedDocumentId: string;
  confirmedType: InboxDocumentType;
  corrections?: Record<string, unknown>;
  responsible?: string;
};

export type InboxDerivationTarget =
  | "accounting"
  | "purchasing"
  | "goods_reception"
  | "inventory"
  | "traceability"
  | "sanitary_documentation"
  | "labels"
  | "manual_review";

export type InboxDocumentPlan = {
  uploadedDocumentId: string;
  confirmedType: InboxDocumentType;
  targets: InboxDerivationTarget[];
};
