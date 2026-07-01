/**
 * Accounting repository.
 *
 * Contratos de documentos contables, lineas, conciliacion y correcciones de
 * revision OCR. La logica se conserva intacta en legacy-core.
 */
export {
  createAccountingDocument,
  createAccountingDocumentItem,
  createDocumentCorrections,
  getAccountingDocumentById,
  getAccountingDocumentItems,
  getAccountingDocuments,
  updateAccountingReconciliationStatus,
} from "./legacy-core";
