import "server-only";

import { createOpenAiResponseJson, createOpenAiTextResponseJson, OcrProcessingError } from "../openai";
import { appccOcrSystemPrompt, buildTextExtractionPrompt } from "../prompts";
import type { AiResult, OcrUploadInput } from "../types";

export async function runExtractor<T>({
  input,
  prompt,
}: {
  input: OcrUploadInput;
  prompt: string;
}): Promise<AiResult<T>> {
  const response = input.extractedText
    ? await createOpenAiTextResponseJson<T>({
        systemPrompt: appccOcrSystemPrompt,
        userPrompt: [`Archivo: ${input.filename}`, buildTextExtractionPrompt(input.extractedText), prompt].join("\n\n"),
      })
    : input.base64
      ? await createOpenAiResponseJson<T>({
          systemPrompt: appccOcrSystemPrompt,
          userPrompt: [`Archivo: ${input.filename}`, `Tipo MIME: ${input.mimeType}`, prompt].join("\n"),
          mimeType: input.mimeType,
          base64: input.base64,
        })
      : (() => {
          throw new OcrProcessingError("No OCR input available", "ocr_extraction", 400);
        })();

  return { ok: true, data: response.data, rawOpenAIText: response.rawText };
}
