/**
 * Production repository.
 *
 * Gestiona produccion interna, lotes internos, movimientos y recetas base.
 * Proxy temporal sobre legacy-core.
 */
export {
  createInternalRecipe,
  createProductionBatch,
  createProductionMovement,
  getInternalRecipes,
  getProductionBatches,
  getProductionMetrics,
  getProductionTraceabilityRows,
} from "./legacy-core";
