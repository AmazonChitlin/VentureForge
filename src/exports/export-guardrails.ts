import type { EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import { MOCK_DATA_WARNING } from "@/engine/shared/guardrails";

export const VISIBLE_MOCK_DATA_WARNING =
  MOCK_DATA_WARNING;

export function exportWarnings(
  result: Pick<EngineResult<unknown>, "warnings" | "sources">,
  additionalSources: SourceReference[] = [],
): string[] {
  return unique([
    ...([...result.sources, ...additionalSources].some(
      (source) => source.sourceType === "mock",
    )
      ? [VISIBLE_MOCK_DATA_WARNING]
      : []),
    ...result.warnings,
  ]);
}

export function sourceLabel(source: SourceReference): string {
  const location = source.url ? ` (${source.url})` : "";
  return `${source.title} - ${source.sourceName} [${source.sourceType}]${location}`;
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
