import {
  ensureAccountingDocumentFromInbox,
  handlerResult,
} from "../../../repositories/document-import.repository";
import type { DocumentImportHandler } from "../contracts";
import { purchaseInvoiceTypes } from "../contracts";

export const accountingImportHandler: DocumentImportHandler = {
  name: "AccountingImportHandler",
  supports(context) {
    return purchaseInvoiceTypes.includes(context.confirmedType);
  },
  async execute(context) {
    const startedAt = Date.now();
    const accounting = await ensureAccountingDocumentFromInbox(context);
    if (!accounting.ok) {
      return handlerResult({
        startedAt,
        handler: this.name,
        status: "needs_review",
        message: accounting.error,
        warnings: [accounting.error],
      });
    }

    return handlerResult({
      startedAt,
      handler: this.name,
      status: "success",
      message: "Conciliación contable preparada.",
      recordType: "accounting_document",
      recordId: accounting.data.id,
      warnings: accounting.data.created ? [] : ["Documento contable existente reutilizado."],
    });
  },
};
