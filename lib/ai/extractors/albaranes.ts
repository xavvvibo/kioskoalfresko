import "server-only";

import { albaranOcrPrompt } from "../prompts";
import type { OcrAlbaranResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

const fallback: OcrAlbaranResult = {
  proveedor: "",
  fecha: "",
  productos: [{ nombre: "", cantidad: "", lote: "", caducidad: "" }],
  temperatura: null,
  observaciones: "",
};

export function extractAlbaran(input: OcrUploadInput) {
  return runExtractor({ input, prompt: albaranOcrPrompt, fallback });
}
