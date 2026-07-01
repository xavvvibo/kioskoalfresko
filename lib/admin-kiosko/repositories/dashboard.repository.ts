/**
 * Dashboard repository.
 *
 * Agregados ejecutivos, alertas operativas y resumen sanitario del ERP.
 * Actualmente reexporta la implementacion legacy para evitar cambios de salida.
 */
export {
  getAdminDashboardSummary,
  getExecutiveDashboardMetrics,
  getOperationalAlerts,
} from "./legacy-core";
