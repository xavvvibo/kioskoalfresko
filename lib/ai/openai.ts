import "server-only";

import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
} from "openai";

export type OpenAiServerConfig = {
  apiKey: string;
  model: string;
};

export class OcrProcessingError extends Error {
  stage: string;
  statusCode: number;

  constructor(message: string, stage: string, statusCode = 500) {
    super(message);
    this.name = "OcrProcessingError";
    this.stage = stage;
    this.statusCode = statusCode;
  }
}

export function getOpenAiServerConfig(): OpenAiServerConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return null;
  }

  return { apiKey, model };
}

export function getOpenAiClient() {
  const config = getOpenAiServerConfig();

  if (!config) {
    return null;
  }

  return {
    client: new OpenAI({ apiKey: config.apiKey }),
    model: config.model,
  };
}

export async function createOpenAiResponseJson<T>({
  systemPrompt,
  userPrompt,
  mimeType,
  base64,
}: {
  systemPrompt: string;
  userPrompt: string;
  mimeType: string;
  base64: string;
}): Promise<T> {
  const openai = getOpenAiClient();

  if (!openai) {
    throw new OcrProcessingError("Missing OPENAI_API_KEY", "openai_config", 500);
  }

  const dataUrl = `data:${mimeType};base64,${base64}`;
  console.info("[OCR]\nllamando a OpenAI...", { model: openai.model, mimeType });

  const response = await openai.client.responses.create(
    {
      model: openai.model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: userPrompt },
            { type: "input_image", image_url: dataUrl, detail: "auto" },
          ],
        },
      ],
      text: {
        format: { type: "json_object" },
      },
    },
    { timeout: 60_000 },
  ).catch((error: unknown) => {
    if (error instanceof AuthenticationError) {
      throw new OcrProcessingError("OpenAI Authentication Error", "openai_request", 401);
    }

    if (error instanceof APIConnectionTimeoutError) {
      throw new OcrProcessingError("Vision request timeout", "openai_request", 504);
    }

    if (error instanceof APIError) {
      const status = error.status ?? 500;
      const message = error.message || `OpenAI API Error (${status})`;
      throw new OcrProcessingError(message, "openai_request", status);
    }

    const message = error instanceof Error ? error.message : "OpenAI request failed";
    throw new OcrProcessingError(message, "openai_request", 500);
  });

  console.info("[OCR]\nrespuesta recibida", { id: response.id, model: response.model });

  const outputText = response.output_text;

  if (!outputText) {
    throw new OcrProcessingError("OpenAI response did not include output_text", "openai_response", 502);
  }

  try {
    return JSON.parse(outputText) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new OcrProcessingError(`JSON parse error: ${message}`, "json_parse", 502);
  }
}
