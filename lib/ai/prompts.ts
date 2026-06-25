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
  "Extrae solo información visible en la imagen o en el texto OCR aportado.",
  "Si se aportan varias páginas, consolida la información sin duplicar líneas repetidas.",
  "Conserva lotes, caducidades, temperaturas, importes, CIF y números de documento tal como aparecen.",
  "Devuelve únicamente JSON válido, sin markdown ni explicaciones.",
].join("\n");

export const appccPageOcrSystemPrompt = [
  "Eres un motor OCR APPCC.",
  "Lee la imagen de una página documental y transcribe el texto relevante con fidelidad.",
  "Prioriza proveedor, CIF/NIF, fechas, números de documento, productos, lotes, caducidades, temperaturas e importes.",
  "Devuelve únicamente JSON válido.",
].join("\n");

export function pageOcrPrompt(pageNumber: number, totalPages: number) {
  return [
    `Página ${pageNumber} de ${totalPages}.`,
    "Devuelve JSON con esta forma exacta:",
    '{"pageNumber":1,"totalPages":1,"text":""}',
    "Rellena pageNumber y totalPages con los valores reales.",
    "En text incluye el texto legible y separa líneas con saltos de línea.",
  ].join("\n");
}

export function buildTextExtractionPrompt(text: string) {
  return [
    "Texto OCR combinado:",
    text.trim() || "Sin texto OCR.",
    "Extrae los datos APPCC desde este texto combinado.",
  ].join("\n");
}

export const documentClassificationPrompt = [
  "Identifica automáticamente el tipo documental.",
  "Tipos permitidos: certificado_manipulador, certificado_ddd, memoria_sanitaria, appcc, factura, albaran, mantenimiento, inspeccion, otro.",
  "Devuelve JSON con: kind, confidence, summary, suggestedRoute.",
].join("\n");

export const albaranOcrPrompt = [
  "OCR Albarán.",
  "Reconoce proveedor, CIF si aparece, fecha, número, productos, lotes, temperaturas, caducidades y observaciones.",
  "Devuelve exactamente este JSON:",
  '{"proveedor":"","cif":"","fecha":"","numero":"","productos":[{"nombre":"","cantidad":"","lote":"","caducidad":""}],"temperaturas":[],"observaciones":""}',
  "Incluye todas las temperaturas visibles como texto en temperaturas.",
].join("\n");

export const facturaOcrPrompt = [
  "OCR Factura.",
  "Reconoce proveedor, CIF, fecha, número de factura, productos e importes.",
  "Devuelve exactamente este JSON:",
  '{"proveedor":"","cif":"","fecha":"","numero":"","productos":[{"nombre":"","cantidad":"","lote":"","caducidad":"","importe":""}],"base_imponible":"","iva":"","total":""}',
].join("\n");

export const etiquetaOcrPrompt = [
  "OCR Etiqueta de lote.",
  "Reconoce lote, fecha de fabricación y fecha de caducidad.",
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
