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
  fefo_rank: number | null;
  fefo: boolean | null;
  listo_para_produccion: boolean | null;
  listo_para_etiqueta: boolean | null;
  requiere_revision: boolean | null;
  motivo_revision: string | null;
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
