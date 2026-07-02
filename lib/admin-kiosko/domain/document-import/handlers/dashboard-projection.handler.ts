import { handlerResult } from "../../../repositories/document-import.repository";
import type { DocumentImportHandler } from "../contracts";

export const dashboardProjectionHandler: DocumentImportHandler = {
  name: "DashboardProjectionHandler",
  supports() {
    return true;
  },
  async execute(context) {
    const startedAt = Date.now();
    return handlerResult({
      startedAt,
      handler: this.name,
      status: "success",
      message: "Proyección de dashboard disponible desde resultado de importación documental.",
      recordType: "dashboard_projection",
      recordId: context.uploadedDocumentId,
    });
  },
};
