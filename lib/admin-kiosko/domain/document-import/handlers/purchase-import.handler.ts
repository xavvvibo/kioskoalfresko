import {
  ensureAccountingDocumentFromInbox,
  handlerResult,
} from "../../../repositories/document-import.repository";
import type { DocumentImportHandler } from "../contracts";
import { purchaseInvoiceTypes } from "../contracts";

export const purchaseImportHandler: DocumentImportHandler = {
  name: "PurchaseImportHandler",
  supports(context) {
    return purchaseInvoiceTypes.includes(context.confirmedType);
  },
  async execute(context) {
    const startedAt = Date.now();
    const created = await ensureAccountingDocumentFromInbox(context);
    if (!created.ok) {
      return handlerResult({
        startedAt,
        handler: this.name,
        status: "needs_review",
        message: created.error,
        warnings: [created.error],
      });
    }

    return handlerResult({
      startedAt,
      handler: this.name,
      status: created.data.created ? "success" : "warning",
      message: created.data.created
        ? "Documento de compra creado y preparado para conciliación."
        : "Documento de compra ya existía; no se ha duplicado.",
      recordType: "purchase_invoice",
      recordId: created.data.id,
      warnings: created.data.created ? [] : ["Importación idempotente: documento existente reutilizado."],
    });
  },
};
