import {
  ensureInventoryLotFromInbox,
  handlerResult,
} from "../../../repositories/document-import.repository";
import type { DocumentImportHandler } from "../contracts";
import { purchaseDeliveryNoteTypes, supplierTraceabilityLabelTypes } from "../contracts";

export const inventoryLotHandler: DocumentImportHandler = {
  name: "InventoryLotHandler",
  supports(context) {
    return [...purchaseDeliveryNoteTypes, ...supplierTraceabilityLabelTypes].includes(context.confirmedType);
  },
  async execute(context) {
    const startedAt = Date.now();
    const lot = await ensureInventoryLotFromInbox(context);
    if (!lot.ok) {
      return handlerResult({
        startedAt,
        handler: this.name,
        status: "needs_review",
        message: lot.error,
        warnings: [lot.error],
      });
    }

    return handlerResult({
      startedAt,
      handler: this.name,
      status: lot.data.created ? "success" : "warning",
      message: lot.data.created
        ? "Lote FEFO preparado para revisión de inventario."
        : "Lote FEFO ya existía; no se ha duplicado.",
      recordType: "inventory_lot",
      recordId: lot.data.id,
      warnings: context.expiryDate ? [] : ["Caducidad pendiente: el lote requiere revisión APPCC antes de etiqueta o uso."],
    });
  },
};
