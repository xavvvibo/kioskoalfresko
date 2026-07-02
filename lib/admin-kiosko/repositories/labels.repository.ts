/**
 * Labels repository.
 *
 * Historial y origenes de etiquetas APPCC/Zebra. Mantiene contratos publicos
 * existentes delegando en legacy-core.
 */
import type { InventoryReadyLot, InventoryLabelPreview } from "./inventory.repository";
import { listLotsReadyForLabels, previewInventoryLabel } from "./inventory.repository";
import { createLabelRecord as createLegacyLabelRecord } from "./legacy-core";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type InventoryLotLabelValidation = {
  allowed: boolean;
  directPrintAllowed: boolean;
  status: "apto" | "estimado" | "pendiente_revision" | "no_apto";
  message: string;
  warning?: string;
};

export type InventoryLotLabelOption = InventoryReadyLot & {
  labelValidation: InventoryLotLabelValidation;
};

export type InventoryLotLabelPreview = InventoryLabelPreview & {
  labelValidation: InventoryLotLabelValidation;
  factura: string | null;
  conservation: string | null;
  expirySource: string | null;
  appccReviewStatus: string | null;
  warning?: string;
};

function isApprovedStatus(status?: string | null) {
  return status === "aprobado" || status === "revisado";
}

export function validateInventoryLotForLabel(lot: Pick<InventoryReadyLot, "caducidad" | "requires_traceability" | "expiry_source" | "appcc_review_status">): InventoryLotLabelValidation {
  if (lot.requires_traceability && !lot.caducidad) {
    return {
      allowed: false,
      directPrintAllowed: false,
      status: "no_apto",
      message: "No se permite etiqueta: el lote requiere trazabilidad y no tiene caducidad revisada.",
    };
  }

  if (lot.expiry_source === "real_documentada") {
    return {
      allowed: true,
      directPrintAllowed: true,
      status: "apto",
      message: "Etiqueta permitida con caducidad real documentada.",
    };
  }

  if (lot.expiry_source === "estimada_por_regla") {
    return {
      allowed: true,
      directPrintAllowed: true,
      status: "estimado",
      message: "Etiqueta permitida con caducidad estimada/revisada. Debe indicarse en la etiqueta.",
      warning: "CADUCIDAD ESTIMADA/REVISADA",
    };
  }

  if (isApprovedStatus(lot.appcc_review_status)) {
    return {
      allowed: true,
      directPrintAllowed: true,
      status: "apto",
      message: "Etiqueta permitida para lote revisado APPCC.",
    };
  }

  return {
    allowed: true,
    directPrintAllowed: false,
    status: "pendiente_revision",
    message: "Lote pendiente de revisión APPCC. Revisar antes de imprimir o usar override manual documentado.",
    warning: "PENDIENTE REVISION APPCC",
  };
}

export async function listLabelEligibleInventoryLots(limit = 200): Promise<DbResult<InventoryLotLabelOption[]>> {
  const result = await listLotsReadyForLabels(limit);
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.map((lot) => ({
      ...lot,
      labelValidation: validateInventoryLotForLabel(lot),
    })),
  };
}

export async function previewInventoryLotLabel(lotId: string): Promise<DbResult<InventoryLotLabelPreview>> {
  const [labelResult, lotsResult] = await Promise.all([
    previewInventoryLabel(lotId),
    listLotsReadyForLabels(1000),
  ]);
  if (!labelResult.ok) return labelResult;
  if (!lotsResult.ok) return lotsResult;
  const lot = lotsResult.data.find((item) => item.inventory_lot_id === lotId);
  if (!lot) return { ok: false, error: "Lote no localizado para etiqueta." };

  const validation = validateInventoryLotForLabel(lot);
  return {
    ok: true,
    data: {
      ...labelResult.data,
      labelValidation: validation,
      factura: lot.factura || null,
      conservation: lot.storage_temperature || lot.ubicacion || null,
      expirySource: lot.expiry_source || null,
      appccReviewStatus: lot.appcc_review_status || null,
      warning: validation.warning,
      qrPayload: {
        ...labelResult.data.qrPayload,
        type: "inventory_lot",
        inventory_lot_id: lot.inventory_lot_id,
      },
    },
  };
}

export async function createInventoryLotLabelRecord(input: {
  lot: InventoryReadyLot;
  copies?: number;
  printer?: string;
  printedAt?: string;
  responsible?: string;
  template?: string;
  zplVersion?: string;
  overridePendingReview?: boolean;
}): Promise<DbResult<undefined>> {
  const validation = validateInventoryLotForLabel(input.lot);
  if (!validation.directPrintAllowed && !input.overridePendingReview) {
    return { ok: false, error: validation.message };
  }

  const result = await createLegacyLabelRecord({
    model: "Recepción",
    product: input.lot.producto || "",
    batch: input.lot.lote || "",
    supplier: input.lot.proveedor || "",
    elaboration_date: input.lot.fecha_compra || "",
    best_before_date: input.lot.caducidad || "",
    responsible: input.responsible || "F. Javier Bocanegra Sanjuan",
    print_format: "zpl",
    copies: input.copies || 1,
    printed_at: input.printedAt,
    printer: input.printer,
    template: input.template || "inventory_lot",
    zpl_version: input.zplVersion,
    inventory_lot_id: input.lot.inventory_lot_id,
    product_id: input.lot.product_id || undefined,
    accounting_document_id: input.lot.purchase_document_id || undefined,
    supplier_document_id: input.lot.supplier_document_id || undefined,
    uploaded_document_id: input.lot.uploaded_document_id || undefined,
    label_type: "inventory_lot",
    expiry_source: input.lot.expiry_source || undefined,
    appcc_review_status: input.lot.appcc_review_status || undefined,
    review_warning: validation.warning,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: undefined };
}

export {
  createLabelRecord,
  getLabelRecords,
  getLabelRecordsByBatch,
  getLabelSourceOptions,
} from "./legacy-core";
