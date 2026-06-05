import { z } from "zod";

import type {
  LLMClient,
  StructuredGenerationRequest,
} from "./llm-client";

export interface OpenAICompatibleLLMClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImplementation?: typeof fetch;
}

const chatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1),
        }),
      }),
    )
    .min(1),
});

export class OpenAICompatibleLLMClient implements LLMClient {
  readonly id = "openai-compatible-llm";
  readonly configured: boolean;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: OpenAICompatibleLLMClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.configured = Boolean(this.baseUrl && this.apiKey && this.model);
  }

  async generateStructured(
    request: StructuredGenerationRequest,
  ): Promise<unknown> {
    if (!this.configured) {
      throw new Error(
        "OpenAI-compatible LLM configuration is incomplete. Deterministic engine modules remain available.",
      );
    }

    const response = await this.fetchImplementation(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: request.systemPrompt },
            {
              role: "user",
              content: [
                request.userPrompt,
                `Output schema: ${request.outputSchemaName}`,
                "Structured input:",
                JSON.stringify(request.input, null, 2),
              ].join("\n\n"),
            },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `OpenAI-compatible LLM request failed with status ${response.status}.`,
      );
    }

    const payload = chatCompletionResponseSchema.parse(await response.json());
    return payload.choices[0]?.message.content;
  }
}
