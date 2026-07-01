/**
 * Inventory repository.
 *
 * Fuente futura para productos, lotes reales, movimientos, FEFO y caducidades.
 * Sigue delegando en legacy-core para no modificar comportamiento.
 */
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
