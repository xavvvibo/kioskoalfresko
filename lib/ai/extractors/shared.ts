import "server-only";

import { createOpenAiResponseJson } from "../openai";
import { appccOcrSystemPrompt } from "../prompts";
import type { AiResult, OcrUploadInput } from "../types";

export async function runExtractor<T>({
  input,
  prompt,
  fallback,
}: {
  input: OcrUploadInput;
  prompt: string;
  fallback: T;
}): Promise<AiResult<T>> {
  const response = await createOpenAiResponseJson<T>({
    systemPrompt: appccOcrSystemPrompt,
    userPrompt: [`Archivo: ${input.filename}`, `Tipo MIME: ${input.mimeType}`, prompt].join("\n"),
    mimeType: input.mimeType,
    base64: input.base64,
  });

  if (!response) {
    return {
      ok: false,
      error: "OPENAI_API_KEY no está configurada. Flujo OCR preparado sin extracción real.",
      data: fallback,
    };
  }

  return { ok: true, data: response };
}
