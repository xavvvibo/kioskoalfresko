import type {
  DocumentImportContext,
  DocumentImportHandlerResult,
  DocumentImportPipelineResult,
} from "../domain/document-import/contracts";
import { normalizeDocumentType } from "./documents.repository";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type UploadedDocumentImportRow = {
  id: string;
  original_filename: string | null;
  uploaded_at: string | null;
  confirmed_type: string | null;
  selected_type: string | null;
  detected_type: string | null;
  corrections: Record<string, unknown> | null;
};

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config.url || !config.serviceRoleKey) {
    return { ok: false as const, error: "Supabase no está configurado." };
  }

  return { ok: true as const, config };
}

async function restRequest<T>(resource: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
  const configResult = assertSupabaseConfig();
  if (!configResult.ok) return configResult;

  try {
    const response = await fetch(`${configResult.config.url}/rest/v1/${resource}${init.query || ""}`, {
      ...init,
      headers: {
        apikey: configResult.config.serviceRoleKey,
        Authorization: `Bearer ${configResult.config.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    const responseText = await response.text();

    if (!response.ok) {
      let error = responseText || `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(responseText) as { message?: string; details?: string; hint?: string; code?: string };
        error = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(" · ");
      } catch {
        // Keep raw response.
      }
      return { ok: false, error };
    }

    if (response.status === 204 || !responseText) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function number(value: unknown) {
  const normalized = text(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = normalized ? Number(normalized) : undefined;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function date(value: unknown) {
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function todayMadrid() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function correctionProduct(corrections: Record<string, unknown>) {
  return text(corrections.product || corrections.products).split(/[,;\n]/).map((item) => item.trim()).filter(Boolean)[0] || text(corrections.product || corrections.products);
}

export async function getDocumentImportContext(input: {
  uploadedDocumentId: string;
  eventId: string;
  correlationId?: string;
  confirmedType?: string;
}): Promise<DbResult<DocumentImportContext>> {
  const rows = await restRequest<UploadedDocumentImportRow[]>("admin_uploaded_documents", {
    method: "GET",
    query: `?select=id,original_filename,uploaded_at,confirmed_type,selected_type,detected_type,corrections&id=eq.${encodeURIComponent(input.uploadedDocumentId)}&limit=1`,
  });
  if (!rows.ok) return rows;
  const row = rows.data[0];
  if (!row) return { ok: false, error: "Documento de bandeja no encontrado." };

  const corrections = row.corrections || {};
  return {
    ok: true,
    data: {
      uploadedDocumentId: row.id,
      eventId: input.eventId,
      correlationId: input.correlationId,
      confirmedType: normalizeDocumentType(input.confirmedType || row.confirmed_type || row.selected_type || row.detected_type),
      filename: row.original_filename || "Documento",
      uploadedAt: row.uploaded_at || undefined,
      supplier: text(corrections.supplier),
      supplierTaxId: text(corrections.supplier_tax_id || corrections.cif),
      documentNumber: text(corrections.document_number),
      documentDate: date(corrections.document_date),
      totalAmount: number(corrections.total_amount),
      taxableBase: number(corrections.taxable_base),
      vatAmount: number(corrections.vat_amount),
      product: correctionProduct(corrections),
      products: text(corrections.products),
      batchNumber: text(corrections.batch_number),
      expiryDate: date(corrections.expiry_date),
      temperature: number(corrections.temperature),
      location: text(corrections.location),
      category: text(corrections.category),
      traceability: text(corrections.traceability),
      appcc: text(corrections.appcc),
      rawCorrections: corrections,
    },
  };
}

export async function markDocumentImportStarted(uploadedDocumentId: string) {
  return restRequest<undefined>("admin_uploaded_documents", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(uploadedDocumentId)}`,
    body: JSON.stringify({
      processing_status: "processing",
      import_status: "processing",
      import_started_at: new Date().toISOString(),
      import_error: null,
    }),
    headers: { Prefer: "return=minimal" },
  });
}

export async function markDocumentImportCompleted(result: DocumentImportPipelineResult) {
  const failed = result.results.filter((item) => item.status === "failed");
  const warnings = result.results.filter((item) => item.status === "warning" || item.status === "needs_review");
  return restRequest<undefined>("admin_uploaded_documents", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(result.uploadedDocumentId)}`,
    body: JSON.stringify({
      processing_status: result.status === "success" || result.status === "warning" ? "imported" : result.status,
      import_status: result.status,
      imported_at: result.status === "success" || result.status === "warning" ? result.completedAt : null,
      import_completed_at: result.completedAt,
      import_duration_ms: result.durationMs,
      import_handler_results: result.results,
      import_error: failed.map((item) => item.message).join(" · ") || null,
      processing_error: failed.map((item) => item.message).join(" · ") || null,
      review_status: result.status === "failed" ? "rechazado" : warnings.length ? "pendiente_revision" : "confirmado",
    }),
    headers: { Prefer: "return=minimal" },
  });
}

export function handlerResult(input: Omit<DocumentImportHandlerResult, "durationMs"> & { startedAt: number }): DocumentImportHandlerResult {
  return {
    ...input,
    durationMs: Date.now() - input.startedAt,
  };
}

async function findFirstId(resource: string, query: string) {
  const rows = await restRequest<Array<{ id: string }>>(resource, { method: "GET", query });
  if (!rows.ok) return rows;
  return { ok: true as const, data: rows.data[0]?.id || null };
}

export async function ensureAccountingDocumentFromInbox(context: DocumentImportContext): Promise<DbResult<{ id: string; created: boolean }>> {
  const existing = await findFirstId("admin_accounting_documents", `?select=id&uploaded_document_id=eq.${encodeURIComponent(context.uploadedDocumentId)}&limit=1`);
  if (!existing.ok) return existing;
  if (existing.data) return { ok: true, data: { id: existing.data, created: false } };
  if (!context.supplier || !context.documentDate || !context.documentNumber) {
    return { ok: false, error: "Faltan proveedor, fecha o número para crear factura." };
  }

  const created = await restRequest<Array<{ id: string }>>("admin_accounting_documents", {
    method: "POST",
    query: "?select=id",
    body: JSON.stringify({
      uploaded_document_id: context.uploadedDocumentId,
      supplier_name: context.supplier,
      supplier_tax_id: context.supplierTaxId || null,
      document_type: context.confirmedType,
      document_number: context.documentNumber,
      document_date: context.documentDate,
      taxable_base: context.taxableBase,
      vat_amount: context.vatAmount,
      total_amount: context.totalAmount,
      reconciliation_status: "pendiente_conciliar",
      review_status: "pendiente_revision",
      observations: "Documento creado desde InboxImportConfirmed. Preparado para conciliación contable.",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: { id: created.data[0].id, created: true } };
}

export async function ensureGoodsReceptionFromInbox(context: DocumentImportContext): Promise<DbResult<{ id: string; created: boolean }>> {
  const existing = await findFirstId("admin_goods_reception_records", `?select=id&uploaded_document_id=eq.${encodeURIComponent(context.uploadedDocumentId)}&limit=1`);
  if (!existing.ok) return existing;
  if (existing.data) return { ok: true, data: { id: existing.data, created: false } };
  if (!context.supplier || !context.product) return { ok: false, error: "Faltan proveedor o producto para crear recepción APPCC." };

  const created = await restRequest<Array<{ id: string }>>("admin_goods_reception_records", {
    method: "POST",
    query: "?select=id",
    body: JSON.stringify({
      record_date: context.documentDate || todayMadrid(),
      responsible: "F. Javier Bocanegra Sanjuan",
      supplier: context.supplier,
      product: context.product,
      delivery_temperature: context.temperature,
      accepted: true,
      batch_number: context.batchNumber || null,
      expiry_date: context.expiryDate || null,
      uploaded_document_id: context.uploadedDocumentId,
      status: context.temperature === undefined ? "revisar" : "correcto",
      observations: "Recepción creada desde InboxImportConfirmed. Stock definitivo pendiente de validación operativa.",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: { id: created.data[0].id, created: true } };
}

export async function ensureInventoryLotFromInbox(context: DocumentImportContext): Promise<DbResult<{ id: string; created: boolean }>> {
  const existing = await findFirstId("admin_inventory_lots", `?select=id&uploaded_document_id=eq.${encodeURIComponent(context.uploadedDocumentId)}&batch_number=eq.${encodeURIComponent(context.batchNumber || "sin-lote")}&limit=1`);
  if (!existing.ok) return existing;
  if (existing.data) return { ok: true, data: { id: existing.data, created: false } };
  if (!context.product || !context.batchNumber) return { ok: false, error: "Faltan producto o lote para preparar lote FEFO." };

  const created = await restRequest<Array<{ id: string }>>("admin_inventory_lots", {
    method: "POST",
    query: "?select=id",
    body: JSON.stringify({
      product_name: context.product,
      supplier_name: context.supplier || null,
      uploaded_document_id: context.uploadedDocumentId,
      batch_number: context.batchNumber,
      expiry_date: context.expiryDate || null,
      received_date: context.documentDate || todayMadrid(),
      initial_quantity: 0,
      current_quantity: 0,
      unit: "ud",
      location: context.location || "Pendiente de validar",
      status: context.expiryDate ? "pendiente_revision" : "pendiente_revision",
      requires_traceability: true,
      requires_appcc_reception: context.appcc !== "no",
      generates_inventory_lot: true,
      observations: "Lote preparado desde InboxImportConfirmed. No incrementa stock hasta validación.",
      source: "admin-kiosko-inbox-import",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: { id: created.data[0].id, created: true } };
}

export async function ensurePreparedLabelFromInbox(context: DocumentImportContext, inventoryLotId?: string): Promise<DbResult<{ id: string; created: boolean }>> {
  const existing = await findFirstId("admin_label_records", `?select=id&uploaded_document_id=eq.${encodeURIComponent(context.uploadedDocumentId)}&label_type=eq.inbox_prepared&limit=1`);
  if (!existing.ok) return existing;
  if (existing.data) return { ok: true, data: { id: existing.data, created: false } };
  if (!context.product && !context.batchNumber) return { ok: false, error: "Faltan producto o lote para preparar etiqueta." };

  const created = await restRequest<Array<{ id: string }>>("admin_label_records", {
    method: "POST",
    query: "?select=id",
    body: JSON.stringify({
      model: "Recepción",
      product: context.product || "Producto pendiente de revisar",
      batch: context.batchNumber || null,
      supplier: context.supplier || null,
      best_before_date: context.expiryDate || null,
      responsible: "F. Javier Bocanegra Sanjuan",
      print_format: "termica",
      copies: 1,
      inventory_lot_id: inventoryLotId || null,
      uploaded_document_id: context.uploadedDocumentId,
      label_type: "inbox_prepared",
      review_warning: context.expiryDate ? null : "Caducidad pendiente de revisión antes de imprimir.",
      template: "recepcion",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: { id: created.data[0].id, created: true } };
}

export async function markInboxDocumentAsSanitaryArchive(context: DocumentImportContext, domainType: string) {
  return restRequest<undefined>("admin_uploaded_documents", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(context.uploadedDocumentId)}`,
    body: JSON.stringify({
      related_record_type: domainType,
      related_record_id: null,
      processing_status: "imported",
      imported_at: new Date().toISOString(),
    }),
    headers: { Prefer: "return=minimal" },
  });
}
