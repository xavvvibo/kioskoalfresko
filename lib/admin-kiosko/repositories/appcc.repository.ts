/**
 * APPCC repository.
 *
 * Source futura para registros sanitarios operativos: temperaturas, limpieza,
 * aceite, recepciones APPCC, incidencias, checklist, inspecciones e informes.
 * La implementacion se delega temporalmente en legacy-core para preservar
 * comportamiento durante el refactor.
 */
export {
  appccRecordsToCsv,
  createAnnualVerification,
  createChecklistRecord,
  createCleaningRecord,
  createEquipmentAsset,
  createFryerOilRecord,
  createGoodsReceptionRecord,
  createIncidentRecord,
  createInspectionRecord,
  createMaintenanceRecord,
  createMonthlySignature,
  createTemperatureRecord,
  createWaterRecord,
  getAppccRecords,
  getEquipmentAlertsByMonth,
  getLatestChecklistByType,
  getLatestMonthlySignature,
  getMonthlyAppccReport,
  getMonthlySignature,
  getOpenEquipmentAlerts,
  getRecentAnnualVerificationRecords,
  getRecentChecklistRecords,
  getRecentCleaningRecords,
  getRecentEquipmentAssets,
  getRecentFryerOilRecords,
  getRecentGoodsReceptionRecords,
  getRecentIncidentRecords,
  getRecentInspectionRecords,
  getRecentMaintenanceRecords,
  getRecentTemperatureRecords,
  getRecentWaterRecords,
  getTemperatureRecordsByMonth,
  updateEquipmentAlertStatus,
} from "./legacy-core";
