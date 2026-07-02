/**
 * Inventory repository.
 *
 * Fuente futura para productos, lotes reales, movimientos, FEFO y caducidades.
 * Sigue delegando en legacy-core para no modificar comportamiento.
 */
type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type InventoryReadyLot = {
  inventory_lot_id: string;
  product_id: string | null;
  producto: string | null;
  lote: string | null;
  stock: number | null;
  unidad: string | null;
  caducidad: string | null;
  proveedor: string | null;
  factura: string | null;
  fecha_compra: string | null;
  ubicacion: string | null;
  estado: string | null;
  purchase_document_id?: string | null;
  purchase_line_id?: string | null;
  supplier_document_id?: string | null;
  uploaded_document_id?: string | null;
  requires_traceability?: boolean | null;
  requires_appcc_reception?: boolean | null;
  generates_inventory_lot?: boolean | null;
  fefo_rank: number | null;
  fefo: boolean | null;
  listo_para_produccion: boolean | null;
  listo_para_etiqueta: boolean | null;
  requiere_revision: boolean | null;
  motivo_revision: string | null;
  product_family?: string | null;
  storage_temperature?: string | null;
  expiry_source?: ExpirySource | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
  appcc_review_status?: string | null;
};

export type ExpirySource = "real_documentada" | "estimada_por_regla" | "revisada_manual";

export type InventoryLotReviewUpdate = {
  lotId: string;
  expiryDate?: string | null;
  expirySource: ExpirySource;
  reviewedBy: string;
  reviewNotes?: string | null;
  appccReviewStatus?: "pendiente_revision" | "revisado" | "requiere_documentacion";
};

export type ExpiryRulePreview = {
  lotId: string;
  product: string;
  batch: string | null;
  purchaseDate: string | null;
  currentExpiry: string | null;
  suggestedExpiry: string | null;
  rule: string;
  expirySource: "estimada_por_regla";
  confidence: "media" | "baja";
  notes: string;
};

export type InventoryActivationResult = {
  products_created?: number;
  lots_created?: number;
  movements_created?: number;
  receptions_created?: number;
  products_rebuilt?: number;
};

export type InventoryActivationMetrics = {
  activeProducts: number;
  activeLots: number;
  lotsReadyForProduction: number;
  lotsReadyForLabels: number;
  productsWithoutLot: number;
  productsPendingReview: number;
};

export type InventoryLabelPreview = {
  model: "recepcion" | "lote" | "elaboracion";
  product: string;
  batch: string | null;
  supplier: string | null;
  expiryDate: string | null;
  receivedDate?: string | null;
  location?: string | null;
  copies: number;
  qrPayload: {
    type: string;
    product: string;
    batch: string | null;
    supplier: string | null;
    expiry_date: string | null;
    inventory_lot_id?: string;
    production_batch_id?: string;
  };
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

function labelFromLot(lot: InventoryReadyLot, model: InventoryLabelPreview["model"]): InventoryLabelPreview {
  const product = lot.producto || "Producto";
  const batch = lot.lote;
  const supplier = lot.proveedor;
  const expiryDate = lot.caducidad;

  return {
    model,
    product,
    batch,
    supplier,
    expiryDate,
    receivedDate: lot.fecha_compra,
    location: lot.ubicacion,
    copies: 1,
    qrPayload: {
      type: model === "elaboracion" ? "production_batch" : "inventory_lot",
      product,
      batch,
      supplier,
      expiry_date: expiryDate,
      inventory_lot_id: lot.inventory_lot_id,
    },
  };
}

function addDays(date: string | null, days: number) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function addMonths(date: string | null, months: number) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCMonth(parsed.getUTCMonth() + months);
  return parsed.toISOString().slice(0, 10);
}

function buildExpiryRulePreview(lot: InventoryReadyLot): ExpiryRulePreview {
  const product = (lot.producto || "").toLowerCase();
  const family = (lot.product_family || "").toLowerCase();
  const storage = (lot.storage_temperature || "").toLowerCase();
  const categoryText = `${product} ${family} ${storage}`;
  let suggestedExpiry: string | null = null;
  let rule = "productos secos/ambiente: compra + 6 meses";
  let confidence: ExpiryRulePreview["confidence"] = "baja";

  if (categoryText.includes("frozen") || categoryText.includes("cong") || categoryText.includes("congel")) {
    suggestedExpiry = addMonths(lot.fecha_compra, 12);
    rule = "congelado: compra + 12 meses";
    confidence = "media";
  } else if (family.includes("beverage") || family.includes("alcohol") || categoryText.includes("bebida") || categoryText.includes("coca") || categoryText.includes("fanta") || categoryText.includes("agua ")) {
    suggestedExpiry = addMonths(lot.fecha_compra, 12);
    rule = "bebida envasada: compra + 12 meses";
    confidence = "media";
  } else if (categoryText.includes("salsa") || categoryText.includes("ssa ") || categoryText.includes("alioli") || categoryText.includes("mostaza") || categoryText.includes("bbq") || categoryText.includes("baconesa")) {
    suggestedExpiry = addMonths(lot.fecha_compra, 6);
    rule = "salsas industriales cerradas: compra + 6 meses";
    confidence = "media";
  } else if (categoryText.includes("huevo")) {
    suggestedExpiry = addDays(lot.fecha_compra, 21);
    rule = "huevos: compra + 21 días";
    confidence = "media";
  } else if (categoryText.includes("lact") || categoryText.includes("leche") || categoryText.includes("queso") || categoryText.includes("qso") || categoryText.includes("mozzarella") || categoryText.includes("margarina")) {
    const shortLife = categoryText.includes("leche") || categoryText.includes("creme") || categoryText.includes("lactea");
    suggestedExpiry = addDays(lot.fecha_compra, shortLife ? 7 : 14);
    rule = shortLife ? "lácteos frescos: compra + 7 días" : "lácteos frescos: compra + 14 días";
    confidence = "media";
  } else if (family.includes("meat") || categoryText.includes("carne") || categoryText.includes("pollo") || categoryText.includes("cerdo") || categoryText.includes("bacon") || categoryText.includes("lomo") || categoryText.includes("costilla")) {
    suggestedExpiry = addDays(lot.fecha_compra, 3);
    rule = "carnes frescas: compra + 3 días";
    confidence = storage.includes("frozen") || categoryText.includes("cong") ? "baja" : "media";
  } else if (categoryText.includes("patata") || categoryText.includes("tomate") || categoryText.includes("cebolla") || categoryText.includes("lechuga") || categoryText.includes("limon") || categoryText.includes("repollo")) {
    suggestedExpiry = addDays(lot.fecha_compra, 5);
    rule = "verduras frescas: compra + 5 días";
    confidence = "media";
  } else {
    suggestedExpiry = addMonths(lot.fecha_compra, 6);
  }

  return {
    lotId: lot.inventory_lot_id,
    product: lot.producto || "Producto",
    batch: lot.lote,
    purchaseDate: lot.fecha_compra,
    currentExpiry: lot.caducidad,
    suggestedExpiry,
    rule,
    expirySource: "estimada_por_regla",
    confidence,
    notes: suggestedExpiry
      ? "Sugerencia calculada para revisión humana. No equivale a caducidad real documentada."
      : "No se puede sugerir caducidad porque falta fecha de compra.",
  };
}

export async function activateHistoricalStock(): Promise<DbResult<InventoryActivationResult>> {
  const result = await supabaseRest<InventoryActivationResult>("rpc/admin_activate_historical_stock", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data || {} };
}

export async function rebuildInventoryCache(): Promise<DbResult<InventoryActivationResult>> {
  const result = await supabaseRest<InventoryActivationResult>("rpc/admin_rebuild_inventory_cache", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data || {} };
}

export async function calculateCurrentLotStock(lotId: string): Promise<DbResult<{ lotId: string; currentQuantity: number; movementBalance: number; unit: string | null }>> {
  if (!lotId) return { ok: false, error: "Falta lote." };

  const [lotResult, movementResult] = await Promise.all([
    supabaseRest<Array<{ id: string; current_quantity: number | null; unit: string | null }>>("admin_inventory_lots", {
      method: "GET",
      query: `?select=id,current_quantity,unit&id=eq.${encodeURIComponent(lotId)}&limit=1`,
    }),
    supabaseRest<Array<{ movement_type: string | null; quantity: number | null }>>("admin_inventory_lot_movements", {
      method: "GET",
      query: `?select=movement_type,quantity&lot_id=eq.${encodeURIComponent(lotId)}&limit=1000`,
    }),
  ]);

  if (!lotResult.ok) return lotResult;
  if (!movementResult.ok) return movementResult;

  const lot = lotResult.data[0];
  if (!lot) return { ok: false, error: "Lote no localizado." };

  const movementBalance = movementResult.data.reduce((total, movement) => {
    const quantity = Number(movement.quantity || 0);
    if (movement.movement_type === "entrada" || movement.movement_type === "regularizacion") return total + quantity;
    return total - Math.abs(quantity);
  }, 0);

  return {
    ok: true,
    data: {
      lotId: lot.id,
      currentQuantity: Number(lot.current_quantity || 0),
      movementBalance,
      unit: lot.unit,
    },
  };
}

export async function findLotsReadyForProduction(limit = 500): Promise<DbResult<InventoryReadyLot[]>> {
  const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
  return supabaseRest<InventoryReadyLot[]>("admin_inventory_ready_view", {
    method: "GET",
    query: `?select=*&listo_para_produccion=eq.true&order=producto.asc,fefo_rank.asc&limit=${safeLimit}`,
  });
}

export async function listLotsReadyForLabels(limit = 500): Promise<DbResult<InventoryReadyLot[]>> {
  const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
  return supabaseRest<InventoryReadyLot[]>("admin_inventory_ready_view", {
    method: "GET",
    query: `?select=*&listo_para_etiqueta=eq.true&order=producto.asc,fefo_rank.asc&limit=${safeLimit}`,
  });
}

export async function listProductsReadyForPrinting(limit = 500): Promise<DbResult<InventoryReadyLot[]>> {
  return listLotsReadyForLabels(limit);
}

export async function previewInventoryLabel(lotId: string): Promise<DbResult<InventoryLabelPreview>> {
  const result = await supabaseRest<InventoryReadyLot[]>("admin_inventory_ready_view", {
    method: "GET",
    query: `?select=*&inventory_lot_id=eq.${encodeURIComponent(lotId)}&limit=1`,
  });
  if (!result.ok) return result;
  const lot = result.data[0];
  if (!lot) return { ok: false, error: "Lote no localizado para etiqueta." };
  return { ok: true, data: labelFromLot(lot, "lote") };
}

export async function previewProductionLabel(lotId: string): Promise<DbResult<InventoryLabelPreview>> {
  const preview = await previewInventoryLabel(lotId);
  if (!preview.ok) return preview;
  return {
    ok: true,
    data: {
      ...preview.data,
      model: "elaboracion",
      qrPayload: {
        ...preview.data.qrPayload,
        type: "production_input_lot",
      },
    },
  };
}

export async function getInventoryActivationMetrics(): Promise<DbResult<InventoryActivationMetrics>> {
  const result = await supabaseRest<InventoryReadyLot[]>("admin_inventory_ready_view", {
    method: "GET",
    query: "?select=product_id,inventory_lot_id,listo_para_produccion,listo_para_etiqueta,lote,requiere_revision&limit=5000",
  });
  if (!result.ok) return result;

  const productIds = new Set(result.data.map((row) => row.product_id).filter(Boolean));
  const lots = result.data.filter((row) => row.inventory_lot_id);

  return {
    ok: true,
    data: {
      activeProducts: productIds.size,
      activeLots: lots.length,
      lotsReadyForProduction: lots.filter((row) => row.listo_para_produccion).length,
      lotsReadyForLabels: lots.filter((row) => row.listo_para_etiqueta).length,
      productsWithoutLot: lots.filter((row) => !row.lote).length,
      productsPendingReview: lots.filter((row) => row.requiere_revision).length,
    },
  };
}

export async function listInventoryLotsRequiringReview(limit = 200): Promise<DbResult<Array<InventoryReadyLot & { expirySuggestion: ExpiryRulePreview }>>> {
  const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
  const result = await supabaseRest<InventoryReadyLot[]>("admin_inventory_ready_view", {
    method: "GET",
    query: `?select=*&requiere_revision=eq.true&order=fecha_compra.asc.nullslast,producto.asc&limit=${safeLimit}`,
  });
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.map((lot) => ({ ...lot, expirySuggestion: buildExpiryRulePreview(lot) })),
  };
}

export async function updateInventoryLotReviewData(input: InventoryLotReviewUpdate): Promise<DbResult<null>> {
  if (!input.lotId) return { ok: false, error: "Falta lote." };
  if (!input.reviewedBy?.trim()) return { ok: false, error: "Falta responsable de revisión." };
  if (!["real_documentada", "estimada_por_regla", "revisada_manual"].includes(input.expirySource)) {
    return { ok: false, error: "Fuente de caducidad no válida." };
  }
  if (input.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate)) {
    return { ok: false, error: "Caducidad no válida." };
  }

  const result = await supabaseRest<undefined>("admin_inventory_lots", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(input.lotId)}`,
    body: JSON.stringify({
      updated_at: new Date().toISOString(),
      expiry_date: input.expiryDate || null,
      expiry_source: input.expirySource,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.reviewedBy.trim(),
      review_notes: input.reviewNotes || null,
      appcc_review_status: input.appccReviewStatus || "revisado",
    }),
    headers: { Prefer: "return=minimal" },
  });
  if (!result.ok) return result;

  await rebuildInventoryCache();
  return { ok: true, data: null };
}

export async function bulkApplyExpiryRulesPreview(limit = 200): Promise<DbResult<ExpiryRulePreview[]>> {
  const lots = await listInventoryLotsRequiringReview(limit);
  if (!lots.ok) return lots;
  return {
    ok: true,
    data: lots.data.map((lot) => lot.expirySuggestion).filter((preview) => preview.suggestedExpiry),
  };
}

export async function bulkApplyExpiryRulesConfirm(input: {
  lotIds: string[];
  reviewedBy: string;
  reviewNotes?: string;
}): Promise<DbResult<{ updated: number; skipped: number }>> {
  const ids = Array.from(new Set(input.lotIds.filter(Boolean)));
  if (!ids.length) return { ok: false, error: "No hay lotes seleccionados." };

  const preview = await bulkApplyExpiryRulesPreview(1000);
  if (!preview.ok) return preview;
  const byId = new Map(preview.data.map((item) => [item.lotId, item]));
  let updated = 0;
  let skipped = 0;

  for (const lotId of ids) {
    const suggestion = byId.get(lotId);
    if (!suggestion?.suggestedExpiry) {
      skipped += 1;
      continue;
    }
    const result = await updateInventoryLotReviewData({
      lotId,
      expiryDate: suggestion.suggestedExpiry,
      expirySource: "estimada_por_regla",
      reviewedBy: input.reviewedBy,
      reviewNotes: [input.reviewNotes, suggestion.rule, suggestion.notes].filter(Boolean).join(" · "),
      appccReviewStatus: "revisado",
    });
    if (result.ok) updated += 1;
    else skipped += 1;
  }

  return { ok: true, data: { updated, skipped } };
}

export {
  applyInventoryMovement,
  createInventoryProduct,
  getExpiryBuckets,
  getInventoryLotMovements,
  getInventoryLots,
  getInventoryMovements,
  getInventoryProductById,
  getInventoryProducts,
  getProductionMaterialOptions,
  insertInventoryMovement,
  updateInventoryProduct,
  upsertInventoryFromAiReception,
} from "./legacy-core";
