import type { AiDocumentInput } from "./types";

export const appccDocumentClassifierSystemPrompt = [
  "Eres un asistente interno APPCC de KIOSKO ALFRESKO.",
  "Clasifica documentos sanitarios, albaranes, facturas, etiquetas, lecturas de termómetro y control de aceite.",
  "Devuelve siempre datos estructurados, sin inventar campos no presentes.",
].join("\n");

export function buildDocumentClassifierPrompt(input: AiDocumentInput) {
  return [
    `Archivo: ${input.filename || "sin nombre"}`,
    `Tipo MIME: ${input.mimeType || "desconocido"}`,
    "Texto extraído:",
    input.text?.trim() || "Sin texto extraído todavía.",
  ].join("\n");
}
