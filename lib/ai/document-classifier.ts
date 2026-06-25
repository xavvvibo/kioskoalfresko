import "server-only";

import { getOpenAiServerConfig } from "./client";
import type { AiDocumentClassification, AiDocumentInput, AiResult } from "./types";

export async function classifyDocumentPlaceholder(input: AiDocumentInput): Promise<AiResult<AiDocumentClassification>> {
  const config = getOpenAiServerConfig();

  if (!config) {
    return { ok: false, error: "OPENAI_API_KEY no está configurada." };
  }

  const name = `${input.filename || ""} ${input.text || ""}`.toLowerCase();
  const kind = name.includes("albar") || name.includes("factura")
    ? "albaran_factura"
    : name.includes("lote")
      ? "etiqueta_lote"
      : name.includes("temperatura") || name.includes("termometro")
        ? "termometro"
        : name.includes("aceite")
          ? "aceite"
          : "documento_sanitario";

  return {
    ok: true,
    data: {
      kind,
      confidence: 0,
      summary: "Clasificación preparada para conexión IA. No se ha llamado todavía a OpenAI.",
    },
  };
}
