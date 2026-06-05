import { z } from "zod";

import {
  renderPromptTemplate,
  type PromptTemplateId,
} from "@/ai/prompts/prompt-template-loader";
import {
  type AIEnhancement,
  type AIEnhancementResult,
} from "@/ai/schemas/structured-output";
import { validateAIEnhancementOutput } from "@/ai/schemas/validation";
import type { EngineResult } from "@/engine/shared/engine-result";
import { assertNoBlockedSensitiveInput } from "@/lib/security/sensitiveInputScanner";

import { createOptionalLLMClient } from "./client-factory";
import type { LLMClient } from "./llm-client";

const structuredInputSchema = z.object({}).passthrough();

export type StructuredAIInput = Record<string, unknown>;

export type AIEnhancementAttempt =
  | {
      status: "enhanced";
      result: AIEnhancementResult;
    }
  | {
      status: "unavailable";
      result: null;
      error: string;
    };

export class BaseAIEnhancementService {
  constructor(
    readonly promptId: PromptTemplateId,
    readonly client: LLMClient = createOptionalLLMClient(),
  ) {}

  async enhance(inputDraft: StructuredAIInput): Promise<AIEnhancementResult> {
    const input = structuredInputSchema.parse(inputDraft);
    assertNoBlockedSensitiveInput(input);
    const renderedPrompt = renderPromptTemplate(this.promptId);
    const rawOutput = await this.client.generateStructured({
      promptId: this.promptId,
      input,
      outputSchemaName: "EngineResult<AIEnhancement>",
      ...renderedPrompt,
    });
    return validateAIEnhancementOutput(rawOutput, input, this.promptId);
  }

  async enhanceSafely(
    input: StructuredAIInput,
  ): Promise<AIEnhancementAttempt> {
    try {
      return {
        status: "enhanced",
        result: await this.enhance(input),
      };
    } catch (error) {
      return {
        status: "unavailable",
        result: null,
        error: safeErrorMessage(error),
      };
    }
  }
}

export interface OptionalAIEngineResult<T> {
  deterministicResult: EngineResult<T>;
  aiEnhancement: EngineResult<AIEnhancement> | null;
  aiStatus: AIEnhancementAttempt["status"];
  warnings: string[];
}

export async function enhanceEngineResultSafely<T>(
  deterministicResult: EngineResult<T>,
  service: BaseAIEnhancementService,
  input: StructuredAIInput,
): Promise<OptionalAIEngineResult<T>> {
  const attempt = await service.enhanceSafely(input);
  if (attempt.status === "enhanced") {
    return {
      deterministicResult,
      aiEnhancement: attempt.result,
      aiStatus: attempt.status,
      warnings: deterministicResult.warnings,
    };
  }

  return {
    deterministicResult,
    aiEnhancement: null,
    aiStatus: attempt.status,
    warnings: [
      ...deterministicResult.warnings,
      `Optional AI enhancement was skipped: ${attempt.error}`,
    ],
  };
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The optional AI enhancement failed safely.";
}
