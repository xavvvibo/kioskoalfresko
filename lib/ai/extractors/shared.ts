import "server-only";

import { createOpenAiResponseJson } from "../openai";
import { appccOcrSystemPrompt } from "../prompts";
import type { AiResult, OcrUploadInput } from "../types";

export async function runExtractor<T>({
  input,
  prompt,
}: {
  input: OcrUploadInput;
  prompt: string;
}): Promise<AiResult<T>> {
  const response = await createOpenAiResponseJson<T>({
    systemPrompt: appccOcrSystemPrompt,
    userPrompt: [`Archivo: ${input.filename}`, `Tipo MIME: ${input.mimeType}`, prompt].join("\n"),
    mimeType: input.mimeType,
    base64: input.base64,
  });

  return { ok: true, data: response };
}
