import {
  AIEnhancementResultSchema,
  type AIEnhancementResult,
} from "./structured-output";
import { parseStructuredOutput } from "./structured-output-parser";
import {
  sourceReferenceSchema,
  type SourceReference,
} from "@/engine/shared/source-reference";

const unsupportedClaimPattern =
  /\b(best in town|best ever|number one|#1|guarantee(?:d|s|ing)?|100% certain|officially approved|funding is assured|funding is guaranteed|will qualify for funding|approval is certain|proven results?)\b/i;

export function validateAIEnhancementOutput(
  rawOutput: unknown,
  input: unknown,
  promptId: string,
): AIEnhancementResult {
  const parsed = parseStructuredOutput(rawOutput, AIEnhancementResultSchema);
  assertNoUnsupportedClaims(parsed.data);
  assertSourcesAreKnown(parsed.sources, input);

  return AIEnhancementResultSchema.parse({
    ...parsed,
    assumptions: unique([
      ...parsed.assumptions,
      "AI-generated text is an optional planning enhancement and does not replace deterministic engine output or verified evidence.",
    ]),
    warnings: unique([
      ...parsed.warnings,
      "Review AI-generated text before use. Do not treat it as legal, tax, accounting, lending, compliance, or market-data advice.",
    ]),
    sources: uniqueSources([
      ...parsed.sources,
      {
        id: `ai-enhancement:${promptId}`,
        title: "Optional AI-generated planning enhancement",
        sourceName: "VentureForge AI service layer",
        sourceType: "ai_generated",
        notes:
          "Generated from structured engine input. It is not an official source or verified claim.",
      },
    ]),
  });
}

function assertNoUnsupportedClaims(
  data: AIEnhancementResult["data"],
): void {
  const text = collectStrings(data).join("\n");
  if (unsupportedClaimPattern.test(text)) {
    throw new Error(
      "LLM output contained unsupported superiority, approval, certainty, or funding language.",
    );
  }
}

function assertSourcesAreKnown(
  sources: SourceReference[],
  input: unknown,
): void {
  const inputSources = new Set(
    collectSourceReferences(input).map(sourceIdentity),
  );
  for (const source of sources) {
    if (
      source.sourceType !== "ai_generated" &&
      !inputSources.has(sourceIdentity(source))
    ) {
      throw new Error(
        `LLM output cited a source that was not present in structured input: ${source.title}.`,
      );
    }
  }
}

function collectSourceReferences(
  value: unknown,
  found: SourceReference[] = [],
): SourceReference[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSourceReferences(item, found));
    return found;
  }
  if (!value || typeof value !== "object") return found;

  const parsed = sourceReferenceSchema.safeParse(value);
  if (parsed.success) {
    found.push(parsed.data);
    return found;
  }

  Object.values(value).forEach((item) => collectSourceReferences(item, found));
  return found;
}

function collectStrings(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, found));
    return found;
  }
  if (!value || typeof value !== "object") return found;
  Object.values(value).forEach((item) => collectStrings(item, found));
  return found;
}

function uniqueSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const identity = sourceIdentity(source);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function sourceIdentity(source: SourceReference): string {
  return `${source.id}:${source.url ?? ""}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
