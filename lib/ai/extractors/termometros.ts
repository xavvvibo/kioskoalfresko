import "server-only";

import { termometroOcrPrompt } from "../prompts";
import type { OcrTermometroResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

const fallback: OcrTermometroResult = {
  temperatura: null,
  equipo: "",
};

export function extractTermometro(input: OcrUploadInput) {
  return runExtractor({ input, prompt: termometroOcrPrompt, fallback });
}
