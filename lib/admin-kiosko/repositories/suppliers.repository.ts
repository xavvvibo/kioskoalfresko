/**
 * Suppliers repository.
 *
 * Fuente futura para el maestro de proveedores, opciones autorizadas y perfiles
 * administrativos. Actualmente delega en legacy-core sin cambiar contratos.
 */
export {
  createSupplierRecord,
  ensureSupplierRecord,
  getRecentSupplierRecords,
  getSupplierOptions,
  getSupplierProfiles,
} from "./legacy-core";
