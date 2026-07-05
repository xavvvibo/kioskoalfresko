import {
  buildGodex80x50LabelEzpl,
  buildGodex80x50PrepProfessionalEzpl,
  isValidGodex80x50Ezpl,
} from "./godex-80x50-ezpl.mjs";
import { sanitizeLabelText } from "./print-payload";

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
  raw_command?: string;
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

function payloadRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function payloadText(value: unknown, maxLength = 48) {
  return sanitizeLabelText(value, maxLength);
}

export function generateGodexLabel(payload: LabelCommandPayload) {
  return buildGodex80x50LabelEzpl({
    template: payload.template || payload.tipo || "test_label",
    title: payload.title || payload.nombre_producto || "Etiqueta ERP",
    productName: payload.nombre_producto,
    line1: payload.line1 || payload.lote || payload.codigo_barras || payload.proveedor,
    line2: payload.line2 || payload.fecha_caducidad || payload.fecha_elaboracion,
    line3: payload.responsable || payload.cantidad || "KIOSKO ALFRESKO",
    line4: payload.proveedor,
  });
}

export function generateLabelCommand(input: LabelCommandInput) {
  const language = input.printerLanguage || "ezpl";
  if (language !== "ezpl") {
    throw new Error(`Lenguaje de impresora no soportado todavía: ${language}`);
  }
  const data = payloadRecord(input.payload.data);

  if (typeof input.payload.raw_command === "string" && input.payload.raw_command.trim()) {
    if (!isValidGodex80x50Ezpl(input.payload.raw_command)) {
      throw new Error("raw_command no contiene EZPL GoDEX 80x50 valido.");
    }
    return {
      printerLanguage: language,
      command: input.payload.raw_command,
    };
  }

  return {
    printerLanguage: language,
    command: input.payload.template === "prep_label_professional"
      ? buildGodex80x50PrepProfessionalEzpl({
          prepName: payloadText(data.prepName) || input.payload.title || "Preparacion",
          productionDateTime: data.productionDateTime,
          expiryDateTime: data.expiryDateTime,
          batchCode: data.batchCode,
          responsibleName: data.responsibleName,
          storageCondition: data.storageCondition,
          qrValue: data.qrValue,
          includeQr: data.includeQr,
        })
      : input.payload.template === "prep_label_basic"
        ? buildGodex80x50LabelEzpl({
            template: input.payload.template,
            title: payloadText(data.prepName) || input.payload.title || "Preparacion",
            line1: input.payload.line1 || payloadText(data.batchCode),
            line2: input.payload.line2,
            line3: "KIOSKO ALFRESKO",
          })
      : generateGodexLabel(input.payload),
  };
}
