import "server-only";

import { facturaOcrPrompt } from "../prompts";
import type { OcrFacturaResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

export function extractFactura(input: OcrUploadInput) {
  return runExtractor<OcrFacturaResult>({ input, prompt: facturaOcrPrompt });
}
