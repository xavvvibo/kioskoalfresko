import "server-only";

import { termometroOcrPrompt } from "../prompts";
import type { OcrTermometroResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

export function extractTermometro(input: OcrUploadInput) {
  return runExtractor<OcrTermometroResult>({ input, prompt: termometroOcrPrompt });
}
