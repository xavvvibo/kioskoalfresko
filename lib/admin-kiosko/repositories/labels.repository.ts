/**
 * Labels repository.
 *
 * Historial y origenes de etiquetas APPCC/Zebra. Mantiene contratos publicos
 * existentes delegando en legacy-core.
 */
export {
  createLabelRecord,
  getLabelRecords,
  getLabelRecordsByBatch,
  getLabelSourceOptions,
} from "./legacy-core";
