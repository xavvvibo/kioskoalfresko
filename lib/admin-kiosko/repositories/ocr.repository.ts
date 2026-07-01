/**
 * OCR repository.
 *
 * Encapsula documentos detectados por IA, logs de procesamiento y elementos de
 * trazabilidad extraidos por OCR. Delegacion temporal al nucleo legacy.
 */
export {
  createAiProcessingLog,
  createAiSupplierDocument,
  createAiTraceabilityItem,
  getRecentAiProcessingLogs,
  getRecentAiSupplierDocuments,
} from "./legacy-core";
