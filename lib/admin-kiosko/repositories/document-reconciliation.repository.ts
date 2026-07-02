import { createDomainEvent, emitDomainEventSafe } from "../domain";
import { normalizeDocumentType } from "../domain/document-types";
import { findDomainEventsByCorrelationId } from "./events.repository";
import { adminSupabaseRequest } from "./legacy-core";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type DocumentReconciliationStatus = "pending_review" | "partially_reconciled" | "reconciled" | "requires_intervention" | "failed";

export type DocumentReconciliationSummary = {
  id: string;
  uploadedDocumentId: string;
  status: DocumentReconciliationStatus;
  supplierName?: string;
  supplierTaxId?: string;
  matchedSupplierId?: string;
  supplierMatchStatus: "matched" | "ambiguous" | "unmatched";
  supplierMatchConfidence: number;
  documentNumber?: string;
  documentDate?: string;
  taxableBase?: number;
  vatAmount?: number;
  totalAmount?: number;
  lineCount: number;
  matchedLines: number;
  ambiguousLines: number;
  unrecognizedLines: number;
  priceAlerts: number;
  taxAlerts: number;
  unitAlerts: number;
  warnings: string[];
  errors: string[];
  summary?: string;
};

export type DocumentReconciliationLineSummary = {
  id: string;
  reconciliationId: string;
  lineIndex: number;
  productName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  vatRate?: number;
  totalAmount?: number;
  batchNumber?: string;
  expiryDate?: string;
  matchedProductId?: string;
  matchStatus: "matched" | "ambiguous" | "new_product" | "unrecognized";
  matchConfidence: number;
  priceStatus: "ok" | "deviation" | "no_history" | "not_checked";
  historicalUnitPrice?: number;
  priceDeviationPercent?: number;
  taxStatus: string;
  unitStatus: string;
  warnings: string[];
};

export type DocumentReconciliationView = DocumentReconciliationSummary & {
  lines: DocumentReconciliationLineSummary[];
};

type UploadedDocumentRow = {
  id: string;
  detected_type: string | null;
  selected_type: string | null;
  confirmed_type: string | null;
  corrections: Record<string, unknown> | null;
  ocr_json: Record<string, unknown> | null;
};

type SupplierRow = {
  id: string;
  supplier: string | null;
  cif: string | null;
};

type ProductRow = {
  id: string;
  name: string | null;
  ean?: string | null;
  gtin?: string | null;
  unit?: string | null;
};

type HistoricalPriceRow = {
  product_name: string | null;
  normalized_product_id: string | null;
  unit_price: number | null;
  vat_rate: number | null;
  unit: string | null;
};

type ReconciliationRow = {
  id: string;
  uploaded_document_id: string;
  status: DocumentReconciliationStatus | null;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  matched_supplier_id: string | null;
  supplier_match_status: "matched" | "ambiguous" | "unmatched" | null;
  supplier_match_confidence: number | null;
  document_number: string | null;
  document_date: string | null;
  taxable_base: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  line_count: number | null;
  matched_lines: number | null;
  ambiguous_lines: number | null;
  unrecognized_lines: number | null;
  price_alerts: number | null;
  tax_alerts: number | null;
  unit_alerts: number | null;
  warnings: string[] | null;
  errors: string[] | null;
  summary: string | null;
};

type ReconciliationLineRow = {
  id: string;
  reconciliation_id: string;
  line_index: number | null;
  product_name: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  vat_rate: number | null;
  total_amount: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  matched_product_id: string | null;
  match_status: "matched" | "ambiguous" | "new_product" | "unrecognized" | null;
  match_confidence: number | null;
  price_status: "ok" | "deviation" | "no_history" | "not_checked" | null;
  historical_unit_price: number | null;
  price_deviation_percent: number | null;
  tax_status: string | null;
  unit_status: string | null;
  warnings: string[] | null;
};

type OcrLine = {
  nombre?: string;
  productName?: string;
  cantidad?: string | number;
  quantity?: string | number;
  unit?: string;
  unidad?: string;
  importe?: string | number;
  total?: string | number;
  precio?: string | number;
  unit_price?: string | number;
  iva?: string | number;
  vat_rate?: string | number;
  lote?: string;
  batch?: string;
  caducidad?: string;
  expiry_date?: string;
  temperatura?: string | number;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function number(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = normalized ? Number(normalized) : undefined;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function date(value: unknown) {
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarity(a: string, b: string) {
  const left = new Set(normalizeName(a).split(" ").filter((part) => part.length > 2));
  const right = new Set(normalizeName(b).split(" ").filter((part) => part.length > 2));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((item) => right.has(item)).length;
  return intersection / Math.max(left.size, right.size);
}

function rowToSummary(row: ReconciliationRow): DocumentReconciliationSummary {
  return {
    id: row.id,
    uploadedDocumentId: row.uploaded_document_id,
    status: row.status || "pending_review",
    supplierName: row.supplier_name || undefined,
    supplierTaxId: row.supplier_tax_id || undefined,
    matchedSupplierId: row.matched_supplier_id || undefined,
    supplierMatchStatus: row.supplier_match_status || "unmatched",
    supplierMatchConfidence: Number(row.supplier_match_confidence || 0),
    documentNumber: row.document_number || undefined,
    documentDate: row.document_date || undefined,
    taxableBase: row.taxable_base ?? undefined,
    vatAmount: row.vat_amount ?? undefined,
    totalAmount: row.total_amount ?? undefined,
    lineCount: Number(row.line_count || 0),
    matchedLines: Number(row.matched_lines || 0),
    ambiguousLines: Number(row.ambiguous_lines || 0),
    unrecognizedLines: Number(row.unrecognized_lines || 0),
    priceAlerts: Number(row.price_alerts || 0),
    taxAlerts: Number(row.tax_alerts || 0),
    unitAlerts: Number(row.unit_alerts || 0),
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    errors: Array.isArray(row.errors) ? row.errors : [],
    summary: row.summary || undefined,
  };
}

function rowToLine(row: ReconciliationLineRow): DocumentReconciliationLineSummary {
  return {
    id: row.id,
    reconciliationId: row.reconciliation_id,
    lineIndex: Number(row.line_index || 0),
    productName: row.product_name || undefined,
    quantity: row.quantity ?? undefined,
    unit: row.unit || undefined,
    unitPrice: row.unit_price ?? undefined,
    vatRate: row.vat_rate ?? undefined,
    totalAmount: row.total_amount ?? undefined,
    batchNumber: row.batch_number || undefined,
    expiryDate: row.expiry_date || undefined,
    matchedProductId: row.matched_product_id || undefined,
    matchStatus: row.match_status || "unrecognized",
    matchConfidence: Number(row.match_confidence || 0),
    priceStatus: row.price_status || "not_checked",
    historicalUnitPrice: row.historical_unit_price ?? undefined,
    priceDeviationPercent: row.price_deviation_percent ?? undefined,
    taxStatus: row.tax_status || "not_checked",
    unitStatus: row.unit_status || "not_checked",
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
  };
}

function extractLines(document: UploadedDocumentRow): OcrLine[] {
  const corrections = document.corrections || {};
  const correctionLines = corrections.product_lines;
  if (Array.isArray(correctionLines)) return correctionLines as OcrLine[];
  const ocrResult = document.ocr_json?.result;
  if (ocrResult && typeof ocrResult === "object" && "productos" in ocrResult && Array.isArray((ocrResult as { productos?: unknown[] }).productos)) {
    return (ocrResult as { productos: OcrLine[] }).productos;
  }
  return [];
}

async function getUploadedDocument(uploadedDocumentId: string) {
  const rows = await adminSupabaseRequest<UploadedDocumentRow[]>("admin_uploaded_documents", {
    method: "GET",
    query: `?select=id,detected_type,selected_type,confirmed_type,corrections,ocr_json&id=eq.${encodeURIComponent(uploadedDocumentId)}&limit=1`,
  });
  if (!rows.ok) return rows;
  const row = rows.data[0];
  if (!row) return { ok: false as const, error: "Documento OCR no encontrado para conciliación." };
  return { ok: true as const, data: row };
}

async function supplierCandidates() {
  return adminSupabaseRequest<SupplierRow[]>("admin_supplier_records", {
    method: "GET",
    query: "?select=id,supplier,cif&limit=1000",
  });
}

async function productCandidates() {
  return adminSupabaseRequest<ProductRow[]>("admin_inventory_products", {
    method: "GET",
    query: "?select=id,name,ean,gtin,unit&limit=2000",
  });
}

async function historicalPrices() {
  return adminSupabaseRequest<HistoricalPriceRow[]>("admin_accounting_document_items", {
    method: "GET",
    query: "?select=product_name,normalized_product_id,unit_price,vat_rate,unit&unit_price=not.is.null&order=created_at.desc&limit=2000",
  });
}

function matchSupplier(supplierName: string, supplierTaxId: string, suppliers: SupplierRow[]) {
  const tax = normalizeName(supplierTaxId);
  if (tax) {
    const exact = suppliers.find((supplier) => normalizeName(supplier.cif || "") === tax);
    if (exact) return { id: exact.id, status: "matched" as const, confidence: 1 };
  }
  const scored = suppliers
    .map((supplier) => ({ supplier, score: similarity(supplierName, supplier.supplier || "") }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return { id: undefined, status: "unmatched" as const, confidence: 0 };
  if (best.score >= 0.85) return { id: best.supplier.id, status: "matched" as const, confidence: best.score };
  return { id: best.supplier.id, status: "ambiguous" as const, confidence: best.score };
}

function matchProduct(productName: string, products: ProductRow[]) {
  const scored = products
    .map((product) => ({ product, score: similarity(productName, product.name || "") }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const alternatives = scored.slice(0, 3);
  if (!best) return { status: "new_product" as const, confidence: 0, productId: undefined, alternatives };
  if (best.score >= 0.88) return { status: "matched" as const, confidence: best.score, productId: best.product.id, alternatives };
  if (best.score >= 0.45) return { status: "ambiguous" as const, confidence: best.score, productId: best.product.id, alternatives };
  return { status: "new_product" as const, confidence: best.score, productId: undefined, alternatives };
}

function historicalForLine(line: { productName: string; matchedProductId?: string }, history: HistoricalPriceRow[]) {
  return history.find((item) => {
    if (line.matchedProductId && item.normalized_product_id === line.matchedProductId) return true;
    return item.product_name ? similarity(line.productName, item.product_name) >= 0.88 : false;
  });
}

async function upsertReconciliation(summary: Omit<DocumentReconciliationSummary, "id">) {
  const existing = await adminSupabaseRequest<Array<{ id: string }>>("admin_document_reconciliations", {
    method: "GET",
    query: `?select=id&uploaded_document_id=eq.${encodeURIComponent(summary.uploadedDocumentId)}&limit=1`,
  });
  if (!existing.ok) return existing;

  const payload = {
    updated_at: new Date().toISOString(),
    uploaded_document_id: summary.uploadedDocumentId,
    document_type: "purchase_invoice",
    supplier_name: summary.supplierName,
    supplier_tax_id: summary.supplierTaxId,
    matched_supplier_id: summary.matchedSupplierId,
    supplier_match_status: summary.supplierMatchStatus,
    supplier_match_confidence: summary.supplierMatchConfidence,
    document_number: summary.documentNumber,
    document_date: summary.documentDate,
    taxable_base: summary.taxableBase,
    vat_amount: summary.vatAmount,
    total_amount: summary.totalAmount,
    status: summary.status,
    line_count: summary.lineCount,
    matched_lines: summary.matchedLines,
    ambiguous_lines: summary.ambiguousLines,
    unrecognized_lines: summary.unrecognizedLines,
    price_alerts: summary.priceAlerts,
    tax_alerts: summary.taxAlerts,
    unit_alerts: summary.unitAlerts,
    warnings: summary.warnings,
    errors: summary.errors,
    summary: summary.summary,
  };

  if (existing.data[0]?.id) {
    const updated = await adminSupabaseRequest<undefined>("admin_document_reconciliations", {
      method: "PATCH",
      query: `?id=eq.${encodeURIComponent(existing.data[0].id)}`,
      body: JSON.stringify(payload),
      headers: { Prefer: "return=minimal" },
    });
    if (!updated.ok) return updated;
    return { ok: true as const, data: existing.data[0].id };
  }

  const created = await adminSupabaseRequest<Array<{ id: string }>>("admin_document_reconciliations", {
    method: "POST",
    query: "?select=id",
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true as const, data: created.data[0].id };
}

async function emitReconciliationEventOnce(uploadedDocumentId: string, eventName: "DocumentReconciliationProposed" | "DocumentReconciliationFailed", payload: Parameters<typeof createDomainEvent>[1]["payload"]) {
  const existingEvents = await findDomainEventsByCorrelationId(uploadedDocumentId);
  if (existingEvents.ok && existingEvents.data.some((event) => event.event_type === eventName)) return;

  await emitDomainEventSafe(createDomainEvent(eventName, {
    source: "inbox",
    correlationId: uploadedDocumentId,
    trace: { documentId: uploadedDocumentId },
    payload,
  }));
}

async function replaceReconciliationLines(reconciliationId: string, uploadedDocumentId: string, lines: Array<Omit<DocumentReconciliationLineSummary, "id" | "reconciliationId"> & { rawLine: OcrLine; alternatives: Array<{ product: ProductRow; score: number }> }>) {
  const deleted = await adminSupabaseRequest<undefined>("admin_document_reconciliation_lines", {
    method: "DELETE",
    query: `?reconciliation_id=eq.${encodeURIComponent(reconciliationId)}`,
    headers: { Prefer: "return=minimal" },
  });
  if (!deleted.ok) return deleted;

  for (const line of lines) {
    const inserted = await adminSupabaseRequest<Array<{ id: string }>>("admin_document_reconciliation_lines", {
      method: "POST",
      query: "?select=id",
      body: JSON.stringify({
        reconciliation_id: reconciliationId,
        uploaded_document_id: uploadedDocumentId,
        line_index: line.lineIndex,
        product_name: line.productName,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unitPrice,
        vat_rate: line.vatRate,
        total_amount: line.totalAmount,
        batch_number: line.batchNumber,
        expiry_date: line.expiryDate,
        matched_product_id: line.matchedProductId,
        match_status: line.matchStatus,
        match_confidence: line.matchConfidence,
        price_status: line.priceStatus,
        historical_unit_price: line.historicalUnitPrice,
        price_deviation_percent: line.priceDeviationPercent,
        tax_status: line.taxStatus,
        unit_status: line.unitStatus,
        warnings: line.warnings,
        raw_line: line.rawLine,
      }),
      headers: { Prefer: "return=representation" },
    });
    if (!inserted.ok) return inserted;

    const lineId = inserted.data[0]?.id;
    for (const alternative of line.alternatives) {
      await adminSupabaseRequest<undefined>("admin_document_product_matches", {
        method: "POST",
        body: JSON.stringify({
          reconciliation_line_id: lineId,
          product_id: alternative.product.id,
          product_name: alternative.product.name,
          confidence: alternative.score,
          match_reason: alternative.score >= 0.88 ? "Coincidencia fuerte por nombre normalizado." : "Candidato por similitud de nombre.",
        }),
        headers: { Prefer: "return=minimal" },
      });
    }
  }

  return { ok: true as const, data: null };
}

function buildLine(line: OcrLine, index: number, products: ProductRow[], history: HistoricalPriceRow[]) {
  const productName = text(line.nombre || line.productName);
  const quantity = number(line.cantidad ?? line.quantity);
  const unit = text(line.unidad || line.unit);
  const unitPrice = number(line.precio ?? line.unit_price);
  const totalAmount = number(line.importe ?? line.total);
  const vatRate = number(line.iva ?? line.vat_rate);
  const match = productName ? matchProduct(productName, products) : { status: "unrecognized" as const, confidence: 0, productId: undefined, alternatives: [] };
  const historical = productName ? historicalForLine({ productName, matchedProductId: match.productId }, history) : undefined;
  const warnings: string[] = [];
  let priceStatus: DocumentReconciliationLineSummary["priceStatus"] = "no_history";
  let priceDeviationPercent: number | undefined;

  if (!productName) warnings.push("Línea sin nombre de producto reconocible.");
  if (!quantity) warnings.push("Cantidad no reconocida.");
  if (!unit) warnings.push("Unidad no reconocida.");
  if (historical?.unit_price && unitPrice) {
    priceDeviationPercent = Math.round(((unitPrice - historical.unit_price) / historical.unit_price) * 10000) / 100;
    priceStatus = Math.abs(priceDeviationPercent) >= 15 ? "deviation" : "ok";
    if (priceStatus === "deviation") warnings.push(`Precio desviado ${priceDeviationPercent}% frente al histórico.`);
  }

  const taxStatus = historical?.vat_rate && vatRate
    ? Math.abs(Number(historical.vat_rate) - vatRate) > 0.01 ? "deviation" : "ok"
    : "not_checked";
  if (taxStatus === "deviation") warnings.push("IVA distinto al histórico del producto.");
  const unitStatus = historical?.unit && unit
    ? normalizeName(historical.unit) === normalizeName(unit) ? "ok" : "deviation"
    : "not_checked";
  if (unitStatus === "deviation") warnings.push("Unidad distinta al histórico del producto.");

  return {
    lineIndex: index,
    productName,
    quantity,
    unit,
    unitPrice,
    vatRate,
    totalAmount,
    batchNumber: text(line.lote || line.batch) || undefined,
    expiryDate: date(line.caducidad || line.expiry_date),
    matchedProductId: match.productId,
    matchStatus: match.status,
    matchConfidence: Math.round(match.confidence * 100) / 100,
    priceStatus,
    historicalUnitPrice: historical?.unit_price || undefined,
    priceDeviationPercent,
    taxStatus,
    unitStatus,
    warnings,
    rawLine: line,
    alternatives: match.alternatives,
  };
}

function statusFor(summary: { lineCount: number; matchedLines: number; ambiguousLines: number; unrecognizedLines: number; priceAlerts: number; taxAlerts: number; unitAlerts: number; errors: string[] }) {
  if (summary.errors.length) return "failed" as const;
  if (!summary.lineCount || summary.unrecognizedLines || summary.priceAlerts || summary.taxAlerts || summary.unitAlerts) return "requires_intervention" as const;
  if (summary.ambiguousLines) return "partially_reconciled" as const;
  if (summary.matchedLines === summary.lineCount) return "reconciled" as const;
  return "pending_review" as const;
}

export async function reconcileInboxDocument(uploadedDocumentId: string): Promise<DbResult<DocumentReconciliationSummary>> {
  const document = await getUploadedDocument(uploadedDocumentId);
  if (!document.ok) return document;
  const documentType = normalizeDocumentType(document.data.confirmed_type || document.data.selected_type || document.data.detected_type);
  if (documentType !== "purchase_invoice" && documentType !== "credit_note" && documentType !== "accounting_document") {
    return { ok: false, error: "La conciliación documental solo se aplica a facturas de compra." };
  }

  const [suppliersResult, productsResult, historyResult] = await Promise.all([
    supplierCandidates(),
    productCandidates(),
    historicalPrices(),
  ]);
  if (!suppliersResult.ok) return suppliersResult;
  if (!productsResult.ok) return productsResult;
  if (!historyResult.ok) return historyResult;

  const corrections = document.data.corrections || {};
  const supplierName = text(corrections.supplier);
  const supplierTaxId = text(corrections.supplier_tax_id || corrections.cif);
  const supplier = matchSupplier(supplierName, supplierTaxId, suppliersResult.data);
  const ocrLines = extractLines(document.data);
  const lines = ocrLines.map((line, index) => buildLine(line, index + 1, productsResult.data, historyResult.data));
  const warnings = [
    !supplierName ? "Proveedor no reconocido en OCR." : "",
    supplier.status !== "matched" ? "Proveedor pendiente de revisión o ambiguo." : "",
    !ocrLines.length ? "No se han detectado líneas de factura." : "",
  ].filter(Boolean);
  const lineStats = {
    lineCount: lines.length,
    matchedLines: lines.filter((line) => line.matchStatus === "matched").length,
    ambiguousLines: lines.filter((line) => line.matchStatus === "ambiguous").length,
    unrecognizedLines: lines.filter((line) => line.matchStatus === "new_product" || line.matchStatus === "unrecognized").length,
    priceAlerts: lines.filter((line) => line.priceStatus === "deviation").length,
    taxAlerts: lines.filter((line) => line.taxStatus === "deviation").length,
    unitAlerts: lines.filter((line) => line.unitStatus === "deviation").length,
    errors: [] as string[],
  };
  const status = statusFor(lineStats);
  const summary = {
    uploadedDocumentId,
    status,
    supplierName,
    supplierTaxId,
    matchedSupplierId: supplier.id,
    supplierMatchStatus: supplier.status,
    supplierMatchConfidence: Math.round(supplier.confidence * 100) / 100,
    documentNumber: text(corrections.document_number),
    documentDate: date(corrections.document_date),
    taxableBase: number(corrections.taxable_base),
    vatAmount: number(corrections.vat_amount),
    totalAmount: number(corrections.total_amount),
    ...lineStats,
    warnings,
    summary: `Conciliación OCR: ${lineStats.matchedLines}/${lineStats.lineCount} líneas conciliadas. ${lineStats.unrecognizedLines} nuevas/no reconocidas.`,
  };

  const reconciliation = await upsertReconciliation(summary);
  if (!reconciliation.ok) return reconciliation;
  const lineResult = await replaceReconciliationLines(reconciliation.data, uploadedDocumentId, lines);
  if (!lineResult.ok) return lineResult;

  const saved = { id: reconciliation.data, ...summary };
  await emitReconciliationEventOnce(uploadedDocumentId, "DocumentReconciliationProposed", {
    uploadedDocumentId,
    reconciliationId: reconciliation.data,
    status,
    supplierName,
    matchedSupplierId: supplier.id,
    lineCount: lineStats.lineCount,
    matchedLines: lineStats.matchedLines,
    ambiguousLines: lineStats.ambiguousLines,
    unrecognizedLines: lineStats.unrecognizedLines,
    warnings,
  });

  return { ok: true, data: saved };
}

export async function markDocumentReconciliationFailed(uploadedDocumentId: string, error: string) {
  const existing = await upsertReconciliation({
    uploadedDocumentId,
    status: "failed",
    supplierMatchStatus: "unmatched",
    supplierMatchConfidence: 0,
    lineCount: 0,
    matchedLines: 0,
    ambiguousLines: 0,
    unrecognizedLines: 0,
    priceAlerts: 0,
    taxAlerts: 0,
    unitAlerts: 0,
    warnings: [],
    errors: [error],
    summary: "No se ha podido generar la propuesta de conciliación.",
  });
  await emitReconciliationEventOnce(uploadedDocumentId, "DocumentReconciliationFailed", { uploadedDocumentId, error });
  return existing.ok ? { ok: true as const, data: null } : existing;
}

export async function getDocumentReconciliation(uploadedDocumentId: string): Promise<DbResult<DocumentReconciliationView | null>> {
  const rows = await adminSupabaseRequest<ReconciliationRow[]>("admin_document_reconciliations", {
    method: "GET",
    query: `?select=*&uploaded_document_id=eq.${encodeURIComponent(uploadedDocumentId)}&limit=1`,
  });
  if (!rows.ok) return rows;
  const row = rows.data[0];
  if (!row) return { ok: true, data: null };
  const lines = await adminSupabaseRequest<ReconciliationLineRow[]>("admin_document_reconciliation_lines", {
    method: "GET",
    query: `?select=*&reconciliation_id=eq.${encodeURIComponent(row.id)}&order=line_index.asc`,
  });
  if (!lines.ok) return lines;
  return { ok: true, data: { ...rowToSummary(row), lines: lines.data.map(rowToLine) } };
}

export async function listDocumentReconciliations(uploadedDocumentIds: string[]): Promise<DbResult<Record<string, DocumentReconciliationView>>> {
  const entries = await Promise.all(uploadedDocumentIds.map((id) => getDocumentReconciliation(id)));
  const result: Record<string, DocumentReconciliationView> = {};
  for (const entry of entries) {
    if (!entry.ok) return entry;
    if (entry.data) result[entry.data.uploadedDocumentId] = entry.data;
  }
  return { ok: true, data: result };
}
