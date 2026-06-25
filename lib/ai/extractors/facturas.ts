import "server-only";

import { facturaOcrPrompt } from "../prompts";
import type { OcrFacturaResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

const fallback: OcrFacturaResult = {
  proveedor: "",
  fecha: "",
  importe: "",
  productos: [],
};

export function extractFactura(input: OcrUploadInput) {
  return runExtractor({ input, prompt: facturaOcrPrompt, fallback });
}
