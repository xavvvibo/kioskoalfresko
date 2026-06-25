import "server-only";

import { albaranOcrPrompt } from "../prompts";
import type { OcrAlbaranResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

export function extractAlbaran(input: OcrUploadInput) {
  return runExtractor<OcrAlbaranResult>({ input, prompt: albaranOcrPrompt });
}
