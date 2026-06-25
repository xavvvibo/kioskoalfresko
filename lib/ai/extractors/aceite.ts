import "server-only";

import { aceiteOcrPrompt } from "../prompts";
import type { OcrAceiteResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

export function extractAceite(input: OcrUploadInput) {
  return runExtractor<OcrAceiteResult>({ input, prompt: aceiteOcrPrompt });
}
