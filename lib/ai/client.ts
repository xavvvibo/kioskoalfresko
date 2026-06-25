import "server-only";

export type OpenAiServerConfig = {
  apiKey: string;
  model: string;
};

export function getOpenAiServerConfig(): OpenAiServerConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  if (!apiKey) {
    return null;
  }

  return { apiKey, model };
}
