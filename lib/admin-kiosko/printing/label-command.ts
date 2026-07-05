import {
  generateGodexTraceabilityEzpl,
  type GodexLabelTemplate,
  type GodexTraceabilityLabelInput,
} from "./godex-ezpl";
import { formatLabelDateTime, parseDateTimeInput, sanitizeLabelText } from "./print-payload";

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
  title?: string;
  line1?: string;
  line2?: string;
  template?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
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

function payloadRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function payloadText(value: unknown, maxLength = 48) {
  return sanitizeLabelText(value, maxLength);
}

function payloadNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function textCommand(x: number, y: number, value: string, options?: { width?: number; height?: number; max?: number }) {
  const width = options?.width ?? 1;
  const height = options?.height ?? 1;
  return `AA,${x},${y},1,${width},${height},0,0,${payloadText(value, options?.max ?? 42)}`;
}

function lineCommand(x1: number, y1: number, x2: number, y2: number, thickness = 2) {
  return `Lo,${x1},${y1},${x2},${y2},${thickness}`;
}

function qrCommand(x: number, y: number, value: string) {
  return `BQ,${x},${y},2,3,72,0,0,${payloadText(value, 240)}`;
}

function booleanFromPayload(value: unknown) {
  return value === true || value === "true" || value === "1" || value === "on";
}

function generatePrepProfessionalEzpl(payload: LabelCommandPayload) {
  const data = payloadRecord(payload.data);
  const includeQr = booleanFromPayload(data.includeQr);
  const qrValue = payloadText(data.qrUrl || data.qrValue || "", 240);
  const canPrintQr = includeQr && Boolean(qrValue);
  const prepName = payloadText(data.prepName || payload.title || payload.nombre_producto || "PREPARACION", canPrintQr ? 16 : 28);
  const productionDateTime = parseDateTimeInput(data.productionDateTime) || parseDateTimeInput(data.productionDate) || new Date();
  const shelfLifeDays = payloadNumber(data.shelfLifeDays);
  const expiryDateTime = parseDateTimeInput(data.expiryDateTime)
    || parseDateTimeInput(data.expiryDate)
    || (shelfLifeDays !== undefined ? addDays(productionDateTime, shelfLifeDays) : null);
  const batchCode = payloadText(data.batchCode || payload.lote || "-", 24);
  const responsibleName = payloadText(data.responsibleName || payload.responsable || "J. Bocanegra", 24);
  const storageCondition = payloadText(data.storageCondition || "Refrigerado 0-4 C", 30);
  const brandName = payloadText(data.brandName || "KIOSKO ALFRESKO", 28);
  const elaboration = `ELAB ${formatLabelDateTime(productionDateTime) || payloadText(payload.line1, 24).replace(/^ELAB\s*/i, "")}`;
  const expiry = `CAD  ${expiryDateTime ? formatLabelDateTime(expiryDateTime) : payloadText(payload.line2, 24).replace(/^CAD\s*/i, "")}`;

  if (canPrintQr) {
    return [
      "^Q50,3",
      "^W80",
      "^H10",
      "^S4",
      "^P1",
      "^C1",
      "^R0",
      "~Q+0",
      "^O0",
      "^D0",
      "^L",
      textCommand(18, 16, prepName, { width: 2, height: 2, max: 16 }),
      qrCommand(486, 14, qrValue),
      lineCommand(18, 58, 470, 58, 2),
      textCommand(18, 78, elaboration, { width: 2, height: 2, max: 24 }),
      textCommand(18, 124, expiry, { width: 2, height: 2, max: 24 }),
      lineCommand(18, 170, 620, 170, 2),
      textCommand(18, 192, "LOTE", { width: 1, height: 1, max: 8 }),
      textCommand(18, 218, batchCode, { width: 1, height: 2, max: 24 }),
      textCommand(340, 192, "RESPONSABLE", { width: 1, height: 1, max: 16 }),
      textCommand(340, 218, responsibleName, { width: 1, height: 1, max: 22 }),
      lineCommand(18, 264, 620, 264, 2),
      textCommand(18, 286, "CONSERVACION", { width: 1, height: 1, max: 18 }),
      textCommand(18, 314, storageCondition, { width: 1, height: 1, max: 30 }),
      textCommand(18, 360, brandName, { width: 2, height: 1, max: 24 }),
      "E",
    ].join("\n");
  }

  return [
    "^Q50,3",
    "^W80",
    "^H10",
    "^S4",
    "^P1",
    "^C1",
    "^R0",
    "~Q+0",
    "^O0",
    "^D0",
    "^L",
    textCommand(18, 16, prepName, { width: 2, height: 2, max: 20 }),
    lineCommand(18, 58, 620, 58, 2),
    textCommand(18, 78, elaboration, { width: 2, height: 2, max: 24 }),
    textCommand(18, 124, expiry, { width: 2, height: 2, max: 24 }),
    lineCommand(18, 170, 620, 170, 2),
    textCommand(18, 192, "LOTE", { width: 1, height: 1, max: 8 }),
    textCommand(18, 218, batchCode, { width: 1, height: 2, max: 24 }),
    textCommand(340, 192, "RESPONSABLE", { width: 1, height: 1, max: 16 }),
    textCommand(340, 218, responsibleName, { width: 1, height: 2, max: 22 }),
    lineCommand(18, 264, 620, 264, 2),
    textCommand(18, 286, "CONSERVACION", { width: 1, height: 1, max: 18 }),
    textCommand(18, 314, storageCondition, { width: 1, height: 2, max: 30 }),
    textCommand(18, 360, brandName, { width: 2, height: 1, max: 24 }),
    "E",
  ].join("\n");
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
    command: input.payload.template === "prep_label_professional"
      ? generatePrepProfessionalEzpl(input.payload)
      : generateGodexLabel(input.payload),
  };
}
