import "server-only";

import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
} from "openai";
import type { OcrPageInput } from "./types";

export type OpenAiServerConfig = {
  apiKey: string;
  model: string;
};

export class OcrProcessingError extends Error {
  stage: string;
  statusCode: number;
  rawOpenAIText?: string;

  constructor(message: string, stage: string, statusCode = 500, rawOpenAIText?: string) {
    super(message);
    this.name = "OcrProcessingError";
    this.stage = stage;
    this.statusCode = statusCode;
    this.rawOpenAIText = rawOpenAIText;
  }
}

export type OpenAiJsonResult<T> = {
  data: T;
  rawText: string;
};

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

function mapOpenAiError(error: unknown): never {
  if (error instanceof APIError) {
    const status = error.status ?? 500;
    const details = error as APIError & {
      code?: string | null;
      type?: string | null;
    };
    const message = error.message || `OpenAI API Error (${status})`;

    console.error("[OCR ERROR]", {
      status,
      code: details.code || null,
      type: details.type || null,
      message,
    });

    throw new OcrProcessingError(message, "openai_request", status);
  }

  if (error instanceof AuthenticationError) {
    throw new OcrProcessingError("OpenAI Authentication Error", "openai_request", 401);
  }

  if (error instanceof APIConnectionTimeoutError) {
    throw new OcrProcessingError("Vision request timeout", "openai_request", 504);
  }

  const message = error instanceof Error ? error.message : "OpenAI request failed";
  console.error("[OCR ERROR]", {
    status: null,
    code: null,
    type: error instanceof Error ? error.name : null,
    message,
  });
  throw new OcrProcessingError(message, "openai_request", 500);
}

function getFinishReason(response: { output?: unknown }) {
  const output = Array.isArray(response.output) ? response.output : [];
  const message = output.find((item): item is Record<string, unknown> => typeof item === "object" && item !== null && "status" in item);
  const status = message?.status;

  return typeof status === "string" ? status : null;
}

async function parseOpenAiJson<T>(outputText: string | undefined): Promise<OpenAiJsonResult<T>> {
  if (!outputText) {
    throw new OcrProcessingError("OpenAI response did not include output_text", "openai_response", 502);
  }

  try {
    return {
      data: JSON.parse(outputText) as T,
      rawText: outputText,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    console.error("[OCR PARSE ERROR]", {
      message,
      rawOpenAIText: outputText,
    });
    throw new OcrProcessingError(`JSON parse error: ${message}`, "json_parse", 502, outputText);
  }
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
}): Promise<OpenAiJsonResult<T>> {
  const openai = getOpenAiClient();

  if (!openai) {
    throw new OcrProcessingError("Missing OPENAI_API_KEY", "openai_config", 500);
  }

  const dataUrl = `data:${mimeType};base64,${base64}`;
  console.info("[OCR OPENAI] calling model", { model: openai.model, mimeType });

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
  ).catch(mapOpenAiError);

  console.info("[OCR OPENAI RESPONSE]", {
    id: response.id,
    model: response.model,
    output_text: response.output_text?.slice(0, 300) || null,
    finish_reason: getFinishReason(response),
    usage: response.usage || null,
  });

  return parseOpenAiJson<T>(response.output_text);
}

export async function createOpenAiTextResponseJson<T>({
  systemPrompt,
  userPrompt,
}: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<OpenAiJsonResult<T>> {
  const openai = getOpenAiClient();

  if (!openai) {
    throw new OcrProcessingError("Missing OPENAI_API_KEY", "openai_config", 500);
  }

  console.info("[OCR OPENAI] calling model", { model: openai.model, mimeType: "text/plain" });

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
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: { type: "json_object" },
      },
    },
    { timeout: 60_000 },
  ).catch(mapOpenAiError);

  console.info("[OCR OPENAI RESPONSE]", {
    id: response.id,
    model: response.model,
    output_text: response.output_text?.slice(0, 300) || null,
    finish_reason: getFinishReason(response),
    usage: response.usage || null,
  });

  return parseOpenAiJson<T>(response.output_text);
}

export async function createOpenAiPageResponseJson<T>({
  systemPrompt,
  userPrompt,
  page,
}: {
  systemPrompt: string;
  userPrompt: string;
  page: OcrPageInput;
}): Promise<OpenAiJsonResult<T>> {
  return createOpenAiResponseJson<T>({
    systemPrompt,
    userPrompt,
    mimeType: page.mimeType,
    base64: page.base64,
  });
}

export function assertSupportedVisionMimeType(mimeType: string) {
  if (mimeType === "application/pdf") {
    throw new OcrProcessingError("unsupported MIME type application/pdf", "file_validation", 400);
  }
}
