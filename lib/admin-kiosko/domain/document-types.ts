export const DOCUMENT_TYPES = [
  "purchase_invoice",
  "purchase_delivery_note",
  "receipt",
  "supplier_traceability_label",
  "traceability_label",
  "technical_sheet",
  "sanitary_document",
  "appcc_document",
  "maintenance_document",
  "supplier_contract",
  "training_document",
  "accounting_document",
  "credit_note",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  purchase_invoice: "Factura compra",
  purchase_delivery_note: "Albarán compra",
  receipt: "Ticket",
  supplier_traceability_label: "Etiqueta proveedor",
  traceability_label: "Etiqueta trazabilidad",
  technical_sheet: "Ficha técnica",
  sanitary_document: "Documento sanitario",
  appcc_document: "APPCC",
  maintenance_document: "Mantenimiento",
  supplier_contract: "Contrato proveedor",
  training_document: "Formación",
  accounting_document: "Documento contable",
  credit_note: "Rectificativa",
  other: "Otro",
};

export const DOCUMENT_TYPE_ALIASES: Record<string, DocumentType> = {
  factura: "purchase_invoice",
  invoice: "purchase_invoice",
  purchase_invoice: "purchase_invoice",
  rectificativa: "credit_note",
  abono: "credit_note",
  credit_note: "credit_note",
  albaran: "purchase_delivery_note",
  "albarán": "purchase_delivery_note",
  delivery_note: "purchase_delivery_note",
  purchase_delivery_note: "purchase_delivery_note",
  recibo: "receipt",
  ticket: "receipt",
  receipt: "receipt",
  etiqueta: "supplier_traceability_label",
  etiqueta_lote: "supplier_traceability_label",
  supplier_traceability_label: "supplier_traceability_label",
  etiqueta_trazabilidad: "traceability_label",
  traceability_label: "traceability_label",
  certificado: "sanitary_document",
  certificado_ddd: "sanitary_document",
  boletin_sanitario: "sanitary_document",
  "boletín_sanitario": "sanitary_document",
  analisis_agua: "sanitary_document",
  "análisis_agua": "sanitary_document",
  sanitary_document: "sanitary_document",
  ficha_tecnica: "technical_sheet",
  "ficha_técnica": "technical_sheet",
  technical_sheet: "technical_sheet",
  contrato: "supplier_contract",
  contrato_ddd: "supplier_contract",
  supplier_contract: "supplier_contract",
  mantenimiento: "maintenance_document",
  maintenance_document: "maintenance_document",
  formacion: "training_document",
  "formación": "training_document",
  certificado_manipulador: "training_document",
  training_document: "training_document",
  appcc: "appcc_document",
  haccp: "appcc_document",
  memoria_sanitaria: "appcc_document",
  appcc_document: "appcc_document",
  accounting_document: "accounting_document",
  contabilidad: "accounting_document",
  otro: "other",
  other: "other",
};

export function isDocumentType(value?: string | null): value is DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType);
}

export function normalizeDocumentType(value?: string | null): DocumentType {
  if (!value) return "other";
  const normalized = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return DOCUMENT_TYPE_ALIASES[value] || DOCUMENT_TYPE_ALIASES[value.trim()] || DOCUMENT_TYPE_ALIASES[normalized] || "other";
}

export function documentTypeRoute(type?: string | null) {
  const normalized = normalizeDocumentType(type);

  if (normalized === "purchase_invoice" || normalized === "credit_note" || normalized === "accounting_document" || normalized === "receipt") return "/admin-kiosko/contabilidad";
  if (normalized === "purchase_delivery_note") return "/admin-kiosko/compras";
  if (normalized === "supplier_traceability_label" || normalized === "traceability_label") return "/admin-kiosko/trazabilidad";
  if (normalized === "maintenance_document") return "/admin-kiosko/mantenimiento";
  if (normalized === "training_document" || normalized === "sanitary_document" || normalized === "technical_sheet" || normalized === "supplier_contract" || normalized === "appcc_document") {
    return "/admin-kiosko/documentacion";
  }

  return "/admin-kiosko/compras";
}
