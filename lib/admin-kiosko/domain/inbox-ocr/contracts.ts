import type { InboxDocumentType } from "../../inbox";

export type InboxOcrQueueDocument = {
  uploadedDocumentId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  storageBucket?: string;
  storagePath?: string;
  status: string;
  detectedType?: InboxDocumentType;
  selectedType?: InboxDocumentType;
  confirmedType?: InboxDocumentType;
  ocrAttempts: number;
  possibleDuplicate?: boolean;
  importedAt?: string;
};

export type InboxOcrStructuredResult = {
  uploadedDocumentId: string;
  detectedType: InboxDocumentType;
  confidence: number;
  classificationSource: string;
  classificationReason: string;
  corrections: Record<string, unknown>;
  ocrJson: Record<string, unknown>;
  warnings: string[];
  status: "classified" | "needs_review";
  rawText?: string;
  model?: string;
};

export type InboxOcrBatchResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  results: Array<{
    uploadedDocumentId: string;
    status: "classified" | "needs_review" | "failed" | "skipped";
    message: string;
    warnings?: string[];
  }>;
};
