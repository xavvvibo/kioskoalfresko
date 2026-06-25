import "server-only";

import { etiquetaOcrPrompt } from "../prompts";
import type { OcrEtiquetaResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

const fallback: OcrEtiquetaResult = {
  producto: "",
  lote: "",
  caducidad: "",
  fecha_fabricacion: "",
};

export function extractEtiqueta(input: OcrUploadInput) {
  return runExtractor({ input, prompt: etiquetaOcrPrompt, fallback });
}
