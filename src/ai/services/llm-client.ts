export interface StructuredGenerationRequest {
  promptId: string;
  systemPrompt: string;
  userPrompt: string;
  input: unknown;
  outputSchemaName: string;
}

export interface LLMClient {
  readonly id: string;
  readonly configured: boolean;
  generateStructured(request: StructuredGenerationRequest): Promise<unknown>;
}

export class DisabledLLMClient implements LLMClient {
  readonly id = "disabled-llm";
  readonly configured = false;

  async generateStructured(): Promise<never> {
    throw new Error(
      "Optional LLM assistance is not configured. Deterministic engine modules remain available.",
    );
  }
}
