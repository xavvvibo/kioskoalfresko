import "server-only";

import { aceiteOcrPrompt } from "../prompts";
import type { OcrAceiteResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

const fallback: OcrAceiteResult = {
  estado: "",
  compuestos_polares: "",
  correcto: false,
  revisar: false,
  incidencia: false,
  observaciones: "",
};

export function extractAceite(input: OcrUploadInput) {
  return runExtractor({ input, prompt: aceiteOcrPrompt, fallback });
}
