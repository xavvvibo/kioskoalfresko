import "server-only";

import OpenAI from "openai";

export type OpenAiServerConfig = {
  apiKey: string;
  model: string;
};

export function getOpenAiServerConfig(): OpenAiServerConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.5";

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
}): Promise<T | null> {
  const openai = getOpenAiClient();

  if (!openai) {
    return null;
  }

  const dataUrl = `data:${mimeType};base64,${base64}`;
  const response = await openai.client.responses.create({
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
  });

  const outputText = response.output_text;

  if (!outputText) {
    return null;
  }

  return JSON.parse(outputText) as T;
}
