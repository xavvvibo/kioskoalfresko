import type { InboxConfirmation, InboxDocumentRecord, InboxDocumentStatus, InboxDocumentType } from "../inbox/contracts";
import type { InboxOcrQueueDocument, InboxOcrStructuredResult } from "../domain/inbox-ocr/contracts";
import { normalizeDocumentProcessingStatus, normalizeDocumentType } from "./documents.repository";
import { listDocumentReconciliations } from "./document-reconciliation.repository";
import { findDomainEventsByCorrelationId } from "./events.repository";
import { adminSupabaseRequest, downloadAdminStorageObject, uploadAdminStorageObject } from "./legacy-core";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const INBOX_BUCKET = "admin-kiosko-documents";
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type UploadedDocumentRow = {
  id: string;
  created_at: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  uploaded_by: string | null;
  detected_type: string | null;
  selected_type: string | null;
  confirmed_type: string | null;
  processing_status: string | null;
  review_status: string | null;
  classification_source: string | null;
  classification_confidence: number | null;
  classification_reason: string | null;
  upload_group_id: string | null;
  upload_sequence: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  storage_status: string | null;
  processing_error: string | null;
  ocr_attempts: number | null;
  ocr_started_at: string | null;
  ocr_completed_at: string | null;
  ocr_model: string | null;
  ocr_json: Record<string, unknown> | null;
  ocr_warnings: string[] | null;
  ocr_reprocess_requested: boolean | null;
  possible_duplicate: boolean | null;
  duplicate_of: string | null;
  duplicate_score: number | null;
  related_record_type: string | null;
  related_record_id: string | null;
  import_status: string | null;
  import_duration_ms: number | null;
  import_handler_results: InboxDocumentRecord["importHandlerResults"] | null;
  import_error: string | null;
  imported_at: string | null;
};

export type InboxCreateInput = {
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
  selectedType?: InboxDocumentType;
  uploadGroupId?: string;
  uploadSequence?: number;
  storageBucket?: string;
  storagePath?: string;
  storageStatus?: string;
};

export type InboxQueueInput = {
  file: File;
  selectedType?: InboxDocumentType;
  responsible?: string;
  uploadGroupId?: string;
  uploadSequence?: number;
};

export type InboxStatusUpdate = {
  uploadedDocumentId: string;
  status: InboxDocumentStatus;
  classificationSource?: string;
  classificationConfidence?: number;
  classificationReason?: string;
  selectedType?: InboxDocumentType;
  detectedType?: InboxDocumentType;
  processingError?: string;
  possibleDuplicate?: boolean;
  duplicateOf?: string;
  duplicateScore?: number;
};

export type InboxListFilters = {
  status?: InboxDocumentStatus | "all";
  type?: InboxDocumentType | "all";
  uploadGroupId?: string;
  limit?: number;
};

export type InboxGroup = {
  uploadGroupId: string;
  documentCount: number;
  latestUploadedAt: string | null;
  statuses: InboxDocumentStatus[];
  filenames: string[];
};

export type InboxBulkAction = {
  uploadedDocumentIds: string[];
  action: "confirm" | "archive" | "change_type" | "reprocess_ocr" | "mark_duplicate";
  confirmedType?: InboxDocumentType;
  duplicateOf?: string;
  responsible?: string;
};

export type InboxMetrics = {
  pending: number;
  ocr: number;
  review: number;
  duplicates: number;
  errors: number;
  importedToday: number;
  ocrCompletedToday: number;
  ocrWarnings: number;
  averageReviewMinutes: number | null;
  averageConfirmationMinutes: number | null;
};

export type InboxTimelineItem = {
  id: string;
  label: string;
  at?: string;
  status: "done" | "current" | "pending" | "failed";
  detail?: string;
};

const domainRecordTypeMap: Record<string, string> = {
  admin_supplier_documents: "supplier_document",
  supplier_document: "supplier_document",
  admin_accounting_documents: "accounting_document",
  accounting_document: "accounting_document",
  purchase_invoice: "purchase_invoice",
  purchase_delivery_note: "purchase_delivery_note",
  admin_goods_reception_records: "inventory_reception",
  goods_reception: "inventory_reception",
  inventory_reception: "inventory_reception",
  admin_inventory_lots: "inventory_lot",
  inventory_lot: "inventory_lot",
  admin_appcc_records: "appcc_record",
  appcc_record: "appcc_record",
  technical_sheet: "technical_sheet",
  traceability_label: "traceability_label",
  maintenance_document: "maintenance_document",
  training_document: "training_document",
};

const inboxSelect = "id,created_at,original_filename,mime_type,file_size,uploaded_at,uploaded_by,detected_type,selected_type,confirmed_type,processing_status,review_status,classification_source,classification_confidence,classification_reason,upload_group_id,upload_sequence,storage_bucket,storage_path,storage_status,processing_error,ocr_attempts,ocr_started_at,ocr_completed_at,ocr_model,ocr_json,ocr_warnings,ocr_reprocess_requested,possible_duplicate,duplicate_of,duplicate_score,related_record_type,related_record_id,import_status,import_duration_ms,import_handler_results,import_error,imported_at";

async function inboxRequest<T>(init: RequestInit & { query?: string }): Promise<DbResult<T>> {
  return adminSupabaseRequest<T>("admin_uploaded_documents", init);
}

async function inboxRpcRequest<T>(functionName: string, body: Record<string, unknown>): Promise<DbResult<T>> {
  return adminSupabaseRequest<T>(`rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function uploadInboxStorageObject(path: string, buffer: Buffer, mimeType: string) {
  return uploadAdminStorageObject(INBOX_BUCKET, path, buffer, mimeType, { upsert: false });
}

async function downloadInboxStorageObject(path: string): Promise<DbResult<Buffer>> {
  return downloadAdminStorageObject(INBOX_BUCKET, path);
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function storageFolderForType(type?: InboxDocumentType) {
  if (type === "purchase_invoice") return "facturas";
  if (type === "credit_note") return "facturas";
  if (type === "purchase_delivery_note") return "albaranes";
  if (type === "receipt") return "recepciones";
  if (type === "supplier_traceability_label" || type === "traceability_label") return "etiquetas";
  if (type === "sanitary_document" || type === "technical_sheet" || type === "supplier_contract" || type === "training_document") return "certificados";
  if (type === "maintenance_document" || type === "appcc_document") return "appcc";
  return "otros";
}

function newGroupId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toInboxDocument(row: UploadedDocumentRow): InboxDocumentRecord {
  return {
    uploadedDocumentId: row.id,
    filename: row.original_filename || "Documento",
    mimeType: row.mime_type || "application/octet-stream",
    fileSize: row.file_size || 0,
    uploadedAt: row.uploaded_at || undefined,
    detectedType: row.detected_type ? normalizeDocumentType(row.detected_type) : undefined,
    selectedType: row.selected_type ? normalizeDocumentType(row.selected_type) : undefined,
    confirmedType: row.confirmed_type ? normalizeDocumentType(row.confirmed_type) : undefined,
    status: normalizeDocumentProcessingStatus(row.processing_status || row.review_status),
    uploadGroupId: row.upload_group_id || undefined,
    storageBucket: row.storage_bucket || undefined,
    storagePath: row.storage_path || undefined,
    classificationSource: row.classification_source || undefined,
    classificationConfidence: row.classification_confidence || undefined,
    classificationReason: row.classification_reason || undefined,
    processingError: row.processing_error || undefined,
    ocrAttempts: row.ocr_attempts || 0,
    ocrStartedAt: row.ocr_started_at || undefined,
    ocrCompletedAt: row.ocr_completed_at || undefined,
    ocrModel: row.ocr_model || undefined,
    ocrJson: row.ocr_json || undefined,
    ocrWarnings: Array.isArray(row.ocr_warnings) ? row.ocr_warnings : undefined,
    ocrReprocessRequested: Boolean(row.ocr_reprocess_requested),
    possibleDuplicate: Boolean(row.possible_duplicate),
    duplicateOf: row.duplicate_of || undefined,
    duplicateScore: row.duplicate_score || undefined,
    relatedRecordType: row.related_record_type ? normalizeDomainRecordType(row.related_record_type) : undefined,
    relatedRecordId: row.related_record_id || undefined,
    importedAt: row.imported_at || undefined,
    importStatus: row.import_status || undefined,
    importDurationMs: row.import_duration_ms || undefined,
    importError: row.import_error || undefined,
    importHandlerResults: Array.isArray(row.import_handler_results) ? row.import_handler_results : undefined,
  };
}

async function attachReconciliations(documents: InboxDocumentRecord[]): Promise<DbResult<InboxDocumentRecord[]>> {
  if (!documents.length) return { ok: true, data: documents };
  const reconciliations = await listDocumentReconciliations(documents.map((document) => document.uploadedDocumentId));
  if (!reconciliations.ok) {
    return { ok: true, data: documents };
  }

  return {
    ok: true,
    data: documents.map((document) => {
      const reconciliation = reconciliations.data[document.uploadedDocumentId];
      if (!reconciliation) return document;
      return {
        ...document,
        reconciliation: {
          status: reconciliation.status,
          supplierName: reconciliation.supplierName,
          supplierTaxId: reconciliation.supplierTaxId,
          matchedSupplierId: reconciliation.matchedSupplierId,
          supplierMatchStatus: reconciliation.supplierMatchStatus,
          supplierMatchConfidence: reconciliation.supplierMatchConfidence,
          documentNumber: reconciliation.documentNumber,
          documentDate: reconciliation.documentDate,
          taxableBase: reconciliation.taxableBase,
          vatAmount: reconciliation.vatAmount,
          totalAmount: reconciliation.totalAmount,
          lineCount: reconciliation.lineCount,
          matchedLines: reconciliation.matchedLines,
          ambiguousLines: reconciliation.ambiguousLines,
          unrecognizedLines: reconciliation.unrecognizedLines,
          priceAlerts: reconciliation.priceAlerts,
          taxAlerts: reconciliation.taxAlerts,
          unitAlerts: reconciliation.unitAlerts,
          warnings: reconciliation.warnings,
          errors: reconciliation.errors,
          summary: reconciliation.summary,
        },
      };
    }),
  };
}

function normalizeDomainRecordType(value?: string | null) {
  if (!value) return undefined;
  return domainRecordTypeMap[value] || value;
}

function toOcrQueueDocument(row: UploadedDocumentRow): InboxOcrQueueDocument {
  return {
    uploadedDocumentId: row.id,
    filename: row.original_filename || "Documento",
    mimeType: row.mime_type || "application/octet-stream",
    fileSize: row.file_size || 0,
    storageBucket: row.storage_bucket || undefined,
    storagePath: row.storage_path || undefined,
    status: normalizeDocumentProcessingStatus(row.processing_status || row.review_status),
    detectedType: row.detected_type ? normalizeDocumentType(row.detected_type) : undefined,
    selectedType: row.selected_type ? normalizeDocumentType(row.selected_type) : undefined,
    confirmedType: row.confirmed_type ? normalizeDocumentType(row.confirmed_type) : undefined,
    ocrAttempts: row.ocr_attempts || 0,
    possibleDuplicate: Boolean(row.possible_duplicate),
    importedAt: row.imported_at || undefined,
  };
}

function validateInboxFile(file: File) {
  if (!file.size) return "El archivo está vacío.";
  if (!ACCEPTED_MIME_TYPES.has(file.type)) return `Formato no compatible: ${file.type || "sin tipo MIME"}.`;
  const maxSize = file.type === "application/pdf" ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxSize) return file.type === "application/pdf" ? "PDF demasiado grande." : "La imagen supera el tamaño permitido.";
  return "";
}

export function createInboxUploadGroupId() {
  return newGroupId();
}

async function findPossibleDuplicate(input: { filename: string; fileSize: number; storagePath?: string }): Promise<DbResult<{ id: string; score: number } | null>> {
  const filename = encodeURIComponent(input.filename);
  const size = Number(input.fileSize || 0);
  const clauses = [
    `and(original_filename.eq.${filename},file_size.eq.${size})`,
  ];
  if (input.storagePath) clauses.push(`storage_path.eq.${encodeURIComponent(input.storagePath)}`);

  const rows = await inboxRequest<Array<{ id: string; original_filename: string | null; file_size: number | null; storage_path: string | null; uploaded_at: string | null }>>({
    method: "GET",
    query: `?select=id,original_filename,file_size,storage_path,uploaded_at&or=(${clauses.join(",")})&order=uploaded_at.desc&limit=1`,
  });
  if (!rows.ok) return rows;
  const duplicate = rows.data[0];
  if (!duplicate) return { ok: true, data: null };
  const score = duplicate.storage_path === input.storagePath ? 0.98 : 0.86;
  return { ok: true, data: { id: duplicate.id, score } };
}

export function classifyInboxDocumentCandidate(input: {
  filename: string;
  mimeType?: string;
  selectedType?: InboxDocumentType;
}): {
  detectedType: InboxDocumentType;
  confidence: number;
  reason: string;
  source: string;
} {
  if (input.selectedType) {
    return {
      detectedType: input.selectedType,
      confidence: 1,
      reason: "Tipo documental seleccionado manualmente durante la subida.",
      source: "manual",
    };
  }

  const normalized = input.filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const checks: Array<[InboxDocumentType, number, RegExp, string]> = [
    ["credit_note", 0.94, /(rectificativa|abono|devolucion|devoluci[oó]n)/, "El nombre del archivo indica rectificativa, abono o devolución."],
    ["purchase_invoice", 0.9, /(factura|invoice|fra\.?|f-?\d+)/, "El nombre del archivo indica factura."],
    ["purchase_delivery_note", 0.9, /(albaran|albar[aá]n|delivery|recepcion|recepci[oó]n)/, "El nombre del archivo indica albarán o recepción."],
    ["receipt", 0.82, /(ticket|recibo|receipt)/, "El nombre del archivo indica ticket o recibo."],
    ["traceability_label", 0.86, /(trazabilidad|lote|caducidad|ean|gtin)/, "El nombre del archivo indica etiqueta o datos de trazabilidad."],
    ["supplier_traceability_label", 0.84, /(etiqueta|label)/, "El nombre del archivo indica etiqueta de proveedor."],
    ["technical_sheet", 0.88, /(ficha tecnica|ficha_tecnica|technical|spec|especificacion)/, "El nombre del archivo indica ficha técnica."],
    ["sanitary_document", 0.86, /(sanitario|certificado|registro sanitario|health)/, "El nombre del archivo indica documento sanitario."],
    ["appcc_document", 0.86, /(appcc|haccp|plan limpieza|plan trazabilidad|alergen)/, "El nombre del archivo indica documentación APPCC."],
    ["maintenance_document", 0.84, /(mantenimiento|revision|revisi[oó]n|equipo|averia|aver[ií]a)/, "El nombre del archivo indica mantenimiento o equipo."],
    ["supplier_contract", 0.84, /(contrato|contract|acuerdo|proveedor)/, "El nombre del archivo indica contrato de proveedor."],
    ["training_document", 0.82, /(formacion|formaci[oó]n|manipulador|curso|training)/, "El nombre del archivo indica formación."],
  ];

  const matched = checks.find(([, , pattern]) => pattern.test(normalized));
  if (matched) {
    return {
      detectedType: matched[0],
      confidence: matched[1],
      reason: matched[3],
      source: "ai_document_classifier",
    };
  }

  return {
    detectedType: "other",
    confidence: input.mimeType === "application/pdf" ? 0.45 : 0.4,
    reason: "Tipo documental pendiente de confirmar tras OCR o revisión manual.",
    source: "ai_document_classifier",
  };
}

export async function createInboxDocument(input: InboxCreateInput): Promise<DbResult<InboxDocumentRecord>> {
  const possibleDuplicate = await findPossibleDuplicate({
    filename: input.originalFilename,
    fileSize: input.fileSize,
    storagePath: input.storagePath,
  });
  const duplicateData = possibleDuplicate.ok ? possibleDuplicate.data : null;
  const payload = {
    original_filename: input.originalFilename,
    mime_type: input.mimeType,
    file_size: input.fileSize,
    uploaded_by: input.uploadedBy || "F. Javier Bocanegra Sanjuan",
    uploaded_at: new Date().toISOString(),
    detected_type: input.selectedType || "other",
    selected_type: input.selectedType,
    processing_status: "uploaded",
    review_status: "pendiente_revision",
    classification_source: input.selectedType ? "manual" : undefined,
    upload_group_id: input.uploadGroupId,
    upload_sequence: input.uploadSequence,
    storage_bucket: input.storageBucket,
    storage_path: input.storagePath,
    storage_status: input.storageStatus || "metadata_only",
    possible_duplicate: Boolean(duplicateData),
    duplicate_of: duplicateData?.id,
    duplicate_score: duplicateData?.score,
    source: "admin-kiosko-inbox",
  };

  const created = await inboxRequest<UploadedDocumentRow[]>({
    method: "POST",
    query: `?select=${inboxSelect}`,
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=representation",
    },
  });

  if (!created.ok) return created;
  const row = created.data[0];
  if (!row) return { ok: false, error: "Supabase no devolvió el documento creado." };
  return { ok: true, data: toInboxDocument(row) };
}

export async function queueInboxDocument(input: InboxQueueInput): Promise<DbResult<InboxDocumentRecord>> {
  const validationError = validateInboxFile(input.file);
  if (validationError) return { ok: false, error: validationError };

  const groupId = input.uploadGroupId || createInboxUploadGroupId();
  const now = new Date();
  const storagePath = [
    storageFolderForType(input.selectedType),
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    groupId,
    `${input.uploadSequence ?? Date.now()}-${safeFilename(input.file.name)}`,
  ].join("/");
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const upload = await uploadInboxStorageObject(storagePath, buffer, input.file.type);

  const created = await createInboxDocument({
    originalFilename: input.file.name,
    mimeType: input.file.type,
    fileSize: input.file.size,
    uploadedBy: input.responsible,
    selectedType: input.selectedType,
    uploadGroupId: groupId,
    uploadSequence: input.uploadSequence,
    storageBucket: INBOX_BUCKET,
    storagePath: upload.ok ? storagePath : undefined,
    storageStatus: upload.ok ? "stored" : "metadata_only",
  });

  if (!created.ok) return created;
  if (!upload.ok) {
    await updateInboxStatus({
      uploadedDocumentId: created.data.uploadedDocumentId,
      status: "failed",
      processingError: upload.error,
    });
  }

  return created;
}

export async function classifyQueuedInboxDocument(uploadedDocumentId: string): Promise<DbResult<InboxDocumentRecord>> {
  const document = await getInboxDocument(uploadedDocumentId);
  if (!document.ok) return document;
  if (!document.data) return { ok: false, error: "Documento de bandeja no encontrado." };

  const classification = classifyInboxDocumentCandidate({
    filename: document.data.filename,
    mimeType: document.data.mimeType,
    selectedType: document.data.selectedType,
  });
  const status: InboxDocumentStatus = classification.confidence >= 0.86 ? "classified" : "needs_review";
  const updated = await updateInboxStatus({
    uploadedDocumentId,
    status,
    detectedType: classification.detectedType,
    selectedType: classification.confidence >= 0.86 ? classification.detectedType : document.data.selectedType,
    classificationSource: classification.source,
    classificationConfidence: classification.confidence,
    classificationReason: classification.reason,
  });

  if (!updated.ok) return updated;
  const refreshed = await getInboxDocument(uploadedDocumentId);
  if (!refreshed.ok) return refreshed;
  if (!refreshed.data) return { ok: false, error: "Documento de bandeja no encontrado tras clasificar." };
  return { ok: true, data: refreshed.data };
}

export async function updateInboxStatus(input: InboxStatusUpdate): Promise<DbResult<null>> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    processing_status: input.status,
  };

  if (input.selectedType !== undefined) payload.selected_type = input.selectedType;
  if (input.detectedType !== undefined) payload.detected_type = input.detectedType;
  if (input.classificationSource !== undefined) payload.classification_source = input.classificationSource;
  if (input.classificationConfidence !== undefined) payload.classification_confidence = input.classificationConfidence;
  if (input.classificationReason !== undefined) payload.classification_reason = input.classificationReason;
  if (input.processingError !== undefined) payload.processing_error = input.processingError;
  if (input.possibleDuplicate !== undefined) payload.possible_duplicate = input.possibleDuplicate;
  if (input.duplicateOf !== undefined) payload.duplicate_of = input.duplicateOf;
  if (input.duplicateScore !== undefined) payload.duplicate_score = input.duplicateScore;
  if (input.status === "needs_review" || input.status === "classified") payload.review_status = "pendiente_revision";
  if (input.status === "confirmed" || input.status === "imported") payload.review_status = "confirmado";
  if (input.status === "failed") payload.review_status = "rechazado";
  if (input.status === "archived") payload.review_status = "anulado";

  const updated = await inboxRequest<undefined>({
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(input.uploadedDocumentId)}`,
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=minimal",
    },
  });

  if (!updated.ok) return updated;
  return { ok: true, data: null };
}

export async function listInboxOcrQueue(limit = 10): Promise<DbResult<InboxOcrQueueDocument[]>> {
  const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
  const rows = await inboxRequest<UploadedDocumentRow[]>({
    method: "GET",
    query: `?select=${inboxSelect}&or=(processing_status.eq.uploaded,ocr_reprocess_requested.eq.true)&processing_status=not.in.(confirmed,imported,archived)&storage_path=not.is.null&order=uploaded_at.asc&limit=${safeLimit}`,
  });

  if (!rows.ok) return rows;
  return { ok: true, data: rows.data.map(toOcrQueueDocument) };
}

export async function listInboxOcrDocumentsByIds(uploadedDocumentIds: string[]): Promise<DbResult<InboxOcrQueueDocument[]>> {
  const ids = uploadedDocumentIds.filter(Boolean);
  if (!ids.length) return { ok: false, error: "No hay documentos seleccionados para OCR." };
  const rows = await inboxRequest<UploadedDocumentRow[]>({
    method: "GET",
    query: `?select=${inboxSelect}&id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})`,
  });

  if (!rows.ok) return rows;
  return { ok: true, data: rows.data.map(toOcrQueueDocument) };
}

export async function downloadInboxDocumentOriginal(document: InboxOcrQueueDocument): Promise<DbResult<Buffer>> {
  if (!document.storagePath) return { ok: false, error: "El documento no tiene archivo original privado asociado." };
  return downloadInboxStorageObject(document.storagePath);
}

export async function markInboxOcrStarted(document: InboxOcrQueueDocument): Promise<DbResult<null>> {
  const updated = await inboxRequest<undefined>({
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(document.uploadedDocumentId)}`,
    body: JSON.stringify({
      updated_at: new Date().toISOString(),
      processing_status: "processing",
      review_status: "pendiente_revision",
      processing_error: null,
      ocr_started_at: new Date().toISOString(),
      ocr_completed_at: null,
      ocr_attempts: (document.ocrAttempts || 0) + 1,
      ocr_reprocess_requested: false,
    }),
    headers: {
      Prefer: "return=minimal",
    },
  });

  if (!updated.ok) return updated;
  return { ok: true, data: null };
}

export async function markInboxOcrFailed(document: InboxOcrQueueDocument, error: string): Promise<DbResult<null>> {
  const updated = await inboxRequest<undefined>({
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(document.uploadedDocumentId)}`,
    body: JSON.stringify({
      updated_at: new Date().toISOString(),
      processing_status: "failed",
      review_status: "rechazado",
      processing_error: error,
      ocr_completed_at: new Date().toISOString(),
      ocr_reprocess_requested: false,
    }),
    headers: {
      Prefer: "return=minimal",
    },
  });

  if (!updated.ok) return updated;
  return { ok: true, data: null };
}

export async function saveInboxOcrResult(result: InboxOcrStructuredResult): Promise<DbResult<null>> {
  const updated = await inboxRequest<undefined>({
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(result.uploadedDocumentId)}`,
    body: JSON.stringify({
      updated_at: new Date().toISOString(),
      processing_status: result.status,
      review_status: "pendiente_revision",
      detected_type: result.detectedType,
      selected_type: result.status === "classified" ? result.detectedType : undefined,
      classification_source: result.classificationSource,
      classification_confidence: result.confidence,
      classification_reason: result.classificationReason,
      corrections: result.corrections,
      ocr_json: result.ocrJson,
      ocr_text: result.rawText,
      ocr_model: result.model,
      ocr_warnings: result.warnings,
      ocr_completed_at: new Date().toISOString(),
      ocr_reprocess_requested: false,
      processing_error: null,
    }),
    headers: {
      Prefer: "return=minimal",
    },
  });

  if (!updated.ok) return updated;
  return { ok: true, data: null };
}

export async function confirmInboxDocument(input: InboxConfirmation): Promise<DbResult<null>> {
  const confirmed = await inboxRequest<undefined>({
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(input.uploadedDocumentId)}`,
    body: JSON.stringify({
      updated_at: new Date().toISOString(),
      processing_status: "confirmed",
      review_status: "confirmado",
      confirmed_type: input.confirmedType,
      selected_type: input.confirmedType,
      corrections: input.corrections || {},
      confirmed_by: input.responsible || "F. Javier Bocanegra Sanjuan",
      confirmed_at: new Date().toISOString(),
    }),
    headers: {
      Prefer: "return=minimal",
    },
  });

  if (!confirmed.ok) return confirmed;
  return { ok: true, data: null };
}

export async function archiveInboxDocument(uploadedDocumentId: string, responsible?: string): Promise<DbResult<null>> {
  const archived = await inboxRequest<undefined>({
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(uploadedDocumentId)}`,
    body: JSON.stringify({
      updated_at: new Date().toISOString(),
      processing_status: "archived",
      review_status: "anulado",
      archived_by: responsible || "F. Javier Bocanegra Sanjuan",
      archived_at: new Date().toISOString(),
    }),
    headers: {
      Prefer: "return=minimal",
    },
  });

  if (!archived.ok) return archived;
  return { ok: true, data: null };
}

export async function listInboxDocuments(filters: InboxListFilters = {}): Promise<DbResult<InboxDocumentRecord[]>> {
  const limit = Math.max(1, Math.min(200, Math.round(filters.limit || 50)));
  const params = [
    `select=${inboxSelect}`,
    "order=uploaded_at.desc",
    `limit=${limit}`,
  ];

  if (filters.status && filters.status !== "all") params.push(`processing_status=eq.${encodeURIComponent(filters.status)}`);
  if (filters.type && filters.type !== "all") params.push(`or=(selected_type.eq.${encodeURIComponent(filters.type)},confirmed_type.eq.${encodeURIComponent(filters.type)},detected_type.eq.${encodeURIComponent(filters.type)})`);
  if (filters.uploadGroupId) params.push(`upload_group_id=eq.${encodeURIComponent(filters.uploadGroupId)}`);

  const rows = await inboxRequest<UploadedDocumentRow[]>({
    method: "GET",
    query: `?${params.join("&")}`,
  });

  if (!rows.ok) return rows;
  return attachReconciliations(rows.data.map(toInboxDocument));
}

export async function getInboxDocument(uploadedDocumentId: string): Promise<DbResult<InboxDocumentRecord | null>> {
  const rows = await inboxRequest<UploadedDocumentRow[]>({
    method: "GET",
    query: `?select=${inboxSelect}&id=eq.${encodeURIComponent(uploadedDocumentId)}&limit=1`,
  });

  if (!rows.ok) return rows;
  const document = rows.data[0] ? toInboxDocument(rows.data[0]) : null;
  if (!document) return { ok: true, data: null };
  const withReconciliation = await attachReconciliations([document]);
  if (!withReconciliation.ok) return withReconciliation;
  return { ok: true, data: withReconciliation.data[0] || document };
}

export async function bulkUpdateInboxDocuments(input: InboxBulkAction): Promise<DbResult<{ updated: number }>> {
  const ids = input.uploadedDocumentIds.filter(Boolean);
  if (!ids.length) return { ok: false, error: "No hay documentos seleccionados." };

  const result = await inboxRpcRequest<{ updated?: number }>("admin_inbox_bulk_update", {
    p_document_ids: ids,
    p_action: input.action,
    p_confirmed_type: input.confirmedType || null,
    p_duplicate_of: input.duplicateOf || null,
    p_responsible: input.responsible || "F. Javier Bocanegra Sanjuan",
  });

  if (!result.ok) return result;
  return { ok: true, data: { updated: Number(result.data?.updated || 0) } };
}

export async function getInboxMetrics(): Promise<DbResult<InboxMetrics>> {
  const documents = await listInboxDocuments({ limit: 200 });
  if (!documents.ok) return documents;
  const today = new Date().toISOString().slice(0, 10);
  const importedToday = documents.data.filter((document) => document.status === "imported" && document.importedAt?.startsWith(today)).length;
  const ocrCompletedToday = documents.data.filter((document) => document.ocrCompletedAt?.startsWith(today)).length;
  const ocrWarnings = documents.data.filter((document) => document.ocrWarnings?.length).length;

  return {
    ok: true,
    data: {
      pending: documents.data.filter((document) => document.status === "uploaded" || document.status === "classified").length,
      ocr: documents.data.filter((document) => document.status === "processing").length,
      review: documents.data.filter((document) => document.status === "needs_review").length,
      duplicates: documents.data.filter((document) => document.possibleDuplicate).length,
      errors: documents.data.filter((document) => document.status === "failed" || document.importStatus === "failed").length,
      importedToday,
      ocrCompletedToday,
      ocrWarnings,
      averageReviewMinutes: null,
      averageConfirmationMinutes: documents.data.some((document) => document.importDurationMs)
        ? Math.round(documents.data.reduce((sum, document) => sum + Number(document.importDurationMs || 0), 0) / Math.max(1, documents.data.filter((document) => document.importDurationMs).length) / 60000)
        : null,
    },
  };
}

export async function getInboxDocumentTimeline(uploadedDocumentId: string): Promise<DbResult<InboxTimelineItem[]>> {
  const document = await getInboxDocument(uploadedDocumentId);
  if (!document.ok) return document;
  if (!document.data) return { ok: false, error: "Documento no encontrado." };
  const events = await findDomainEventsByCorrelationId(document.data.uploadGroupId || uploadedDocumentId);
  const storedEvents = events.ok ? events.data.filter((event) => {
    const trace = event.trace || {};
    return trace.documentId === uploadedDocumentId || event.correlation_id === uploadedDocumentId || event.correlation_id === document.data?.uploadGroupId;
  }) : [];
  const eventByType = new Map(storedEvents.map((event) => [event.event_type, event]));
  const status = document.data.status;

  return {
    ok: true,
    data: [
      { id: "received", label: "Documento recibido", at: document.data.uploadedAt, status: "done", detail: document.data.filename },
      { id: "classified", label: "Clasificado", at: eventByType.get("InboxDocumentClassified")?.occurred_at, status: ["classified", "needs_review", "confirmed", "imported"].includes(status) ? "done" : "pending", detail: document.data.classificationReason },
      { id: "ocr", label: "OCR", at: eventByType.get("InboxOcrCompleted")?.occurred_at || document.data.ocrCompletedAt, status: status === "processing" ? "current" : status === "failed" ? "failed" : document.data.ocrCompletedAt ? "done" : "pending", detail: document.data.ocrWarnings?.join(" · ") || "OCR estructurado de bandeja documental." },
      { id: "review", label: "Revisión", status: status === "needs_review" ? "current" : ["confirmed", "imported"].includes(status) ? "done" : "pending" },
      { id: "confirmation", label: "Confirmación", at: eventByType.get("InboxReviewCompleted")?.occurred_at, status: ["confirmed", "imported"].includes(status) ? "done" : "pending" },
      { id: "import", label: "Importación", at: document.data.importedAt, status: status === "imported" ? "done" : status === "failed" ? "failed" : "pending" },
    ],
  };
}

export async function listInboxGroups(limit = 50): Promise<DbResult<InboxGroup[]>> {
  const documents = await listInboxDocuments({ limit: Math.max(1, Math.min(500, Math.round(limit * 10))) });
  if (!documents.ok) return documents;

  const groups = new Map<string, InboxGroup>();
  for (const document of documents.data) {
    if (!document.uploadGroupId) continue;
    const current = groups.get(document.uploadGroupId) || {
      uploadGroupId: document.uploadGroupId,
      documentCount: 0,
      latestUploadedAt: null,
      statuses: [],
      filenames: [],
    };

    current.documentCount += 1;
    current.statuses = Array.from(new Set([...current.statuses, document.status]));
    current.filenames.push(document.filename);
    if (document.uploadedAt && (!current.latestUploadedAt || document.uploadedAt > current.latestUploadedAt)) {
      current.latestUploadedAt = document.uploadedAt;
    }
    groups.set(document.uploadGroupId, current);
  }

  return { ok: true, data: Array.from(groups.values()).slice(0, limit) };
}
