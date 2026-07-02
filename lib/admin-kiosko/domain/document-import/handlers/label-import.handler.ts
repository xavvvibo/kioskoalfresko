import {
  ensureInventoryLotFromInbox,
  ensurePreparedLabelFromInbox,
  handlerResult,
} from "../../../repositories/document-import.repository";
import type { DocumentImportHandler } from "../contracts";
import { purchaseDeliveryNoteTypes, supplierTraceabilityLabelTypes } from "../contracts";

export const labelImportHandler: DocumentImportHandler = {
  name: "LabelImportHandler",
  supports(context) {
    return [...purchaseDeliveryNoteTypes, ...supplierTraceabilityLabelTypes].includes(context.confirmedType);
  },
  async execute(context) {
    const startedAt = Date.now();
    const lot = await ensureInventoryLotFromInbox(context);
    const label = await ensurePreparedLabelFromInbox(context, lot.ok ? lot.data.id : undefined);
    if (!label.ok) {
      return handlerResult({
        startedAt,
        handler: this.name,
        status: "needs_review",
        message: label.error,
        warnings: [label.error],
      });
    }

    return handlerResult({
      startedAt,
      handler: this.name,
      status: label.data.created ? "success" : "warning",
      message: label.data.created ? "Etiqueta de recepción preparada." : "Etiqueta ya preparada anteriormente; no se ha duplicado.",
      recordType: "traceability_label",
      recordId: label.data.id,
      warnings: context.expiryDate ? [] : ["Etiqueta requiere revisar caducidad antes de imprimir."],
    });
  },
};
