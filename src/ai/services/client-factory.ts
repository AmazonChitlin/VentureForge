import { DisabledLLMClient, type LLMClient } from "./llm-client";
import { OpenAICompatibleLLMClient } from "./openai-compatible-llm-client";

export interface OptionalLLMEnvironment {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_COMPATIBLE_BASE_URL?: string;
  OPENAI_COMPATIBLE_API_KEY?: string;
  OPENAI_COMPATIBLE_MODEL?: string;
}

export function createOptionalLLMClient(
  environment: OptionalLLMEnvironment = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_COMPATIBLE_BASE_URL: process.env.OPENAI_COMPATIBLE_BASE_URL,
    OPENAI_COMPATIBLE_API_KEY: process.env.OPENAI_COMPATIBLE_API_KEY,
    OPENAI_COMPATIBLE_MODEL: process.env.OPENAI_COMPATIBLE_MODEL,
  },
): LLMClient {
  const openAIKey = environment.OPENAI_API_KEY?.trim() ?? "";
  const baseUrl =
    environment.OPENAI_COMPATIBLE_BASE_URL?.trim() ||
    (openAIKey ? "https://api.openai.com/v1" : "");
  const apiKey = environment.OPENAI_COMPATIBLE_API_KEY?.trim() || openAIKey;
  const model =
    environment.OPENAI_COMPATIBLE_MODEL?.trim() ||
    environment.OPENAI_MODEL?.trim() ||
    "";

  if (!baseUrl || !apiKey || !model) {
    return new DisabledLLMClient();
  }

  return new OpenAICompatibleLLMClient({ baseUrl, apiKey, model });
}
