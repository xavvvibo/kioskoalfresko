/**
 * Documents repository.
 *
 * Gestiona documentos originales privados, metadatos documentales y URLs
 * firmadas. Se mantiene como proxy del nucleo legacy hasta completar la
 * separacion interna de persistencia.
 */
export {
  createUploadedDocument,
  getUploadedDocumentById,
  getUploadedDocumentSignedUrl,
  getUploadedDocuments,
  storeOriginalOcrDocument,
  updateUploadedDocumentReview,
} from "./legacy-core";
