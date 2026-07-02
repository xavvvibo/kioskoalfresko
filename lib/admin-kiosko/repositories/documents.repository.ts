import { documentTypeRoute, type DocumentType } from "../domain/document-types";

/**
 * Documents repository.
 *
 * Gestiona documentos originales privados, metadatos documentales y URLs
 * firmadas. Se mantiene como proxy del nucleo legacy hasta completar la
 * separacion interna de persistencia.
 *
 * Arquitectura preparada para subida bulk:
 * - admin_uploaded_documents es la raiz documental unica por archivo.
 * - cada imagen/PDF subido debe crear un registro propio antes de OCR.
 * - las tablas especificas deben referenciar uploaded_document_id.
 * - el tipo puede ser detectado por IA y corregido manualmente antes de
 *   confirmar impactos en contabilidad, compras, APPCC, inventario o etiquetas.
 */
export const DOCUMENT_PROCESSING_STATUSES = [
  "uploaded",
  "processing",
  "classified",
  "needs_review",
  "confirmed",
  "imported",
  "failed",
  "archived",
] as const;

export type DocumentProcessingStatus = (typeof DOCUMENT_PROCESSING_STATUSES)[number];

export {
  DOCUMENT_TYPE_ALIASES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  documentTypeRoute,
  normalizeDocumentType,
  type DocumentType,
} from "../domain/document-types";

export type BulkDocumentQueueItem = {
  uploaded_document_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  detected_type?: DocumentType;
  selected_type?: DocumentType;
  processing_status: DocumentProcessingStatus;
  upload_group_id?: string;
};

const legacyReviewStatusMap: Record<string, DocumentProcessingStatus> = {
  pendiente_revision: "needs_review",
  revisado: "needs_review",
  confirmado: "confirmed",
  rechazado: "failed",
  anulado: "archived",
  importado: "imported",
};

export function normalizeDocumentProcessingStatus(status?: string | null): DocumentProcessingStatus {
  if (!status) return "uploaded";
  if (status === "revisado") return "needs_review";
  if (status === "confirmado") return "confirmed";
  if (status === "importado") return "imported";
  if (DOCUMENT_PROCESSING_STATUSES.includes(status as DocumentProcessingStatus)) {
    return status as DocumentProcessingStatus;
  }

  return legacyReviewStatusMap[status] || "needs_review";
}

export function nextDocumentRouteForType(type?: string | null) {
  return documentTypeRoute(type);
}

export {
  createUploadedDocument,
  getUploadedDocumentById,
  getUploadedDocumentSignedUrl,
  getUploadedDocuments,
  storeOriginalOcrDocument,
  updateUploadedDocumentReview,
} from "./legacy-core";
