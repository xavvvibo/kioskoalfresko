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
  "needs_review",
  "confirmed",
  "failed",
  "archived",
] as const;

export type DocumentProcessingStatus = (typeof DOCUMENT_PROCESSING_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "invoice",
  "delivery_note",
  "receipt",
  "supplier_traceability_label",
  "sanitary_document",
  "technical_sheet",
  "supplier_contract",
  "maintenance_document",
  "training_document",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

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
};

const legacyDocumentTypeMap: Record<string, DocumentType> = {
  factura: "invoice",
  invoice: "invoice",
  albaran: "delivery_note",
  delivery_note: "delivery_note",
  recibo: "receipt",
  receipt: "receipt",
  etiqueta: "supplier_traceability_label",
  etiqueta_lote: "supplier_traceability_label",
  supplier_traceability_label: "supplier_traceability_label",
  certificado: "sanitary_document",
  sanitary_document: "sanitary_document",
  ficha_tecnica: "technical_sheet",
  technical_sheet: "technical_sheet",
  contrato: "supplier_contract",
  supplier_contract: "supplier_contract",
  mantenimiento: "maintenance_document",
  maintenance_document: "maintenance_document",
  formacion: "training_document",
  training_document: "training_document",
  otro: "other",
  other: "other",
};

export function normalizeDocumentProcessingStatus(status?: string | null): DocumentProcessingStatus {
  if (!status) return "uploaded";
  if (DOCUMENT_PROCESSING_STATUSES.includes(status as DocumentProcessingStatus)) {
    return status as DocumentProcessingStatus;
  }

  return legacyReviewStatusMap[status] || "needs_review";
}

export function normalizeDocumentType(type?: string | null): DocumentType {
  if (!type) return "other";
  return legacyDocumentTypeMap[type] || legacyDocumentTypeMap[type.toLowerCase()] || "other";
}

export function nextDocumentRouteForType(type?: string | null) {
  const normalized = normalizeDocumentType(type);

  if (normalized === "invoice" || normalized === "receipt") return "/admin-kiosko/contabilidad";
  if (normalized === "delivery_note") return "/admin-kiosko/compras";
  if (normalized === "supplier_traceability_label") return "/admin-kiosko/trazabilidad";
  if (normalized === "maintenance_document") return "/admin-kiosko/mantenimiento";
  if (normalized === "training_document" || normalized === "sanitary_document" || normalized === "technical_sheet" || normalized === "supplier_contract") {
    return "/admin-kiosko/documentacion";
  }

  return "/admin-kiosko/compras";
}

export {
  createUploadedDocument,
  getUploadedDocumentById,
  getUploadedDocumentSignedUrl,
  getUploadedDocuments,
  storeOriginalOcrDocument,
  updateUploadedDocumentReview,
} from "./legacy-core";
