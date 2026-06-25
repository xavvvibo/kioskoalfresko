import "server-only";

import { certificadoOcrPrompt } from "../prompts";
import type { OcrCertificadoResult, OcrUploadInput } from "../types";
import { runExtractor } from "./shared";

const fallback: OcrCertificadoResult = {
  tipo_detectado: "otro",
  titular: "",
  entidad: "",
  fecha: "",
  caducidad: "",
  observaciones: "",
};

export function extractCertificado(input: OcrUploadInput) {
  return runExtractor({ input, prompt: certificadoOcrPrompt, fallback });
}
