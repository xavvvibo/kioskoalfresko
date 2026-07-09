import "server-only";

import { createLabelRecord } from "@/lib/admin-kiosko/database";
import { buildGodex80x50FrozenInventoryEzpl, isValidGodex80x50Ezpl } from "@/lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { DEFAULT_GODEX_G500_PRINTER_KEY } from "@/lib/admin-kiosko/printing/print-service";
import { enqueuePrintJob, type PrintJob } from "@/lib/admin-kiosko/repositories/print-jobs.repository";
import { adminSupabaseRequest } from "@/lib/admin-kiosko/repositories/legacy-core";
import { findLatestMakroPurchaseForProduct, type MakroPurchaseSource } from "./makro-reception-202607.service";

export const FREEZER_BATCH_20260708 = {
  batchCode: "FRZ-20260708",
  documentDate: null as string | null,
  receivedAt: null as string | null,
  inventoryCheckedAt: "2026-07-08",
  storageState: "frozen",
  appccStatus: "accepted_frozen",
  source: "invoice_delivery_note_and_product_photos",
  sourceDocument: "Inventario congelado 08jul2026.zip / fotos de producto y fichas",
  notes: "Llegó congelado según factura/albarán y continúa congelado.",
  storage: "-18 C o inferior",
  labelWarning: "MANTENER CONGELADO · NO RECONGELAR TRAS DESCONGELACIÓN",
};

type DbResult<T> = { ok: true; data: T } | { ok: false; error: string };

const EXPECTED_FREEZER_TOTAL_LOTS = 52;
const EXPECTED_FREEZER_APT_LOTS = 0;
const EXPECTED_FREEZER_REVIEW_LOTS = 49;
const EXPECTED_FREEZER_QUARANTINE_LOTS = 3;
const SAFE_SUPABASE_ERROR = "No se pudo verificar Supabase. Revisa conexión/configuración.";

export type FreezerReviewState =
  | "accepted_frozen"
  | "pending_review_for_document_date"
  | "pending_review_for_missing_lot_expiry"
  | "pending_review_for_weight_lot_expiry"
  | "pending_review_for_lot_expiry"
  | "pending_review_manual_identification"
  | "frozen_pending_review"
  | "quarantine_pending_date_validation";

export type FreezerCatalogProduct = {
  itemNo: number;
  productName: string;
  brandSupplier?: string;
  packageCount: number;
  packageWeightKg?: number | null;
  packageUnit?: string;
  approximateUnits?: string;
  manufacturerLot?: string | null;
  manufacturerLotVisible?: string | null;
  expiryDate?: string | null;
  expiryVisible?: string | null;
  ingredientsSummary?: string | null;
  allergensSummary?: string | null;
  reviewState: FreezerReviewState;
  reviewNote?: string | null;
  documentDate?: string | null;
};

export type FreezerInventoryLot = FreezerCatalogProduct & {
  packageIndex: number;
  internalLot: string;
  quantityText: string;
  labelKind: "apt" | "review" | "quarantine";
  reviewWarning: string;
  traceValue: string;
  documentDate: string | null;
  receivedAt: string | null;
  inventoryCheckedAt: string;
  invoiceRef: string | null;
  purchaseSource: MakroPurchaseSource | null;
  sourceNote: string;
  reconciliationReason: string;
  effectiveStatus: "apto" | "revision" | "cuarentena";
  registeredLot?: FreezerRegisteredLotRow | null;
};

export type FreezerRegisteredLotRow = {
  id: string;
  batch_number: string | null;
  product_name: string | null;
  status: string | null;
  appcc_review_status?: string | null;
  document_date?: string | null;
  received_at?: string | null;
};

export type FreezerBatchVerification = {
  status: "verified" | "failed";
  batchCode: string;
  expectedTotal: number;
  expectedApt: number;
  expectedReview: number;
  expectedQuarantine: number;
  registeredTotal: number;
  registeredApt: number;
  registeredReview: number;
  registeredQuarantine: number;
  missingLots: string[];
  unexpectedLots: string[];
  error?: string;
};

export const freezerInventoryCatalog20260708: FreezerCatalogProduct[] = [
  {
    itemNo: 1,
    productName: "Croqueta de jamón ibérico",
    brandSupplier: "Makro / Precongelados Frisa S.L.U.",
    packageCount: 1,
    packageWeightKg: 1,
    approximateUnits: "25 uds aprox.",
    manufacturerLot: "26051C",
    expiryDate: "2027-08-19",
    expiryVisible: "19/08/2027",
    allergensSummary: "Leche, trigo/gluten, huevo, mantequilla. Puede contener crustáceos, pescados, soja, apio, mostaza, sulfitos y/o moluscos.",
    reviewState: "accepted_frozen",
  },
  {
    itemNo: 2,
    productName: "Boletus a la trufa",
    brandSupplier: "La Culinaria / Pastoret",
    packageCount: 6,
    packageWeightKg: 1,
    manufacturerLot: "25350A",
    expiryDate: "2027-06-06",
    expiryVisible: "06/06/2027",
    allergensSummary: "Leche, trigo/gluten, huevo; puede contener crustáceos, pescado, soja, apio, mostaza, sulfitos y moluscos.",
    reviewState: "accepted_frozen",
  },
  {
    itemNo: 3,
    productName: "Vacuno al vino tinto",
    brandSupplier: "La Culinaria / Pastoret",
    packageCount: 6,
    packageWeightKg: 1,
    manufacturerLot: "26019A",
    expiryDate: "2027-04-30",
    expiryVisible: "30/04/2027",
    allergensSummary: "Leche, trigo/gluten, sulfitos; puede contener crustáceos, huevo, pescado, soja, apio, mostaza y moluscos.",
    reviewState: "accepted_frozen",
  },
  {
    itemNo: 4,
    productName: "Queso azul y cebolla caramelizada",
    brandSupplier: "La Culinaria / Pastoret",
    packageCount: 5,
    packageWeightKg: 1,
    manufacturerLot: "25364A",
    expiryDate: "2027-02-16",
    expiryVisible: "16/02/2027",
    allergensSummary: "Leche, trigo/gluten, huevo; puede contener pescado, soja, apio, mostaza, moluscos y sulfitos.",
    reviewState: "accepted_frozen",
  },
  { itemNo: 5, productName: "Croqueta de boletus", brandSupplier: "Metro Premium", packageCount: 1, packageWeightKg: 1, approximateUnits: "25 uds aprox.", reviewState: "pending_review_for_missing_lot_expiry", reviewNote: "Lote/caducidad no visible en foto." },
  { itemNo: 6, productName: "Croqueta de rabo de vacuno", brandSupplier: "Metro Premium", packageCount: 1, packageWeightKg: 1, approximateUnits: "25 uds aprox.", reviewState: "pending_review_for_missing_lot_expiry", reviewNote: "Lote/caducidad no visible en foto." },
  {
    itemNo: 7,
    productName: "Tequeños con queso",
    brandSupplier: "K-T-DRA",
    packageCount: 1,
    packageWeightKg: 1.75,
    approximateUnits: "50 uds",
    manufacturerLotVisible: "LV141LB aprox.; revisar",
    expiryVisible: "10/2027 aprox.; revisar",
    allergensSummary: "Gluten y leche; revisar ficha para exactitud.",
    reviewState: "pending_review_for_missing_lot_expiry",
    reviewNote: "Lote y caducidad aproximados; falta validación documental exacta.",
  },
  { itemNo: 8, productName: "Verduras para paella", brandSupplier: "Metro Chef", packageCount: 2, packageWeightKg: 1, ingredientsSummary: "Judía verde plana, garrofón, alubias blancas.", reviewState: "pending_review_for_missing_lot_expiry", reviewNote: "Lote/caducidad no visible." },
  {
    itemNo: 9,
    productName: "Tortillita de camarón",
    brandSupplier: "Metro Chef",
    packageCount: 3,
    packageWeightKg: 1,
    approximateUnits: "30/37 uds por envase aprox.",
    manufacturerLotVisible: "26:63 aprox.; revisar",
    expiryDate: "2027-12-12",
    expiryVisible: "12/12/2027",
    allergensSummary: "Trigo/gluten, crustáceos/camarón, huevo, mostaza, soja. Puede contener leche, pescado y sulfitos.",
    reviewState: "pending_review_for_missing_lot_expiry",
    reviewNote: "Lote visible aproximado; revisar.",
  },
  { itemNo: 10, productName: "Croquetas de ibérico", brandSupplier: "Metro Chef", packageCount: 1, packageWeightKg: 1, approximateUnits: "28 uds aprox.", manufacturerLot: "26101A", expiryDate: "2028-04-09", expiryVisible: "09/04/2028", reviewState: "accepted_frozen" },
  { itemNo: 11, productName: "Cream Cheese Jalapeños", brandSupplier: "Metro Chef", packageCount: 2, packageWeightKg: 1, approximateUnits: "26-30 piezas", expiryDate: "2027-03-15", expiryVisible: "15/03/2027 aprox.", allergensSummary: "Revisar ficha; probable leche/gluten.", reviewState: "pending_review_for_missing_lot_expiry", reviewNote: "Lote no visible; alérgenos pendientes de ficha." },
  { itemNo: 12, productName: "Croquetas de carne receta casera", brandSupplier: "Metro Chef", packageCount: 3, packageWeightKg: null, approximateUnits: "33 uds por envase aprox.", reviewState: "pending_review_for_weight_lot_expiry", reviewNote: "Varios envases de 2 kg; revisar peso exacto por envase, lote y caducidad." },
  { itemNo: 13, productName: "Croquetas de jamón receta casera", brandSupplier: "Metro Chef", packageCount: 2, packageWeightKg: 2, approximateUnits: "33 uds por envase aprox.", reviewState: "pending_review_for_missing_lot_expiry", reviewNote: "Lote/caducidad no visible." },
  { itemNo: 14, productName: "Croquetas de pollo y cebolla", brandSupplier: "Metro Chef", packageCount: 1, packageWeightKg: null, reviewState: "pending_review_for_weight_lot_expiry", reviewNote: "Peso probablemente 2 kg; revisar peso exacto, lote y caducidad." },
  { itemNo: 15, productName: "Mini Burger de pollo", brandSupplier: "Simonini Food", packageCount: 3, packageWeightKg: 1, expiryVisible: "11.06.26 visible; revisar", reviewState: "quarantine_pending_date_validation", reviewNote: "Fecha visible anterior a recepción 08/07/2026. CUARENTENA: no usar hasta validar manualmente." },
  { itemNo: 16, productName: "Nuggets de pollo rebozados", brandSupplier: "Quality", packageCount: 1, packageWeightKg: 1, reviewState: "pending_review_for_missing_lot_expiry", reviewNote: "Lote/caducidad no visible." },
  { itemNo: 17, productName: "Pincho / preparado de pollo y bacon", brandSupplier: "Quality", packageCount: 1, packageWeightKg: null, manufacturerLot: "L-020915", expiryVisible: "07/2027", allergensSummary: "Leche/lactosa, soja, gluten/trigo, sulfitos; revisar ficha.", reviewState: "pending_review_for_weight_lot_expiry", reviewNote: "Peso probablemente 1 kg y caducidad visible solo mes/año; revisar." },
  { itemNo: 18, productName: "Gyoza Yasai", brandSupplier: "JapCook", packageCount: 1, packageWeightKg: 0.6, ingredientsSummary: "Empanadillas japonesas vegetales.", allergensSummary: "Gluten/trigo, soja, sésamo; revisar ficha.", reviewState: "pending_review_for_missing_lot_expiry", reviewNote: "Lote/caducidad no visible." },
  { itemNo: 19, productName: "Albóndigas / bolas de carne congeladas", packageCount: 1, packageWeightKg: null, reviewState: "pending_review_manual_identification", reviewNote: "Proveedor, peso, lote y caducidad no visibles." },
  { itemNo: 20, productName: "Longaniza fresca", packageCount: 1, packageWeightKg: null, reviewState: "frozen_pending_review", reviewNote: "Etiqueta manuscrita requiere revisión frente a albarán. Recibido congelado según factura/albarán." },
  { itemNo: 21, productName: "Contramuslo / pollo", packageCount: 1, packageWeightKg: null, reviewState: "pending_review_manual_identification", reviewNote: "Peso/lote/caducidad a revisar." },
  { itemNo: 22, productName: "Alitas de pollo", packageCount: 2, packageWeightKg: null, reviewState: "frozen_pending_review", reviewNote: "Etiquetas manuscritas con fechas visibles; revisar frente a albarán." },
  { itemNo: 23, productName: "Chorizo fresco", packageCount: 1, packageWeightKg: null, reviewState: "frozen_pending_review", reviewNote: "Etiqueta manuscrita visible; revisar." },
  { itemNo: 24, productName: "Chorizo criollo", packageCount: 2, packageWeightKg: null, reviewState: "frozen_pending_review", reviewNote: "Etiquetas manuscritas visibles; revisar." },
  { itemNo: 25, productName: "Panceta fresca", packageCount: 1, packageWeightKg: null, reviewState: "frozen_pending_review", reviewNote: "Etiqueta manuscrita visible; revisar." },
  { itemNo: 26, productName: "Morcilla cortijera", brandSupplier: "Cárnicas Paquito", packageCount: 1, packageWeightKg: null, reviewState: "frozen_pending_review", reviewNote: "Peso/lote/caducidad a revisar desde etiqueta." },
  { itemNo: 27, productName: "Guacamole", packageCount: 1, packageWeightKg: 0.95, reviewState: "pending_review_for_lot_expiry", reviewNote: "Marca, lote y caducidad a revisar." },
];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function displayDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function effectiveReviewState(product: FreezerCatalogProduct): FreezerReviewState {
  const purchase = findLatestMakroPurchaseForProduct(product.productName);
  const documentDate = product.documentDate || purchase?.documentDate || null;
  if (product.reviewState === "accepted_frozen" && !documentDate) {
    return "pending_review_for_document_date";
  }
  return product.reviewState;
}

function sanitizeExternalError(value: unknown) {
  const text = cleanText(value);
  if (!text) return SAFE_SUPABASE_ERROR;
  if (/<\/?[a-z][\s\S]*>/i.test(text) || /<!doctype/i.test(text) || /cloudflare|worker threw exception|error code:\s*\d+/i.test(text)) {
    return SAFE_SUPABASE_ERROR;
  }
  return text.replace(/\s+/g, " ").slice(0, 200);
}

function padLot(value: number) {
  return String(value).padStart(3, "0");
}

function labelKind(reviewState: FreezerReviewState): FreezerInventoryLot["labelKind"] {
  if (reviewState === "accepted_frozen") return "apt";
  if (reviewState === "quarantine_pending_date_validation") return "quarantine";
  return "review";
}

export function getEffectiveFrzLotStatus(input?: Pick<FreezerRegisteredLotRow, "status" | "appcc_review_status" | "document_date" | "received_at"> | null): "apto" | "revision" | "cuarentena" {
  if (!input) return "revision";
  if (input.status === "bloqueado") return "cuarentena";
  if (input.status === "activo" && input.appcc_review_status === "revisado" && Boolean(input.document_date || input.received_at)) return "apto";
  return "revision";
}

function labelKindFromEffectiveStatus(status: "apto" | "revision" | "cuarentena"): FreezerInventoryLot["labelKind"] {
  if (status === "apto") return "apt";
  if (status === "cuarentena") return "quarantine";
  return "review";
}

function appccReviewStatus(reviewState: FreezerReviewState) {
  if (reviewState === "accepted_frozen") return "revisado";
  if (reviewState === "quarantine_pending_date_validation" || reviewState === "pending_review_manual_identification" || reviewState === "pending_review_for_document_date") return "requiere_documentacion";
  return "requiere_documentacion";
}

function statusText(reviewState: FreezerReviewState) {
  if (reviewState === "accepted_frozen") return "activo";
  if (reviewState === "quarantine_pending_date_validation") return "bloqueado";
  return "activo";
}

function reviewWarning(reviewState: FreezerReviewState) {
  if (reviewState === "accepted_frozen") return "";
  if (reviewState === "quarantine_pending_date_validation") return "CUARENTENA · REVISAR FECHA · NO USAR";
  if (reviewState === "pending_review_for_document_date") return "REVISAR FECHA FACTURA/ALBARAN ANTES DE USAR";
  return "REVISAR DATOS ANTES DE USAR";
}

function operationalReviewWarning(product: FreezerCatalogProduct, reviewState: FreezerReviewState, purchase: MakroPurchaseSource | null) {
  if (product.productName === "Alitas de pollo" && purchase) {
    return "REVISAR CANTIDAD/ENVASE ANTES DE USAR";
  }
  return reviewWarning(reviewState);
}

function quantityText(product: FreezerCatalogProduct) {
  const unitText = product.packageWeightKg ? `${String(product.packageWeightKg).replace(".", ",")} kg` : "1 envase";
  return product.approximateUnits ? `${unitText} · ${product.approximateUnits}` : unitText;
}

export function getFreezerInventoryLots20260708() {
  const lots: FreezerInventoryLot[] = [];
  let lotIndex = 1;
  for (const product of freezerInventoryCatalog20260708) {
    for (let packageIndex = 1; packageIndex <= product.packageCount; packageIndex += 1) {
      const internalLot = `${FREEZER_BATCH_20260708.batchCode}-${padLot(lotIndex)}`;
      const purchase = findLatestMakroPurchaseForProduct(product.productName);
      const documentDate = product.documentDate || purchase?.documentDate || null;
      const reviewState = effectiveReviewState(product);
      const initialLabelKind = labelKind(reviewState);
      lots.push({
        ...product,
        reviewState,
        packageIndex,
        internalLot,
        quantityText: quantityText(product),
        labelKind: initialLabelKind,
        reviewWarning: operationalReviewWarning(product, reviewState, purchase),
        traceValue: `ERP:freezer:${FREEZER_BATCH_20260708.batchCode}:${internalLot}`,
        documentDate,
        receivedAt: documentDate,
        inventoryCheckedAt: FREEZER_BATCH_20260708.inventoryCheckedAt,
        invoiceRef: purchase?.invoiceRef || null,
        purchaseSource: purchase,
        sourceNote: purchase
          ? "Regularización de stock autorizada por responsable; se usa compra más reciente disponible."
          : "Sin match documental fiable en facturas disponibles; requiere revisión de fecha factura/albarán.",
        reconciliationReason: purchase
          ? "Regularización de stock autorizada por responsable. Se asigna la fecha de compra más reciente disponible porque el stock de compras anteriores se considera consumido por ventas."
          : "Pendiente de localizar factura/albarán fiable para este producto.",
        effectiveStatus: initialLabelKind === "quarantine" ? "cuarentena" : "revision",
        registeredLot: null,
      });
      lotIndex += 1;
    }
  }
  return lots;
}

export function applyRegisteredFreezerLotStatus(lots: FreezerInventoryLot[], rows: FreezerRegisteredLotRow[]) {
  const rowsByBatch = new Map(rows.map((row) => [row.batch_number || "", row]));
  return lots.map((lot) => {
    const registeredLot = rowsByBatch.get(lot.internalLot) || null;
    const effectiveStatus = getEffectiveFrzLotStatus(registeredLot);
    const labelKind = labelKindFromEffectiveStatus(effectiveStatus);
    const defaultReviewWarning = registeredLot && !registeredLot.document_date && !registeredLot.received_at
      ? "REVISAR FECHA FACTURA/ALBARAN ANTES DE USAR"
      : "REVISAR DATOS ANTES DE USAR";
    const reviewWarningText = effectiveStatus === "apto"
      ? ""
      : effectiveStatus === "cuarentena"
        ? "CUARENTENA · NO USAR"
        : operationalReviewWarning(lot, lot.reviewState, lot.purchaseSource) || defaultReviewWarning;
    return {
      ...lot,
      labelKind,
      effectiveStatus,
      registeredLot,
      reviewWarning: reviewWarningText || lot.reviewWarning,
    };
  });
}

export function getFreezerBatchMetrics() {
  const lots = getFreezerInventoryLots20260708();
  return {
    products: freezerInventoryCatalog20260708.length,
    labels: lots.length,
    aptLabels: lots.filter((lot) => lot.labelKind === "apt").length,
    reviewLabels: lots.filter((lot) => lot.labelKind === "review").length,
    quarantineLabels: lots.filter((lot) => lot.labelKind === "quarantine").length,
  };
}

function countRegisteredLots(rows: FreezerRegisteredLotRow[]) {
  const registeredApt = rows.filter((row) => row.status === "activo" && row.appcc_review_status === "revisado" && Boolean(row.document_date || row.received_at)).length;
  const registeredQuarantine = rows.filter((row) => row.status === "bloqueado").length;
  const registeredReview = rows.length - registeredApt - registeredQuarantine;
  return { registeredApt, registeredReview, registeredQuarantine };
}

function buildVerification(rows: FreezerRegisteredLotRow[]): FreezerBatchVerification {
  const expectedLots = getFreezerInventoryLots20260708();
  const expectedSet = new Set(expectedLots.map((lot) => lot.internalLot));
  const registeredSet = new Set(rows.map((row) => row.batch_number).filter((value): value is string => Boolean(value)));
  const missingLots = [...expectedSet].filter((lot) => !registeredSet.has(lot));
  const unexpectedLots = [...registeredSet].filter((lot) => !expectedSet.has(lot));
  const { registeredApt, registeredReview, registeredQuarantine } = countRegisteredLots(rows);
  const verified = FREEZER_BATCH_20260708.batchCode === "FRZ-20260708"
    && expectedLots.length === EXPECTED_FREEZER_TOTAL_LOTS
    && rows.length === EXPECTED_FREEZER_TOTAL_LOTS
    && registeredApt === EXPECTED_FREEZER_APT_LOTS
    && registeredReview === EXPECTED_FREEZER_REVIEW_LOTS
    && registeredQuarantine === EXPECTED_FREEZER_QUARANTINE_LOTS
    && missingLots.length === 0
    && unexpectedLots.length === 0;

  return {
    status: verified ? "verified" : "failed",
    batchCode: FREEZER_BATCH_20260708.batchCode,
    expectedTotal: EXPECTED_FREEZER_TOTAL_LOTS,
    expectedApt: EXPECTED_FREEZER_APT_LOTS,
    expectedReview: EXPECTED_FREEZER_REVIEW_LOTS,
    expectedQuarantine: EXPECTED_FREEZER_QUARANTINE_LOTS,
    registeredTotal: rows.length,
    registeredApt,
    registeredReview,
    registeredQuarantine,
    missingLots,
    unexpectedLots,
    error: verified ? undefined : "Impresión bloqueada hasta verificar 52 lotes en BD.",
  };
}

function labelPayload(lot: FreezerInventoryLot) {
  const quarantineWarning = lot.labelKind === "quarantine" ? "CUARENTENA · NO USAR" : "";
  return {
    productName: lot.productName,
    internalLot: lot.internalLot,
    brandSupplier: lot.brandSupplier || "Proveedor/marca pendiente",
    manufacturerLot: lot.manufacturerLot || lot.manufacturerLotVisible || lot.purchaseSource?.supplierLot || "",
    invoiceRef: lot.invoiceRef || "",
    expiryText: lot.expiryVisible || (lot.expiryDate ? lot.expiryDate : "Pendiente revisión"),
    receivedDate: lot.receivedAt ? displayDate(lot.receivedAt) : "",
    inventoryCheckedDate: displayDate(lot.inventoryCheckedAt),
    quantityText: lot.quantityText,
    effectiveStatus: lot.effectiveStatus,
    reviewWarning: lot.labelKind === "review" ? lot.reviewWarning : "",
    quarantineWarning,
    allergensText: lot.allergensSummary || lot.ingredientsSummary || "",
    traceValue: lot.traceValue,
    copies: 1,
  };
}

export function buildFreezerInventoryLabelEzpl(lot: FreezerInventoryLot) {
  return buildGodex80x50FrozenInventoryEzpl(labelPayload(lot));
}

async function recordLabelHistory(lot: FreezerInventoryLot) {
  const result = await createLabelRecord({
    model: lot.labelKind === "quarantine" ? "Congelación cuarentena" : lot.labelKind === "review" ? "Congelación revisión" : "Congelación",
    product: lot.productName,
    batch: lot.internalLot,
    supplier: lot.brandSupplier || "",
    elaboration_date: FREEZER_BATCH_20260708.inventoryCheckedAt,
    freezing_date: lot.receivedAt || undefined,
    best_before_date: lot.expiryDate || undefined,
    responsible: "F. Javier Bocanegra Sanjuan",
    print_format: "termica",
    copies: 1,
    printer: "Godex G500",
    template: "freezer_inventory_80x50",
    zpl_version: "EZPL",
    label_type: "freezer_inventory_20260708",
    expiry_source: lot.expiryDate && lot.manufacturerLot && lot.documentDate ? "real_documentada" : undefined,
    appcc_review_status: lot.effectiveStatus === "apto" ? "revisado" : "requiere_documentacion",
    review_warning: lot.reviewWarning,
  });
  if (!result.ok) {
    console.error("[FREEZER INVENTORY LABEL HISTORY ERROR]", result.error);
  }
}

export const freezerInventory20260708Service = {
  listLots() {
    return getFreezerInventoryLots20260708();
  },

  findLots(scope: "apt" | "review" | "quarantine" | "review_or_quarantine" | "all") {
    const lots = getFreezerInventoryLots20260708();
    if (scope === "all") return lots;
    if (scope === "review_or_quarantine") return lots.filter((lot) => lot.labelKind !== "apt");
    return lots.filter((lot) => lot.labelKind === scope);
  },

  async listLotsWithRegisteredStatus(): Promise<DbResult<FreezerInventoryLot[]>> {
    const lots = getFreezerInventoryLots20260708();
    const registered = await this.listRegisteredLots();
    if (!registered.ok) return registered;
    return { ok: true, data: applyRegisteredFreezerLotStatus(lots, registered.data) };
  },

  async listRegisteredLots(): Promise<DbResult<FreezerRegisteredLotRow[]>> {
    const result = await adminSupabaseRequest<FreezerRegisteredLotRow[]>("admin_inventory_lots", {
      method: "GET",
      query: "?select=id,batch_number,product_name,status,appcc_review_status,document_date,received_at&batch_number=like.FRZ-20260708-*&order=batch_number.asc&limit=200",
    });
    if (!result.ok) return { ok: false, error: sanitizeExternalError(result.error) };
    return { ok: true, data: result.data };
  },

  async verifyBatchRegistration(): Promise<FreezerBatchVerification> {
    const registered = await this.listRegisteredLots();
    if (!registered.ok) {
      return {
        status: "failed",
        batchCode: FREEZER_BATCH_20260708.batchCode,
        expectedTotal: EXPECTED_FREEZER_TOTAL_LOTS,
        expectedApt: EXPECTED_FREEZER_APT_LOTS,
        expectedReview: EXPECTED_FREEZER_REVIEW_LOTS,
        expectedQuarantine: EXPECTED_FREEZER_QUARANTINE_LOTS,
        registeredTotal: 0,
        registeredApt: 0,
        registeredReview: 0,
        registeredQuarantine: 0,
        missingLots: [],
        unexpectedLots: [],
        error: sanitizeExternalError(registered.error),
      };
    }
    return buildVerification(registered.data);
  },

  async queueLabels(input: { scope: "apt" | "review_or_quarantine"; requestId?: string }): Promise<DbResult<{ queued: PrintJob[]; lots: FreezerInventoryLot[] }>> {
    const verification = await this.verifyBatchRegistration();
    if (verification.status !== "verified") {
      return { ok: false, error: verification.error || "Impresión bloqueada hasta verificar 52 lotes en BD." };
    }

    const lotsResult = await this.listLotsWithRegisteredStatus();
    if (!lotsResult.ok) return lotsResult;

    const lots = input.scope === "apt"
      ? lotsResult.data.filter((lot) => lot.effectiveStatus === "apto")
      : lotsResult.data.filter((lot) => lot.effectiveStatus === "revision" || lot.effectiveStatus === "cuarentena");
    if (input.scope === "apt" && lots.length === 0) {
      return { ok: false, error: "No hay etiquetas aptas verificadas en BD para FRZ-20260708." };
    }
    const queued: PrintJob[] = [];
    const requestId = cleanText(input.requestId) || crypto.randomUUID();

    for (const lot of lots) {
      const rawCommand = buildFreezerInventoryLabelEzpl(lot);
      if (!isValidGodex80x50Ezpl(rawCommand)) {
        return { ok: false, error: `EZPL invalido para ${lot.internalLot}.` };
      }

      const result = await enqueuePrintJob({
        printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
        payload: {
          title: lot.productName,
          line1: `${lot.internalLot} · ${lot.quantityText}`,
          line2: lot.reviewWarning || "RECIBIDO CONGELADO",
          template: "freezer_inventory_80x50",
          raw_command: rawCommand,
          data: labelPayload(lot),
          metadata: {
            requestedBy: "F. Javier Bocanegra Sanjuan",
            module: "inventory",
            sourceType: "freezer_inventory_20260708",
            sourceId: lot.internalLot,
            createdFrom: "admin_freezer_inventory_20260708",
            reason: input.scope === "apt" ? "print_freezer_accepted_labels" : "print_freezer_review_quarantine_labels",
            batchCode: FREEZER_BATCH_20260708.batchCode,
            requestId: `${requestId}:${lot.internalLot}`,
            idempotencyKey: `freezer_20260708:${input.scope}:${lot.internalLot}:${requestId}`,
          },
        },
      });
      if (!result.ok) return result;
      queued.push(result.data);
      await recordLabelHistory(lot);
    }

    return { ok: true, data: { queued, lots } };
  },

  appccReviewStatus,
  statusText,
};
