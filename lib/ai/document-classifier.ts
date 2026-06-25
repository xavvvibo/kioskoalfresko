import "server-only";

import { createOpenAiResponseJson, createOpenAiTextResponseJson, getOpenAiServerConfig } from "./openai";
import { appccDocumentClassifierSystemPrompt, buildDocumentClassifierPrompt, documentClassificationPrompt } from "./prompts";
import type { AiDocumentClassification, AiDocumentInput, AiResult } from "./types";

function classifyByName(input: AiDocumentInput): AiDocumentClassification {
  const name = `${input.filename || ""} ${input.text || ""}`.toLowerCase();
  const kind = name.includes("manipulador")
    ? "certificado_manipulador"
    : name.includes("ddd") || name.includes("desinsect") || name.includes("desrat")
      ? "certificado_ddd"
      : name.includes("memoria")
        ? "memoria_sanitaria"
        : name.includes("appcc")
          ? "appcc"
          : name.includes("factura")
            ? "factura"
            : name.includes("albar")
              ? "albaran"
              : name.includes("mantenimiento")
                ? "mantenimiento"
                : name.includes("inspecci")
                  ? "inspeccion"
                  : "otro";

  return {
    kind,
    confidence: 0,
    summary: "Clasificación documental preparada para conexión IA.",
  };
}

export async function classifyDocument(input: AiDocumentInput & { base64?: string }): Promise<AiResult<AiDocumentClassification>> {
  const config = getOpenAiServerConfig();

  if (!config) {
    return { ok: true, data: classifyByName(input) };
  }

  if (input.text) {
    const response = await createOpenAiTextResponseJson<AiDocumentClassification>({
      systemPrompt: appccDocumentClassifierSystemPrompt,
      userPrompt: [documentClassificationPrompt, buildDocumentClassifierPrompt(input)].join("\n\n"),
    });

    return { ok: true, data: response };
  }

  if (!input.base64 || !input.mimeType) {
    return { ok: true, data: classifyByName(input) };
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
