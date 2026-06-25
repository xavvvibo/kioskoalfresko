import type { AiDocumentInput } from "./types";

export const appccDocumentClassifierSystemPrompt = [
  "Eres un asistente interno APPCC de KIOSKO ALFRESKO.",
  "Clasifica documentos sanitarios, albaranes, facturas, etiquetas, lecturas de termómetro y control de aceite.",
  "Devuelve siempre JSON válido y no inventes campos no presentes.",
].join("\n");

export function buildDocumentClassifierPrompt(input: AiDocumentInput) {
  return [
    `Archivo: ${input.filename || "sin nombre"}`,
    `Tipo MIME: ${input.mimeType || "desconocido"}`,
    "Texto extraído:",
    input.text?.trim() || "Sin texto extraído todavía.",
  ].join("\n");
}

export const appccOcrSystemPrompt = [
  "Eres el asistente IA APPCC interno de KIOSKO ALFRESKO.",
  "Establecimiento: KIOSKO ALFRESKO.",
  "Responsable: F. Javier Bocanegra Sanjuan, DNI 75.136.778-X.",
  "Extrae solo información visible en la imagen o PDF.",
  "Devuelve únicamente JSON válido, sin markdown ni explicaciones.",
].join("\n");

export const documentClassificationPrompt = [
  "Identifica automáticamente el tipo documental.",
  "Tipos permitidos: certificado_manipulador, certificado_ddd, memoria_sanitaria, appcc, factura, albaran, mantenimiento, inspeccion, otro.",
  "Devuelve JSON con: kind, confidence, summary, suggestedRoute.",
].join("\n");

export const albaranOcrPrompt = [
  "OCR Albarán.",
  "Devuelve exactamente este JSON:",
  '{"proveedor":"","fecha":"","productos":[{"nombre":"","cantidad":"","lote":"","caducidad":""}],"temperatura":null,"observaciones":""}',
  "Usa temperatura numérica si aparece. Si no aparece, null.",
].join("\n");

export const facturaOcrPrompt = [
  "OCR Factura.",
  "Devuelve exactamente este JSON:",
  '{"proveedor":"","fecha":"","importe":"","productos":[]}',
].join("\n");

export const etiquetaOcrPrompt = [
  "OCR Etiqueta de lote.",
  "Devuelve exactamente este JSON:",
  '{"producto":"","lote":"","caducidad":"","fecha_fabricacion":""}',
].join("\n");

export const certificadoOcrPrompt = [
  "OCR Documento o certificado sanitario.",
  "Clasifica si es certificado_manipulador, certificado_ddd, memoria_sanitaria, appcc, mantenimiento, inspeccion u otro.",
  "Devuelve exactamente este JSON:",
  '{"tipo_detectado":"otro","titular":"","entidad":"","fecha":"","caducidad":"","observaciones":""}',
].join("\n");

export const termometroOcrPrompt = [
  "Lee un display digital de temperatura mediante fotografía.",
  "Equipos esperados: Arcón frío, Arcón congelador, Arcón hielo.",
  "Devuelve únicamente este JSON:",
  '{"temperatura":null,"equipo":""}',
].join("\n");

export const aceiteOcrPrompt = [
  "Lee un control visual o medición de aceite de freidora.",
  "Detecta estado, compuestos polares, correcto, revisar, incidencia y observaciones.",
  "Devuelve exactamente este JSON:",
  '{"estado":"","compuestos_polares":"","correcto":false,"revisar":false,"incidencia":false,"observaciones":""}',
].join("\n");
