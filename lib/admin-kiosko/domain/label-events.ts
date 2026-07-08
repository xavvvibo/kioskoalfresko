import type { PrintJobMetadata, PrintLabelData, PrintLabelTemplate } from "@/lib/admin-kiosko/printing/print-payload";

export const implementedLabelEvents = [
  "ProductionBatchClosed",
  "PrepCreated",
  "GoodsReceived",
  "LabelRequested",
] as const;

export const preparedLabelEvents = [
  "InventoryAdjusted",
  "RecipeProduced",
  "RecipeConsumed",
  "TransferCreated",
  "WasteCreated",
  "CustomerOrderPacked",
  "BatchSplit",
  "BatchRepacked",
  "BatchReturned",
  "BatchChanged",
] as const;

export type LabelDecision =
  | {
      shouldPrint: true;
      reason: string;
      input: {
        printerKey: string;
        template: PrintLabelTemplate;
        data: PrintLabelData;
        metadata: PrintJobMetadata;
      };
    }
  | {
      shouldPrint: false;
      reason: string;
    };

export function productionLabelIdempotencyKey(batchId: string, reason: string) {
  return `production_label:${batchId}:${reason}:prep_label_professional`;
}

export function manualLabelIdempotencyKey(sourceId: string, reason: string) {
  return `manual_label:${sourceId}:${reason}`;
}

export function prepLabelIdempotencyKey(batchCode: string, reason: string) {
  return `prep_label:${batchCode}:${reason}`;
}

export function goodsReceivedLabelIdempotencyKey(receiptOrBatchId: string, productKey: string) {
  return `goods_received:${receiptOrBatchId}:${productKey}`;
}
