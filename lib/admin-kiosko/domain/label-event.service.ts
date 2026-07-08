import "server-only";

import {
  DEFAULT_GODEX_G500_PRINTER_KEY,
  printService,
  type PrintJob,
  type PrintLabelTemplate,
} from "@/lib/admin-kiosko/printing/print-service";
import { getPrintJobsByProductionBatch, getRecentPrintJobs } from "@/lib/admin-kiosko/repositories/print-jobs.repository";
import type { AdminKioskoDomainEvent } from "./events";
import {
  goodsReceivedLabelIdempotencyKey,
  prepLabelIdempotencyKey,
  productionLabelIdempotencyKey,
  type LabelDecision,
} from "./label-events";

export type LabelEventResult =
  | { ok: true; skipped: boolean; data: PrintJob; decision: LabelDecision }
  | { ok: false; error: string; decision: LabelDecision };

type ProductionBatchLabelInput = {
  prepName: string;
  productionDate: string;
  productionTime: string;
  expiryDate: string;
  batchCode: string;
  productionBatchId: string;
  responsibleName: string;
  storageState: string;
  quantity?: number;
  unit?: string;
  createdFrom: string;
  reason: string;
  reprintReason?: string;
};

type PrepLabelInput = {
  template?: PrintLabelTemplate;
  prepName: string;
  productionDateTime?: string;
  expiryDateTime?: string;
  shelfLifeDays?: number;
  batchCode: string;
  responsibleName?: string;
  storageCondition?: string;
  requestedBy?: string;
  reason: string;
  copies?: number;
};

type ManualGodexLabelInput = {
  product: string;
  batch: string;
  model: string;
  supplier?: string;
  responsible: string;
  productionDateTime?: string;
  expiryDateTime?: string;
  sourceId: string;
  sourceType: string;
  copies?: number;
  requestId?: string;
};

type GoodsReceivedLabelInput = {
  receiptId?: string;
  receptionId?: string;
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  batchCode?: string;
  quantity?: number;
  unit?: string;
  receivedAt?: string;
  expiryDate?: string;
  storageCondition?: string;
  receivedBy?: string;
  idempotencyKey?: string;
  uploadedDocumentId?: string;
  items?: Array<{
    productName: string;
    batchNumber?: string;
    quantity?: number;
    unit?: string;
    expiryDate?: string;
  }>;
};

function dateTimeFromDateAndTime(date: string, time: string) {
  return `${date}T${(time || "00:00").slice(0, 5)}`;
}

function storageConditionFromState(value: string) {
  if (value === "congelado") return "Congelado -18 C";
  if (value === "descongelado") return "Descongelado 0-4 C";
  return "Refrigerado 0-4 C";
}

function manualRequestKey(...parts: Array<string | number | undefined>) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(":")
    .replace(/\s+/g, "_")
    .slice(0, 160);
}

async function findExistingByIdempotencyKey(idempotencyKey: string) {
  if (!idempotencyKey) return { ok: true as const, data: null };
  const existing = await getRecentPrintJobs({ limit: 1, idempotencyKey });
  if (!existing.ok) return existing;
  return { ok: true as const, data: existing.data[0] || null };
}

async function executeLabelDecision(decision: LabelDecision): Promise<LabelEventResult> {
  if (!decision.shouldPrint) return { ok: false, error: decision.reason, decision };

  const printResult = await printService.printLabel(decision.input);
  if (!printResult.ok) return { ok: false, error: printResult.error, decision };
  return { ok: true, skipped: false, data: printResult.data, decision };
}

export const labelEventService = {
  decideProductionBatchClosed(input: ProductionBatchLabelInput): LabelDecision {
    if (!input.expiryDate) {
      return { shouldPrint: false, reason: "production_batch_without_expiry" };
    }

    const idempotencyKey = productionLabelIdempotencyKey(input.productionBatchId, input.reason);
    return {
      shouldPrint: true,
      reason: input.reason,
      input: {
        printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
        template: "prep_label_professional",
        data: {
          prepName: input.prepName,
          productionDateTime: dateTimeFromDateAndTime(input.productionDate, input.productionTime),
          expiryDateTime: dateTimeFromDateAndTime(input.expiryDate, input.productionTime),
          batchCode: input.batchCode,
          responsibleName: input.responsibleName,
          storageCondition: storageConditionFromState(input.storageState),
          brandName: "KIOSKO ALFRESKO",
          quantity: input.quantity,
          unit: input.unit,
          qrValue: `ERP:prep_batch:${input.batchCode}`,
          includeQr: true,
        },
        metadata: {
          requestedBy: input.responsibleName || "admin-kiosko",
          module: "production",
          sourceType: "production_batch",
          sourceId: input.productionBatchId,
          createdFrom: input.createdFrom,
          reason: input.reason,
          batchCode: input.batchCode,
          idempotencyKey,
        },
      },
    };
  },

  async requestProductionBatchClosedLabel(input: ProductionBatchLabelInput): Promise<LabelEventResult> {
    const decision = this.decideProductionBatchClosed(input);
    if (!decision.shouldPrint) return { ok: false, error: decision.reason, decision };

    const idempotencyKey = decision.input.metadata.idempotencyKey || "";
    const existing = await getPrintJobsByProductionBatch({
      batchId: input.productionBatchId,
      batchCode: input.batchCode,
      template: decision.input.template,
      reason: input.reason,
      idempotencyKey,
      limit: 1,
    });
    if (existing.ok && existing.data[0]) {
      return { ok: true, skipped: true, data: existing.data[0], decision };
    }

    return executeLabelDecision(decision);
  },

  async requestProductionBatchManualLabel(input: ProductionBatchLabelInput): Promise<LabelEventResult> {
    const decision = this.decideProductionBatchClosed(input);
    if (decision.shouldPrint) {
      decision.input.metadata.idempotencyKey = manualRequestKey(
        "production_manual_label",
        input.productionBatchId,
        input.reason,
        input.reprintReason,
        decision.input.template,
      );
      decision.input.metadata.createdFrom = input.createdFrom || "production_batch_detail";
      decision.input.metadata.reprintReason = input.reprintReason;
    }

    return executeLabelDecision(decision);
  },

  decidePrepCreated(input: PrepLabelInput): LabelDecision {
    if (!input.prepName) return { shouldPrint: false, reason: "prep_without_name" };
    if (!input.batchCode) return { shouldPrint: false, reason: "prep_without_batch_code" };

    const idempotencyKey = prepLabelIdempotencyKey(input.batchCode, input.reason);
    return {
      shouldPrint: true,
      reason: input.reason,
      input: {
        printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
        template: input.template || "prep_label_professional",
        data: {
          prepName: input.prepName,
          productionDateTime: input.productionDateTime,
          expiryDateTime: input.expiryDateTime,
          shelfLifeDays: input.shelfLifeDays,
          batchCode: input.batchCode,
          responsibleName: input.responsibleName,
          storageCondition: input.storageCondition || "Refrigerado 0-4 C",
          brandName: "KIOSKO ALFRESKO",
          qrValue: `ERP:prep_batch:${input.batchCode}`,
          includeQr: true,
          copies: input.copies,
        },
        metadata: {
          requestedBy: input.requestedBy || "admin-kiosko",
          module: "prep",
          sourceType: "prep_batch",
          sourceId: input.batchCode,
          createdFrom: "erp_event",
          reason: input.reason,
          batchCode: input.batchCode,
          idempotencyKey,
        },
      },
    };
  },

  async requestPrepCreatedLabel(input: PrepLabelInput): Promise<LabelEventResult> {
    const decision = this.decidePrepCreated(input);
    if (!decision.shouldPrint) return { ok: false, error: decision.reason, decision };

    const existing = await findExistingByIdempotencyKey(decision.input.metadata.idempotencyKey || "");
    if (existing.ok && existing.data) {
      return { ok: true, skipped: true, data: existing.data, decision };
    }

    return executeLabelDecision(decision);
  },

  async requestPrepManualLabel(input: PrepLabelInput): Promise<LabelEventResult> {
    const decision = this.decidePrepCreated({
      ...input,
      reason: input.reason || "print_prep_label",
    });
    if (decision.shouldPrint) {
      decision.input.metadata.idempotencyKey = manualRequestKey(
        "prep_manual_label",
        input.batchCode,
        input.reason,
        input.template || "prep_label_professional",
        input.copies || 1,
      );
      decision.input.metadata.createdFrom = "erp_manual";
      decision.input.metadata.requestedCopies = input.copies ? String(input.copies) : undefined;
    }

    return executeLabelDecision(decision);
  },

  decideGoodsReceived(input: GoodsReceivedLabelInput): LabelDecision {
    const productName = input.productName || "";
    const batchCode = input.batchCode || "";

    if ((!productName || !batchCode) && input.items?.length) {
      return { shouldPrint: false, reason: "legacy_payload_ignored" };
    }
    if (!productName) return { shouldPrint: false, reason: "goods_received_without_product" };
    if (!batchCode) return { shouldPrint: false, reason: "goods_received_without_batch" };

    const receiptKey = input.receiptId || input.receptionId || batchCode;
    const productKey = input.productId || productName;
    const idempotencyKey = input.idempotencyKey || goodsReceivedLabelIdempotencyKey(receiptKey, productKey);
    const expiryDate = input.expiryDate;

    return {
      shouldPrint: true,
      reason: "goods_received",
      input: {
        printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
        template: "ingredient_label_basic",
        data: {
          ingredientName: productName,
          supplierName: input.supplierName || undefined,
          internalCode: undefined,
          lot: batchCode,
          expiryDate,
          copies: 1,
        },
        metadata: {
          requestedBy: input.receivedBy || "admin-kiosko",
          module: "goods-reception",
          sourceType: "goods_reception",
          sourceId: receiptKey,
          createdFrom: "goods_received_event",
          reason: "goods_received",
          batchCode,
          idempotencyKey,
          requestedCopies: "1",
        },
      },
    };
  },

  async requestGoodsReceivedLabel(input: GoodsReceivedLabelInput): Promise<LabelEventResult> {
    const decision = this.decideGoodsReceived(input);
    if (!decision.shouldPrint) return { ok: false, error: decision.reason, decision };

    const existing = await findExistingByIdempotencyKey(decision.input.metadata.idempotencyKey || "");
    if (existing.ok && existing.data) {
      return { ok: true, skipped: true, data: existing.data, decision };
    }

    console.info("[GOODS RECEIVED LABEL QUEUED]", {
      sourceId: decision.input.metadata.sourceId,
      batchCode: decision.input.metadata.batchCode,
      productName: input.productName || input.items?.[0]?.productName,
      quantity: input.quantity,
      unit: input.unit,
    });

    return executeLabelDecision(decision);
  },

  async requestManualGodexLabel(input: ManualGodexLabelInput): Promise<LabelEventResult> {
    const idempotencyKey = manualRequestKey(
      "print",
      input.sourceType || "godex_appcc",
      input.sourceId || input.batch,
      input.requestId || crypto.randomUUID(),
    );
    const baseMetadata = {
      requestedBy: input.responsible || "admin-kiosko",
      module: "labels",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdFrom: "admin_labels_manual",
      reason: "manual_godex_label_print",
      batchCode: input.batch,
      idempotencyKey,
      requestId: input.requestId,
    };
    const decision: LabelDecision = {
      shouldPrint: true,
      reason: "manual_godex_label_print",
      input: {
        printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
        template: "prep_label_professional",
        data: {
          prepName: input.product,
          productionDateTime: input.productionDateTime,
          expiryDateTime: input.expiryDateTime,
          batchCode: input.batch,
          responsibleName: input.responsible,
          storageCondition: input.supplier || "APPCC interno",
          brandName: "KIOSKO ALFRESKO",
          qrValue: `ERP:prep_batch:${input.batch}`,
          includeQr: true,
          copies: input.copies,
        },
        metadata: {
          ...baseMetadata,
          requestedCopies: input.copies ? String(input.copies) : undefined,
        },
      },
    };

    const printResult = await executeLabelDecision(decision);
    if (!printResult.ok && /caducidad|expiryDateTime|posterior/i.test(printResult.error)) {
      const fallbackDecision: LabelDecision = {
        shouldPrint: true,
        reason: "manual_godex_label_print_basic_fallback",
        input: {
          printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
          template: "product_label_basic",
          data: {
            productName: input.product,
            internalCode: input.sourceId || undefined,
            lot: input.batch,
            expiryDate: input.expiryDateTime || undefined,
            copies: input.copies,
          },
          metadata: {
            ...baseMetadata,
            reason: "manual_godex_label_print_basic_fallback",
            requestedCopies: input.copies ? String(input.copies) : undefined,
          },
        },
      };
      return executeLabelDecision(fallbackDecision);
    }

    return printResult;
  },

  async handleDomainEvent(event: AdminKioskoDomainEvent) {
    if (event.name === "ProductionBatchClosed") {
      return this.requestProductionBatchClosedLabel(event.payload);
    }
    if (event.name === "PrepCreated") {
      return this.requestPrepCreatedLabel(event.payload);
    }
    if (event.name === "GoodsReceived") {
      return this.requestGoodsReceivedLabel(event.payload);
    }
    if (event.name === "LabelRequested") {
      const decision: LabelDecision = {
        shouldPrint: true,
        reason: event.payload.metadata.reason || "label_requested",
        input: {
          printerKey: event.payload.printerKey || DEFAULT_GODEX_G500_PRINTER_KEY,
          template: event.payload.template,
          data: event.payload.data,
          metadata: event.payload.metadata,
        },
      };
      return executeLabelDecision(decision);
    }
    return { ok: false as const, error: `Evento sin politica de etiqueta: ${event.name}` };
  },
};
