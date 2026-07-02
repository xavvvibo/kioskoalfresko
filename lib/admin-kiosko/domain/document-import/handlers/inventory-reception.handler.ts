import {
  ensureGoodsReceptionFromInbox,
  handlerResult,
} from "../../../repositories/document-import.repository";
import type { DocumentImportHandler } from "../contracts";
import { purchaseDeliveryNoteTypes } from "../contracts";

export const inventoryReceptionHandler: DocumentImportHandler = {
  name: "InventoryReceptionHandler",
  supports(context) {
    return purchaseDeliveryNoteTypes.includes(context.confirmedType);
  },
  async execute(context) {
    const startedAt = Date.now();
    const reception = await ensureGoodsReceptionFromInbox(context);
    if (!reception.ok) {
      return handlerResult({
        startedAt,
        handler: this.name,
        status: "needs_review",
        message: reception.error,
        warnings: [reception.error],
      });
    }

    return handlerResult({
      startedAt,
      handler: this.name,
      status: reception.data.created ? "success" : "warning",
      message: reception.data.created
        ? "Recepción APPCC creada. Stock definitivo pendiente de validación."
        : "Recepción APPCC ya existía; no se ha duplicado.",
      recordType: "inventory_reception",
      recordId: reception.data.id,
      warnings: ["No incrementa stock definitivo hasta validación operativa."],
    });
  },
};
