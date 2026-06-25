import "server-only";

import { createOpenAiResponseJson, createOpenAiTextResponseJson, getOpenAiServerConfig, OcrProcessingError } from "./openai";
import { appccDocumentClassifierSystemPrompt, buildDocumentClassifierPrompt, documentClassificationPrompt } from "./prompts";
import type { AiDocumentClassification, AiDocumentInput, AiResult } from "./types";

export async function classifyDocument(input: AiDocumentInput & { base64?: string }): Promise<AiResult<AiDocumentClassification>> {
  const config = getOpenAiServerConfig();

  if (!config) {
    throw new OcrProcessingError("Missing OPENAI_API_KEY", "openai_config", 500);
  }

  if (input.text) {
    const response = await createOpenAiTextResponseJson<AiDocumentClassification>({
      systemPrompt: appccDocumentClassifierSystemPrompt,
      userPrompt: [documentClassificationPrompt, buildDocumentClassifierPrompt(input)].join("\n\n"),
    });

    return { ok: true, data: response };
  }

  if (!input.base64 || !input.mimeType) {
    throw new OcrProcessingError("No OCR input available", "ocr_extraction", 400);
  }

  const response = await createOpenAiResponseJson<AiDocumentClassification>({
    systemPrompt: appccDocumentClassifierSystemPrompt,
    userPrompt: [documentClassificationPrompt, buildDocumentClassifierPrompt(input)].join("\n\n"),
    mimeType: input.mimeType,
    base64: input.base64,
  });

  return {
    ok: true,
    data: response,
  };
}

export const classifyDocumentPlaceholder = classifyDocument;
