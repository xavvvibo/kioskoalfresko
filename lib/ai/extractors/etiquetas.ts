import "server-only";

import { etiquetaOcrPrompt } from "../prompts";
import type { OcrEtiquetaResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

export function extractEtiqueta(input: OcrUploadInput) {
  return runExtractor<OcrEtiquetaResult>({ input, prompt: etiquetaOcrPrompt });
}
