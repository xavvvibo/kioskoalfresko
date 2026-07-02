/**
 * Dashboard repository.
 *
 * Agregados ejecutivos, alertas operativas y resumen sanitario del ERP.
 * Actualmente reexporta la implementacion legacy para evitar cambios de salida.
 */
export { getInventoryActivationMetrics as getDashboardInventoryActivationMetrics } from "./inventory.repository";
export { getProductionOperationalDashboardMetrics as getDashboardProductionOperationalMetrics } from "./production.repository";

export {
  getAdminDashboardSummary,
  getExecutiveDashboardMetrics,
  getOperationalAlerts,
} from "./legacy-core";
