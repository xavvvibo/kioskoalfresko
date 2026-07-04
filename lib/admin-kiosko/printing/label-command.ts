import {
  generateGodexTraceabilityEzpl,
  type GodexLabelTemplate,
  type GodexTraceabilityLabelInput,
} from "./godex-ezpl";

export type LabelCommandPayload = {
  nombre_producto?: string;
  lote?: string;
  fecha_elaboracion?: string;
  fecha_caducidad?: string;
  alergenos?: string[] | string;
  codigo_barras?: string;
  cantidad?: string | number;
  responsable?: string;
  proveedor?: string;
  tipo?: string;
  copies?: number;
};

export type LabelCommandInput = {
  printerLanguage?: "ezpl" | "zpl";
  labelType?: string;
  payload: LabelCommandPayload;
};

function parseAllergens(value: LabelCommandPayload["alergenos"]) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeTemplate(value?: string): GodexLabelTemplate {
  if (value === "produccion" || value === "trazabilidad" || value === "congelacion" || value === "descongelacion" || value === "recepcion") {
    return value;
  }
  return "trazabilidad";
}

export function generateGodexLabel(payload: LabelCommandPayload) {
  const input: GodexTraceabilityLabelInput = {
    template: normalizeTemplate(payload.tipo),
    product: payload.nombre_producto || "Producto",
    batch: payload.lote || "-",
    supplier: payload.proveedor,
    productionDate: payload.fecha_elaboracion,
    expiryDate: payload.fecha_caducidad,
    responsible: payload.responsable || "Kiosko Alfresko",
    traceabilityCode: payload.codigo_barras || payload.lote || payload.nombre_producto || "kiosko-alfresko",
    allergens: parseAllergens(payload.alergenos),
    sanitaryText: payload.cantidad ? `Cantidad: ${payload.cantidad}` : "APPCC interno - cocina/inventario",
    copies: payload.copies,
  };

  return generateGodexTraceabilityEzpl(input);
}

export function generateLabelCommand(input: LabelCommandInput) {
  const language = input.printerLanguage || "ezpl";
  if (language !== "ezpl") {
    throw new Error(`Lenguaje de impresora no soportado todavía: ${language}`);
  }

  return {
    printerLanguage: language,
    command: generateGodexLabel(input.payload),
  };
}
