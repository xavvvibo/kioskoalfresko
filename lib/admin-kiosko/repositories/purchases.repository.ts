import type {
  ProductMasterCandidate,
  PurchaseDocument,
  PurchaseLine,
  PurchaseTraceabilityLink,
  SupplierMaster,
} from "../purchases/contracts";
import {
  buildProductCandidate,
  decidePurchaseLineRequirements,
  detectProductDuplicate,
  normalizeBarcode,
  normalizeProductName,
  normalizeSupplier,
  normalizeSupplierName,
} from "../purchases/normalization";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type SupplierRow = {
  id: string;
  supplier: string;
  cif: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  health_register?: string | null;
  appcc?: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  gtin?: string | null;
  ean?: string | null;
  category?: string | null;
  product_family?: string | null;
  accounting_category?: string | null;
};

type PurchaseDocumentRow = {
  id: string;
  uploaded_document_id: string | null;
  supplier_id: string | null;
  normalized_supplier_id: string | null;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  document_type: string | null;
  document_number: string | null;
  document_date: string | null;
  taxable_base: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  purchase_status: string | null;
  accounting_category: string | null;
};

type PurchaseLineRow = {
  id: string;
  purchase_document_id: string | null;
  purchase_line_id: string | null;
  product_name: string | null;
  normalized_product_id: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  taxable_base: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  gtin: string | null;
  ean: string | null;
  batch_number: string | null;
  manufacturer_lot: string | null;
  expiry_date: string | null;
  origin_country: string | null;
  product_family: string | null;
  accounting_category: string | null;
  storage_temperature: string | null;
  default_location: string | null;
  requires_traceability: boolean | null;
  requires_appcc_reception: boolean | null;
  generates_inventory_lot: boolean | null;
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

async function supabaseRest<T>(resource: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
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
        // keep raw response
      }
      return { ok: false, error };
    }

    if (response.status === 204 || !responseText) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

function newStableId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function supplierFromRow(row: SupplierRow): SupplierMaster {
  return {
    id: row.id,
    name: row.supplier,
    taxId: row.cif,
    phone: row.phone,
    email: row.email,
    status: row.status,
    healthRegister: row.health_register,
    appcc: row.appcc,
  };
}

function purchaseDocumentFromRow(row: PurchaseDocumentRow): PurchaseDocument {
  return {
    id: row.id,
    uploadedDocumentId: row.uploaded_document_id,
    supplierId: row.normalized_supplier_id || row.supplier_id,
    supplierName: row.supplier_name || "",
    supplierTaxId: row.supplier_tax_id,
    documentType: row.document_type || "other",
    documentNumber: row.document_number,
    documentDate: row.document_date,
    taxableBase: row.taxable_base,
    vatAmount: row.vat_amount,
    totalAmount: row.total_amount,
    purchaseStatus: row.purchase_status as PurchaseDocument["purchaseStatus"],
    accountingCategory: row.accounting_category,
  };
}

function purchaseLineFromRow(row: PurchaseLineRow): PurchaseLine {
  return {
    id: row.id,
    purchaseDocumentId: row.purchase_document_id,
    purchaseLineId: row.purchase_line_id,
    productName: row.product_name || "",
    normalizedProductId: row.normalized_product_id,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unit_price,
    taxableBase: row.taxable_base,
    vatRate: row.vat_rate,
    vatAmount: row.vat_amount,
    totalAmount: row.total_amount,
    gtin: row.gtin,
    ean: row.ean,
    batchNumber: row.batch_number,
    manufacturerLot: row.manufacturer_lot,
    expiryDate: row.expiry_date,
    originCountry: row.origin_country,
    productFamily: row.product_family,
    accountingCategory: row.accounting_category,
    storageTemperature: row.storage_temperature,
    defaultLocation: row.default_location,
    requiresTraceability: Boolean(row.requires_traceability),
    requiresAppccReception: Boolean(row.requires_appcc_reception),
    generatesInventoryLot: Boolean(row.generates_inventory_lot),
  };
}

export async function findOrCreateSupplier(input: SupplierMaster): Promise<DbResult<SupplierMaster>> {
  const normalized = normalizeSupplier(input);
  const taxId = normalized.normalizedTaxId;
  const query = taxId
    ? `?select=id,supplier,cif,phone,email,status,health_register,appcc&cif=ilike.${encodeURIComponent(taxId)}&limit=1`
    : `?select=id,supplier,cif,phone,email,status,health_register,appcc&supplier=ilike.*${encodeURIComponent(normalized.name)}*&limit=10`;
  const existing = await supabaseRest<SupplierRow[]>("admin_supplier_records", { method: "GET", query });
  if (!existing.ok) return existing;

  const match = existing.data.find((supplier) => {
    return taxId ? normalizeSupplier({ name: supplier.supplier, taxId: supplier.cif }).normalizedTaxId === taxId : normalizeSupplierName(supplier.supplier) === normalized.normalizedName;
  });
  if (match) return { ok: true, data: supplierFromRow(match) };

  const created = await supabaseRest<SupplierRow[]>("admin_supplier_records", {
    method: "POST",
    query: "?select=id,supplier,cif,phone,email,status,health_register,appcc",
    body: JSON.stringify({
      supplier: normalized.name,
      cif: normalized.taxId,
      phone: input.phone,
      email: input.email,
      status: input.status || "pendiente_datos_administrativos",
      observations: "Proveedor creado desde núcleo de compras ERP. Revisar documentación administrativa y sanitaria.",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: supplierFromRow(created.data[0]) };
}

async function productCandidates(): Promise<DbResult<ProductMasterCandidate[]>> {
  const rows = await supabaseRest<ProductRow[]>(
    "admin_inventory_products",
    { method: "GET", query: "?select=id,name,gtin,ean,category,product_family,accounting_category&limit=1000" },
  );
  if (!rows.ok) return rows;
  return {
    ok: true,
    data: rows.data.map((row) => ({
      id: row.id,
      name: row.name,
      normalizedName: normalizeProductName(row.name),
      gtin: row.gtin,
      ean: row.ean,
      classification: "other",
      productFamily: row.product_family || row.category,
      accountingCategory: row.accounting_category,
      confidence: 0,
    })),
  };
}

export async function findOrCreateProductMaster(line: Pick<PurchaseLine, "productName" | "gtin" | "ean">): Promise<DbResult<ProductMasterCandidate>> {
  const candidates = await productCandidates();
  if (!candidates.ok) return candidates;
  const duplicate = detectProductDuplicate(line, candidates.data)[0];
  if (duplicate && duplicate.confidence >= 0.9) return { ok: true, data: duplicate };

  const candidate = buildProductCandidate(line);
  const decision = decidePurchaseLineRequirements(line.productName, candidate.classification);
  const created = await supabaseRest<ProductRow[]>("admin_inventory_products", {
    method: "POST",
    query: "?select=id,name,gtin,ean,category,product_family,accounting_category",
    body: JSON.stringify({
      name: candidate.name,
      category: decision.productFamily,
      product_family: decision.productFamily,
      accounting_category: decision.accountingCategory,
      gtin: normalizeBarcode(candidate.gtin) || null,
      ean: normalizeBarcode(candidate.ean) || null,
      requires_traceability: decision.requiresTraceability,
      requires_appcc_reception: decision.requiresAppccReception,
      generates_inventory_lot: decision.generatesInventoryLot,
      storage_temperature: decision.storageTemperature,
      default_location: decision.defaultLocation,
      active: true,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: { ...candidate, id: created.data[0]?.id, confidence: 1 } };
}

export async function createPurchaseDocument(input: PurchaseDocument): Promise<DbResult<PurchaseDocument>> {
  const created = await supabaseRest<PurchaseDocumentRow[]>("admin_accounting_documents", {
    method: "POST",
    query: "?select=id,uploaded_document_id,supplier_id,normalized_supplier_id,supplier_name,supplier_tax_id,document_type,document_number,document_date,taxable_base,vat_amount,total_amount,purchase_status,accounting_category",
    body: JSON.stringify({
      uploaded_document_id: input.uploadedDocumentId,
      supplier_id: input.supplierId,
      normalized_supplier_id: input.supplierId,
      supplier_name: input.supplierName,
      supplier_tax_id: input.supplierTaxId,
      document_type: input.documentType,
      document_number: input.documentNumber,
      document_date: input.documentDate,
      taxable_base: input.taxableBase,
      vat_amount: input.vatAmount,
      total_amount: input.totalAmount,
      purchase_status: input.purchaseStatus || "pending_review",
      accounting_category: input.accountingCategory,
      reconciliation_status: "pendiente_conciliar",
      review_status: "pendiente_revision",
      source: "admin-kiosko-purchase-core",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: purchaseDocumentFromRow(created.data[0]) };
}

export async function createPurchaseLine(input: PurchaseLine): Promise<DbResult<PurchaseLine>> {
  const classification = input.classification || decidePurchaseLineRequirements(input.productName).classification;
  const decision = decidePurchaseLineRequirements(input.productName, classification);
  const purchaseLineId = input.purchaseLineId || newStableId();
  const created = await supabaseRest<PurchaseLineRow[]>("admin_accounting_document_items", {
    method: "POST",
    query: "?select=id,purchase_document_id,purchase_line_id,product_name,normalized_product_id,quantity,unit,unit_price,taxable_base,vat_rate,vat_amount,total_amount,gtin,ean,batch_number,manufacturer_lot,expiry_date,origin_country,product_family,accounting_category,storage_temperature,default_location,requires_traceability,requires_appcc_reception,generates_inventory_lot",
    body: JSON.stringify({
      accounting_document_id: input.purchaseDocumentId,
      purchase_document_id: input.purchaseDocumentId,
      purchase_line_id: purchaseLineId,
      product_name: input.productName,
      normalized_product_id: input.normalizedProductId,
      inventory_product_id: input.normalizedProductId,
      quantity: input.quantity,
      unit: input.unit,
      unit_price: input.unitPrice,
      taxable_base: input.taxableBase,
      vat_rate: input.vatRate,
      vat_amount: input.vatAmount,
      total_amount: input.totalAmount,
      gtin: normalizeBarcode(input.gtin) || null,
      ean: normalizeBarcode(input.ean) || null,
      batch_number: input.batchNumber,
      manufacturer_lot: input.manufacturerLot,
      expiry_date: input.expiryDate,
      origin_country: input.originCountry,
      product_family: input.productFamily || decision.productFamily,
      accounting_category: input.accountingCategory || decision.accountingCategory,
      storage_temperature: input.storageTemperature || decision.storageTemperature,
      default_location: input.defaultLocation || decision.defaultLocation,
      requires_traceability: input.requiresTraceability ?? decision.requiresTraceability,
      requires_appcc_reception: input.requiresAppccReception ?? decision.requiresAppccReception,
      generates_inventory_lot: input.generatesInventoryLot ?? decision.generatesInventoryLot,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!created.ok) return created;
  return { ok: true, data: purchaseLineFromRow(created.data[0]) };
}

export async function linkPurchaseLineToInventoryLot(link: Pick<PurchaseTraceabilityLink, "purchaseDocumentId" | "purchaseLineId" | "inventoryLotId" | "productId">): Promise<DbResult<null>> {
  if (!link.inventoryLotId) return { ok: false, error: "Falta inventoryLotId." };
  const updated = await supabaseRest<undefined>("admin_inventory_lots", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(link.inventoryLotId)}`,
    body: JSON.stringify({
      purchase_document_id: link.purchaseDocumentId,
      purchase_line_id: link.purchaseLineId,
      normalized_product_id: link.productId,
    }),
    headers: { Prefer: "return=minimal" },
  });
  if (!updated.ok) return updated;
  return { ok: true, data: null };
}

export async function listPurchaseDocuments(limit = 100): Promise<DbResult<PurchaseDocument[]>> {
  const safeLimit = Math.max(1, Math.min(500, Math.round(limit)));
  const rows = await supabaseRest<PurchaseDocumentRow[]>("admin_accounting_documents", {
    method: "GET",
    query: `?select=id,uploaded_document_id,supplier_id,normalized_supplier_id,supplier_name,supplier_tax_id,document_type,document_number,document_date,taxable_base,vat_amount,total_amount,purchase_status,accounting_category&order=document_date.desc,created_at.desc&limit=${safeLimit}`,
  });
  if (!rows.ok) return rows;
  return { ok: true, data: rows.data.map(purchaseDocumentFromRow) };
}

export async function listPurchaseLinesPendingReview(): Promise<DbResult<Record<string, unknown>[]>> {
  return supabaseRest<Record<string, unknown>[]>("admin_purchase_lines_pending_review_view", {
    method: "GET",
    query: "?select=*&limit=500",
  });
}

export async function listProductsDeduplicationCandidates(): Promise<DbResult<Record<string, unknown>[]>> {
  return supabaseRest<Record<string, unknown>[]>("admin_products_deduplication_candidates_view", {
    method: "GET",
    query: "?select=*&limit=500",
  });
}

export async function listStockReadyForLabels(): Promise<DbResult<Record<string, unknown>[]>> {
  return supabaseRest<Record<string, unknown>[]>("admin_stock_ready_for_labels_view", {
    method: "GET",
    query: "?select=*&limit=500",
  });
}
