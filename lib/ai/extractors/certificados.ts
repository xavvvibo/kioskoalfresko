import "server-only";

import { certificadoOcrPrompt } from "../prompts";
import type { OcrCertificadoResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

export function extractCertificado(input: OcrUploadInput) {
  return runExtractor<OcrCertificadoResult>({ input, prompt: certificadoOcrPrompt });
}
