import {
  MarketResearchConfidenceEvidenceSchema,
  MarketResearchConfidenceScoreSchema,
  type MarketResearchConfidenceEvidence,
  type MarketResearchConfidenceScore,
} from "@/engine/market-research/schema";

export function scoreMarketResearchConfidence(
  evidenceInput: MarketResearchConfidenceEvidence,
  missingDataCount = 0,
): MarketResearchConfidenceScore {
  const evidence = MarketResearchConfidenceEvidenceSchema.parse(evidenceInput);
  const values = Object.values(evidence);
  const rawScore = Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
  const missingDataPenalty = Math.min(25, missingDataCount);
  const score = clamp(rawScore - missingDataPenalty);
  const level = score >= 75 ? "high" : score >= 45 ? "moderate" : "low";

  return MarketResearchConfidenceScoreSchema.parse({
    ...evidence,
    score,
    level,
    explanation: [
      `Market-research confidence is ${score}/100 (${level}).`,
      `The estimate reflects source quality, recency, geographic and industry specificity, sample size, primary and secondary research coverage, independent-source coverage, and consistency.`,
      missingDataCount > 0
        ? `${missingDataCount} missing-data item(s) reduced the score.`
        : "No missing-data penalty was applied.",
    ].join(" "),
  });
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
