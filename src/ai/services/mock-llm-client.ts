import type {
  LLMClient,
  StructuredGenerationRequest,
} from "./llm-client";

export type MockLLMResponse =
  | unknown
  | ((
      request: StructuredGenerationRequest,
    ) => unknown | Promise<unknown>);

export class MockLLMClient implements LLMClient {
  readonly id = "mock-llm";
  readonly configured = true;

  constructor(private readonly response?: MockLLMResponse) {}

  async generateStructured(
    request: StructuredGenerationRequest,
  ): Promise<unknown> {
    if (typeof this.response === "function") {
      return this.response(request);
    }
    return this.response ?? defaultResponse(request);
  }
}

function defaultResponse(request: StructuredGenerationRequest) {
  return {
    data: {
      summary: `Mock optional AI enhancement for ${request.promptId}.`,
      recommendations: [
        "Review the deterministic engine output and verify the most important assumption.",
      ],
      questionsToResolve: [
        "Which missing evidence should be collected before the next spending decision?",
      ],
      sourceNotes: [
        "This mock response is development-only AI-generated planning text.",
      ],
    },
    confidence: 45,
    assumptions: [
      "Mock AI text is not verified evidence and must not replace deterministic engine output.",
    ],
    missingInformation: [],
    warnings: [
      "Mock LLM output is for development and testing only.",
    ],
    sources: [
      {
        id: `mock-llm:${request.promptId}`,
        title: "Mock optional AI enhancement",
        sourceName: "VentureForge MockLLMClient",
        sourceType: "ai_generated",
        notes: "Development-only structured response.",
      },
    ],
    nextActions: [
      "Review this optional enhancement alongside the deterministic engine output.",
    ],
  };
}
