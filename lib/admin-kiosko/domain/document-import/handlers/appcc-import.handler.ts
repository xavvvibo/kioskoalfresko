import {
  handlerResult,
  markInboxDocumentAsSanitaryArchive,
} from "../../../repositories/document-import.repository";
import type { DocumentImportHandler } from "../contracts";
import { appccDocumentTypes } from "../contracts";

function domainTypeForDocument(type: string) {
  if (type === "technical_sheet") return "technical_sheet";
  if (type === "maintenance_document") return "maintenance_document";
  if (type === "training_document") return "training_document";
  return "appcc_record";
}

export const appccImportHandler: DocumentImportHandler = {
  name: "AppccImportHandler",
  supports(context) {
    return appccDocumentTypes.includes(context.confirmedType);
  },
  async execute(context) {
    const startedAt = Date.now();
    const domainType = domainTypeForDocument(context.confirmedType);
    const archived = await markInboxDocumentAsSanitaryArchive(context, domainType);
    if (!archived.ok) {
      return handlerResult({
        startedAt,
        handler: this.name,
        status: "failed",
        message: archived.error,
        errors: [archived.error],
      });
    }

    return handlerResult({
      startedAt,
      handler: this.name,
      status: context.expiryDate ? "success" : "warning",
      message: "Documento sanitario archivado y disponible para inspección.",
      recordType: domainType,
      recordId: context.uploadedDocumentId,
      warnings: context.expiryDate ? [] : ["Fecha de revisión/caducidad documental pendiente de informar."],
    });
  },
};
