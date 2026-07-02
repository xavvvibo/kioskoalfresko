/**
 * Fachada legacy temporal de datos del ERP APPCC.
 *
 * Las rutas y server actions existentes deben seguir importando desde este
 * archivo durante la migracion. Los nuevos repositorios en
 * `lib/admin-kiosko/repositories` son la fuente futura por dominio.
 */
export type * from "./repositories/legacy-core";

export * from "./repositories/accounting.repository";
export * from "./repositories/appcc.repository";
export * from "./repositories/dashboard.repository";
export * from "./repositories/documents.repository";
export * from "./repositories/events.repository";
export * from "./repositories/inventory.repository";
export * from "./repositories/inbox.repository";
export * from "./repositories/labels.repository";
export * from "./repositories/ocr.repository";
export * from "./repositories/production.repository";
export * from "./repositories/purchases.repository";
export * from "./repositories/settings.repository";
export * from "./repositories/suppliers.repository";
export * from "./repositories/traceability.repository";
