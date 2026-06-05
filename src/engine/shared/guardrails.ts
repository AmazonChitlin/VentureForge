import type { EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";

export const NO_BUSINESS_SUCCESS_GUARANTEE =
  "VentureForge provides planning support only. It does not guarantee business success, revenue, profitability, or launch outcomes.";

export const NO_FUNDING_GUARANTEE =
  "VentureForge does not guarantee funding. Final eligibility, approval, terms, and availability are determined by each lender, investor, or program administrator.";

export const NO_PROFESSIONAL_ADVICE =
  "This output is not final legal, tax, accounting, or financial advice.";

export const OFFICIAL_AGENCY_VERIFICATION =
  "Verify all state and local requirements with the applicable official agencies before filing, signing a lease, purchasing regulated equipment, or launching.";

export const CPA_BOOKKEEPER_REVIEW =
  "Review financial projections, assumptions, cash flow, and tax placeholders with a CPA or bookkeeper before making financial commitments.";

export const ATTORNEY_REVIEW =
  "Review contracts, entity choice, legal structure, and material legal questions with an attorney where needed.";

export const ESTIMATED_DATA_LABEL =
  "Treat scores, recommendations, checklists, projections, funding matches, and generated copy as estimates or drafts unless a claim is backed by a reviewed official or primary source.";

export const MOCK_DATA_WARNING =
  "WARNING: This output contains mock or sample data. Replace every mock value with verified official or primary research before relying on it for spending, filing, lending, or launch decisions.";

export const GLOBAL_GUARDRAILS = [
  NO_BUSINESS_SUCCESS_GUARANTEE,
  NO_FUNDING_GUARANTEE,
  NO_PROFESSIONAL_ADVICE,
  OFFICIAL_AGENCY_VERIFICATION,
  CPA_BOOKKEEPER_REVIEW,
  ATTORNEY_REVIEW,
  ESTIMATED_DATA_LABEL,
] as const;

export function withGlobalGuardrails<T>(
  result: EngineResult<T>,
): EngineResult<T> {
  return {
    ...result,
    warnings: unique([
      ...result.warnings,
      ...GLOBAL_GUARDRAILS,
      ...(containsMockSource(result.sources) ? [MOCK_DATA_WARNING] : []),
    ]),
  };
}

export function containsMockSource(sources: SourceReference[]): boolean {
  return sources.some((source) => source.sourceType === "mock");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
