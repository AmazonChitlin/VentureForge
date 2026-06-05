import type { BusinessIdeaIntake, FounderIntake } from "@/engine/intake/schema";
import type { SourceReference } from "@/engine/shared/source-reference";
import { engineResultSchema, type EngineResult } from "@/engine/shared/engine-result";
import { scoreProofOfConcept } from "@/engine/feasibility/proof-of-concept-score";
import {
  FeasibilityEvaluationSchema,
  FeasibilityProjectInputSchema,
  type CompetitorAnalysis,
  type FeasibilityCategory,
  type FeasibilityCategoryScore,
  type FeasibilityEvaluation,
  type FeasibilityProjectDraftInput,
  type FeasibilityProjectInput,
  type FeasibilityRecommendation,
  type FinancialAssumptions,
  type FundingReadiness,
  type MarketResearchReport,
  type ProofOfConceptScore,
  type RegulatoryNotes,
} from "@/engine/feasibility/schema";

const founderInputSource: SourceReference = {
  id: "feasibility-founder-intake",
  title: "Founder and business idea intake",
  sourceName: "VentureForge intake",
  sourceType: "user",
  notes: "User-provided intake information has not been independently verified.",
};

const conceptSource: SourceReference = {
  id: "feasibility-business-concept",
  title: "Structured business concept",
  sourceName: "VentureForge concept engine",
  sourceType: "manual",
  notes: "Deterministic planning output derived from founder intake.",
};

const feasibilityEvidenceSource: SourceReference = {
  id: "feasibility-supporting-evidence",
  title: "Founder-recorded feasibility evidence",
  sourceName: "VentureForge feasibility engine",
  sourceType: "manual",
  notes: "Optional evidence inputs require review and independent verification.",
};

export const FeasibilityEngine = {
  evaluate(projectInput: FeasibilityProjectDraftInput): EngineResult<FeasibilityEvaluation> {
    const input = FeasibilityProjectInputSchema.parse(projectInput);
    const proof = scoreProofOfConcept(input.proofOfConcept);
    const categoryScores = scoreCategories(input, proof);
    const totalFeasibilityScore = weightedAverage(categoryScores);
    const confidence = calculateConfidence(input, proof);
    const recommendation = recommend(input, proof, totalFeasibilityScore);
    const missingInformation = buildMissingInformation(input, proof);
    const warnings = buildWarnings(input, proof);
    const researchNeeded = buildResearchNeeded(input);
    const validationSteps = buildValidationSteps(input, proof);
    const doNotSpendMoneyUntil = buildSpendingGates(input, proof);
    const criticalAssumptions = buildCriticalAssumptions(input);
    const topStrengths = summarizeCategories(categoryScores, "strength");
    const topWeaknesses = summarizeCategories(categoryScores, "weakness");
    const nextActions = unique([...validationSteps, ...researchNeeded]).slice(0, 6);

    const evaluation = FeasibilityEvaluationSchema.parse({
      totalFeasibilityScore,
      categoryScores,
      proofOfConceptScore: proof,
      recommendation,
      topStrengths,
      topWeaknesses,
      criticalAssumptions,
      researchNeeded,
      validationSteps,
      doNotSpendMoneyUntil,
      plainEnglishSummary: buildSummary(
        recommendation,
        totalFeasibilityScore,
        proof,
        topWeaknesses,
      ),
    });

    return engineResultSchema(FeasibilityEvaluationSchema).parse({
      data: evaluation,
      confidence,
      assumptions: criticalAssumptions,
      missingInformation,
      warnings,
      sources: buildSources(input),
      nextActions,
    });
  },
};

function scoreCategories(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
): FeasibilityCategoryScore[] {
  const { founder, idea } = input;
  const startupCosts = input.financialAssumptions?.startupCosts ??
    idea.expectedStartupCosts;
  const availableCapital = founder.availableStartupCapital;
  const regulatoryLevel = inferRegulatoryComplexity(input);
  const scores = [
    category(
      "customer_need",
      "Customer Need",
      scoreCustomerNeed(idea, proof),
      "Measures whether the stated customer pain is clear and supported by customer behavior.",
      compact([
        idea.customerProblem ? `Problem: ${idea.customerProblem}` : undefined,
        proof.score > 10 ? `Proof stage: ${proof.title}` : undefined,
      ]),
      compact([
        !idea.customerProblem ? "Customer problem is not defined." : undefined,
        proof.score <= 10 ? "No customer evidence is recorded." : undefined,
      ]),
    ),
    category(
      "market_demand",
      "Market Demand",
      scoreMarketDemand(input.marketResearchReport, proof),
      "Measures demand evidence from research and observed customer behavior.",
      compact([
        input.marketResearchReport?.demandScore !== undefined
          ? `Market-research demand score: ${input.marketResearchReport.demandScore}.`
          : undefined,
        ...proof.evidence,
      ]),
      compact([
        !input.marketResearchReport
          ? "Market-demand research has not been added."
          : undefined,
      ]),
    ),
    category(
      "market_size",
      "Market Size",
      input.marketResearchReport?.marketSizeScore ?? 20,
      "Measures whether a reachable market appears large enough for the initial model.",
      compact([
        input.marketResearchReport?.marketSizeScore !== undefined
          ? `Market-research size score: ${input.marketResearchReport.marketSizeScore}.`
          : undefined,
      ]),
      compact([
        input.marketResearchReport?.marketSizeScore === undefined
          ? "A market-size estimate is missing."
          : undefined,
      ]),
    ),
    category(
      "competitive_saturation",
      "Competitive Saturation",
      scoreCompetitiveSaturation(input.competitorAnalysis, idea),
      "Scores the room available for an entrant; a higher score means saturation appears more manageable.",
      compact([
        input.competitorAnalysis
          ? `Recorded saturation level: ${input.competitorAnalysis.saturationLevel}.`
          : undefined,
        idea.knownCompetitors.length > 0
          ? `${idea.knownCompetitors.length} intake competitor or substitute record(s).`
          : undefined,
      ]),
      compact([
        !input.competitorAnalysis
          ? "A structured competitor analysis is missing."
          : undefined,
      ]),
    ),
    category(
      "differentiation",
      "Differentiation",
      scoreDifferentiation(input),
      "Measures whether the proposed offer has a clear reason for customers to choose it.",
      compact([
        idea.proposedSolution
          ? `Proposed approach: ${idea.proposedSolution}`
          : undefined,
      ]),
      compact([
        !idea.proposedSolution ? "The proposed solution is missing." : undefined,
        input.competitorAnalysis?.differentiationScore === undefined
          ? "Differentiation has not been tested against competitor evidence."
          : undefined,
      ]),
    ),
    category(
      "founder_fit",
      "Founder Fit",
      scoreFounderFit(founder),
      "Measures relevant experience, skills, and available founder capacity.",
      compact([
        founder.industryExperience || founder.founderExperience || undefined,
        founder.skills.length > 0
          ? `Skills: ${founder.skills.join(", ")}.`
          : undefined,
      ]),
      compact([
        !founder.founderExperience && !founder.industryExperience
          ? "Relevant founder experience is missing."
          : undefined,
      ]),
    ),
    category(
      "startup_cost_feasibility",
      "Startup Cost Feasibility",
      scoreStartupCostFeasibility(startupCosts, availableCapital),
      "Compares estimated startup costs with available founder capital.",
      describeCapitalEvidence(startupCosts, availableCapital),
      compact([
        startupCosts <= 0 ? "Startup costs have not been estimated." : undefined,
      ]),
    ),
    category(
      "funding_feasibility",
      "Funding Feasibility",
      scoreFundingFeasibility(input),
      "Measures whether the likely funding gap has a plausible path to coverage.",
      describeFundingEvidence(input),
      compact([
        !input.fundingReadiness
          ? "A structured funding-readiness review is missing."
          : undefined,
      ]),
    ),
    category(
      "operational_complexity",
      "Operational Complexity",
      scoreOperationalComplexity(idea),
      "Scores how manageable the initial operating model appears; a higher score means lower launch complexity.",
      compact([
        idea.businessModel ? `Business model: ${idea.businessModel}.` : undefined,
        idea.requiredEquipment.length > 0
          ? `${idea.requiredEquipment.length} required equipment item(s) recorded.`
          : undefined,
      ]),
      compact([
        !idea.businessModel ? "The operating model is missing." : undefined,
      ]),
    ),
    category(
      "legal_regulatory_complexity",
      "Legal / Regulatory Complexity",
      regulatoryScore(regulatoryLevel),
      "Scores how manageable known legal and regulatory work appears; a higher score means lower complexity.",
      describeRegulatoryEvidence(input, regulatoryLevel),
      compact([
        !input.regulatoryNotes
          ? "A structured regulatory review is missing."
          : undefined,
      ]),
    ),
    category(
      "margin_potential",
      "Margin Potential",
      scoreMarginPotential(input.financialAssumptions, idea),
      "Measures whether early pricing and cost assumptions indicate room for a sustainable margin.",
      compact([
        input.financialAssumptions?.grossMarginPercent !== undefined
          ? `Gross-margin assumption: ${input.financialAssumptions.grossMarginPercent}%.`
          : undefined,
        idea.pricingIdea ? `Pricing idea: ${idea.pricingIdea}` : undefined,
      ]),
      compact([
        input.financialAssumptions?.grossMarginPercent === undefined
          ? "A traceable gross-margin assumption is missing."
          : undefined,
      ]),
    ),
    category(
      "scalability",
      "Scalability",
      scoreScalability(input),
      "Measures whether the concept has practical paths to grow beyond its first customers.",
      compact([
        idea.businessModel ? `Business model: ${idea.businessModel}.` : undefined,
        input.businessConcept.possibleSpinOffProducts.length > 0
          ? `${input.businessConcept.possibleSpinOffProducts.length} possible extension(s) recorded.`
          : undefined,
      ]),
      [],
    ),
    category(
      "proof_of_concept_strength",
      "Proof of Concept Strength",
      proof.score,
      proof.explanation,
      proof.evidence,
      proof.score <= 10 ? ["No customer-behavior evidence is recorded."] : [],
    ),
    category(
      "risk_level",
      "Risk Level",
      scoreRiskLevel(input, proof, regulatoryLevel),
      "Scores the current risk burden; a higher score means the recorded risks appear more manageable.",
      compact([
        `${input.businessConcept.earlyRisks.length} concept-stage risk(s) recorded.`,
        `Regulatory complexity: ${regulatoryLevel}.`,
      ]),
      [],
    ),
    category(
      "local_opportunity",
      "Local Opportunity",
      scoreLocalOpportunity(input.marketResearchReport, idea),
      "Measures whether location-specific evidence supports the concept.",
      compact([
        input.marketResearchReport?.localOpportunityScore !== undefined
          ? `Local-opportunity score: ${input.marketResearchReport.localOpportunityScore}.`
          : undefined,
        idea.city && idea.state ? `Location: ${idea.city}, ${idea.state}.` : undefined,
      ]),
      compact([
        input.marketResearchReport?.localOpportunityScore === undefined
          ? "Location-specific opportunity data is missing."
          : undefined,
      ]),
    ),
  ];

  return scores;
}

function category(
  categoryId: FeasibilityCategory,
  title: string,
  score: number,
  explanation: string,
  evidence: string[],
  missingInformation: string[],
): FeasibilityCategoryScore {
  return {
    category: categoryId,
    title,
    score: clamp(score),
    explanation,
    evidence,
    missingInformation,
  };
}

function scoreCustomerNeed(idea: BusinessIdeaIntake, proof: ProofOfConceptScore): number {
  return clamp(
    (idea.customerProblem ? 30 : 5) +
      (idea.targetCustomer ? 15 : 0) +
      (idea.proposedSolution ? 15 : 0) +
      Math.round(proof.score * 0.4),
  );
}

function scoreMarketDemand(
  report: MarketResearchReport | undefined,
  proof: ProofOfConceptScore,
): number {
  if (report?.demandScore === undefined) {
    return clamp(15 + Math.round(proof.score * 0.45));
  }
  return clamp(Math.round(report.demandScore * 0.7 + proof.score * 0.3));
}

function scoreCompetitiveSaturation(
  analysis: CompetitorAnalysis | undefined,
  idea: BusinessIdeaIntake,
): number {
  if (!analysis) {
    return idea.knownCompetitors.length > 0 ? 38 : 25;
  }
  return {
    low: 82,
    moderate: 60,
    high: 28,
    unknown: 38,
  }[analysis.saturationLevel];
}

function scoreDifferentiation(input: FeasibilityProjectInput): number {
  const recorded = input.competitorAnalysis?.differentiationScore;
  if (recorded !== undefined) {
    return recorded;
  }
  return input.idea.proposedSolution ? 48 : 15;
}

function scoreFounderFit(founder: FounderIntake): number {
  return clamp(
    (founder.founderExperience ? 20 : 0) +
      (founder.industryExperience ? 25 : 0) +
      (founder.skills.length > 0 ? 20 : 0) +
      (founder.weeklyAvailableHours >= 30
        ? 20
        : founder.weeklyAvailableHours > 0
          ? 10
          : 0) +
      (founder.launchTimeline ? 15 : 0),
  );
}

function scoreStartupCostFeasibility(
  startupCosts: number,
  availableCapital: number,
): number {
  if (startupCosts <= 0) {
    return 30;
  }
  const capitalRatio = availableCapital / startupCosts;
  if (capitalRatio >= 1) return 95;
  if (capitalRatio >= 0.75) return 82;
  if (capitalRatio >= 0.5) return 68;
  if (capitalRatio >= 0.25) return 48;
  if (capitalRatio > 0) return 25;
  return 10;
}

function scoreFundingFeasibility(input: FeasibilityProjectInput): number {
  const startupCosts = input.financialAssumptions?.startupCosts ??
    input.idea.expectedStartupCosts;
  if (startupCosts <= 0) {
    return 30;
  }
  const fundingGap = Math.max(0, startupCosts - input.founder.availableStartupCapital);
  if (fundingGap === 0) {
    return 92;
  }
  const gapRatio = fundingGap / startupCosts;
  const desiredFundingCoverage = input.founder.desiredFundingAmount / fundingGap;
  let score = gapRatio <= 0.25 ? 65 : gapRatio <= 0.5 ? 50 : gapRatio <= 0.75 ? 32 : 18;
  if (desiredFundingCoverage >= 1) score += 10;
  if (input.fundingReadiness?.readinessScore !== undefined) {
    score = Math.round((score + input.fundingReadiness.readinessScore) / 2);
  }
  if (input.fundingReadiness?.fundingGapCovered) score += 10;
  if (input.fundingReadiness?.useOfFundsDefined) score += 5;
  return clamp(score);
}

function scoreOperationalComplexity(idea: BusinessIdeaIntake): number {
  const baseScores = {
    physical_location: 48,
    online: 78,
    mobile: 62,
    home_based: 80,
    hybrid: 55,
    franchise: 48,
    service: 72,
    product: 62,
    marketplace: 50,
    subscription: 65,
    manufacturing: 35,
    "": 30,
  } as const;
  const equipmentPenalty = Math.min(15, Math.max(0, idea.requiredEquipment.length - 2) * 3);
  return clamp(baseScores[idea.businessModel] - equipmentPenalty);
}

function scoreMarginPotential(
  assumptions: FinancialAssumptions | undefined,
  idea: BusinessIdeaIntake,
): number {
  if (assumptions?.grossMarginPercent !== undefined) {
    return clamp(Math.round(assumptions.grossMarginPercent * 1.25));
  }
  if (assumptions?.monthlyRevenue !== undefined && assumptions.monthlyFixedCosts !== undefined) {
    return assumptions.monthlyRevenue > assumptions.monthlyFixedCosts ? 58 : 30;
  }
  return idea.pricingIdea ? 42 : 25;
}

function scoreScalability(input: FeasibilityProjectInput): number {
  const baseScores = {
    physical_location: 48,
    online: 82,
    mobile: 60,
    home_based: 55,
    hybrid: 68,
    franchise: 72,
    service: 52,
    product: 65,
    marketplace: 84,
    subscription: 86,
    manufacturing: 62,
    "": 30,
  } as const;
  return clamp(
    baseScores[input.idea.businessModel] +
      Math.min(12, input.businessConcept.possibleSpinOffProducts.length * 4),
  );
}

function scoreRiskLevel(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
  regulatoryLevel: RegulatoryLevel,
): number {
  const startupCosts = input.financialAssumptions?.startupCosts ??
    input.idea.expectedStartupCosts;
  const capitalRatio = startupCosts > 0
    ? input.founder.availableStartupCapital / startupCosts
    : 0;
  let score = 78;
  score -= Math.min(20, input.businessConcept.earlyRisks.length * 4);
  if (proof.score <= 10) score -= 18;
  if (capitalRatio < 0.25) score -= 15;
  if (regulatoryLevel === "high") score -= 20;
  if (regulatoryLevel === "unknown") score -= 8;
  return clamp(score);
}

function scoreLocalOpportunity(
  report: MarketResearchReport | undefined,
  idea: BusinessIdeaIntake,
): number {
  if (report?.localOpportunityScore !== undefined) {
    return report.localOpportunityScore;
  }
  return idea.city && idea.state ? 25 : 10;
}

function inferRegulatoryComplexity(input: FeasibilityProjectInput): RegulatoryLevel {
  if (input.regulatoryNotes && input.regulatoryNotes.complexity !== "unknown") {
    return input.regulatoryNotes.complexity;
  }
  const regulatoryText = [
    input.idea.industry,
    input.idea.productOrService,
    ...input.idea.licensingConcerns,
  ]
    .join(" ")
    .toLowerCase();
  if (
    [
      "childcare",
      "child care",
      "day care",
      "health department",
      "liquor",
      "medical",
      "manufacturing",
      "environmental",
    ].some((keyword) => regulatoryText.includes(keyword))
  ) {
    return "high";
  }
  return input.idea.licensingConcerns.length > 0 ? "moderate" : "unknown";
}

type RegulatoryLevel = "low" | "moderate" | "high" | "unknown";

function regulatoryScore(level: RegulatoryLevel): number {
  return { low: 82, moderate: 55, high: 22, unknown: 35 }[level];
}

function calculateConfidence(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
): number {
  let confidence = 30;
  if (input.marketResearchReport) confidence += 20;
  if (input.marketResearchReport?.sources.length) confidence += 8;
  if (input.competitorAnalysis) confidence += 10;
  if (input.financialAssumptions) confidence += 10;
  if (input.fundingReadiness) confidence += 5;
  if (input.regulatoryNotes) confidence += 7;
  confidence += Math.round(proof.score * 0.1);
  if (!input.marketResearchReport) confidence -= 10;
  return clamp(confidence);
}

function recommend(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
  score: number,
): FeasibilityRecommendation {
  if (!input.marketResearchReport && proof.score <= 25) {
    return "insufficient data";
  }
  if (score >= 78 && proof.score >= 55 && inferRegulatoryComplexity(input) !== "high") {
    return "strong opportunity";
  }
  if (score >= 58) {
    return "promising but needs validation";
  }
  if (score >= 42) {
    return "risky";
  }
  return "weak opportunity";
}

function buildMissingInformation(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
): string[] {
  return unique([
    !input.marketResearchReport
      ? "Market research report is missing."
      : undefined,
    !input.competitorAnalysis
      ? "Competitor analysis is missing."
      : undefined,
    !input.financialAssumptions
      ? "Traceable financial assumptions are missing."
      : undefined,
    !input.fundingReadiness
      ? "Funding-readiness evidence is missing."
      : undefined,
    !input.regulatoryNotes
      ? "Structured regulatory notes are missing."
      : undefined,
    proof.score <= 10
      ? "Customer proof is limited to an idea."
      : undefined,
    ...input.businessConcept.unknowns,
  ]);
}

function buildWarnings(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
): string[] {
  const regulatoryLevel = inferRegulatoryComplexity(input);
  const startupCosts = input.financialAssumptions?.startupCosts ??
    input.idea.expectedStartupCosts;
  const capitalRatio = startupCosts > 0
    ? input.founder.availableStartupCapital / startupCosts
    : 0;
  return unique([
    "This deterministic feasibility score is a planning aid, not a guarantee of business success.",
    "Legal, tax, accounting, licensing, and funding decisions require review by qualified professionals and official agencies.",
    !input.marketResearchReport
      ? "Market research data is missing. Confidence is reduced until demand, market size, and local opportunity are researched."
      : undefined,
    proof.score <= 10
      ? "The concept has no recorded customer-behavior evidence. Strong founder fit cannot substitute for customer validation."
      : undefined,
    regulatoryLevel === "high"
      ? "High regulatory complexity detected. Verify licensing, permits, zoning, insurance, and compliance requirements with official agencies before spending heavily."
      : undefined,
    startupCosts > 0 && capitalRatio < 0.25
      ? "Estimated startup costs are high relative to available founder capital. Stage spending and validate the funding path."
      : undefined,
  ]);
}

function buildResearchNeeded(input: FeasibilityProjectInput): string[] {
  return unique([
    !input.marketResearchReport
      ? "Research demand, reachable market size, and local opportunity using official and primary sources."
      : undefined,
    !input.competitorAnalysis
      ? "Identify direct competitors, substitutes, pricing patterns, and saturation risks."
      : undefined,
    !input.financialAssumptions
      ? "Build traceable startup-cost, pricing, gross-margin, and monthly-cost assumptions."
      : undefined,
    !input.regulatoryNotes
      ? "Verify licensing, permit, zoning, insurance, and compliance requirements with official agencies."
      : undefined,
  ]);
}

function buildValidationSteps(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
): string[] {
  return unique([
    proof.score < 35
      ? "Interview target customers and record the problem, current alternatives, and willingness to pay."
      : undefined,
    proof.score < 65
      ? "Run a low-cost paid pilot, preorder test, or equivalent behavioral demand test."
      : undefined,
    proof.score < 85
      ? "Track whether first customers return, refer others, or place follow-on orders."
      : undefined,
    !input.competitorAnalysis
      ? "Compare the offer against direct competitors and substitutes."
      : undefined,
    !input.financialAssumptions
      ? "Estimate startup costs and unit economics before committing capital."
      : undefined,
  ]);
}

function buildSpendingGates(
  input: FeasibilityProjectInput,
  proof: ProofOfConceptScore,
): string[] {
  return unique([
    proof.score < 65
      ? "Do not make major purchases until a low-cost paid demand test produces evidence."
      : undefined,
    !input.marketResearchReport
      ? "Do not commit major capital until local demand and market-size research is recorded."
      : undefined,
    inferRegulatoryComplexity(input) !== "low"
      ? "Do not sign a lease or purchase regulated equipment until official requirements are verified."
      : undefined,
    scoreFundingFeasibility(input) < 45
      ? "Do not assume the funding gap is covered until a realistic source-of-funds path is documented."
      : undefined,
  ]);
}

function buildCriticalAssumptions(input: FeasibilityProjectInput): string[] {
  return unique([
    ...input.businessConcept.assumptions,
    "Category scores are deterministic planning estimates based on the currently recorded evidence.",
    "Missing evidence lowers confidence and should not be interpreted as proof that the opportunity is weak or strong.",
  ]);
}

function summarizeCategories(
  categories: FeasibilityCategoryScore[],
  mode: "strength" | "weakness",
): string[] {
  const sorted = [...categories].sort((left, right) =>
    mode === "strength" ? right.score - left.score : left.score - right.score,
  );
  return sorted
    .slice(0, 3)
    .map((item) => `${item.title}: ${item.score}/100. ${item.explanation}`);
}

function buildSummary(
  recommendation: FeasibilityRecommendation,
  score: number,
  proof: ProofOfConceptScore,
  weaknesses: string[],
): string {
  return [
    `Current recommendation: ${recommendation}.`,
    `The feasibility estimate is ${score}/100 with ${proof.title.toLowerCase()} as the strongest recorded proof.`,
    `The first issue to work on is ${weaknesses[0] ?? "the missing validation evidence"}`,
  ].join(" ");
}

function weightedAverage(categories: FeasibilityCategoryScore[]): number {
  const weights: Partial<Record<FeasibilityCategory, number>> = {
    customer_need: 1.3,
    market_demand: 1.3,
    proof_of_concept_strength: 1.4,
    funding_feasibility: 1.1,
    risk_level: 1.1,
  };
  const totalWeight = categories.reduce(
    (sum, item) => sum + (weights[item.category] ?? 1),
    0,
  );
  const weightedScore = categories.reduce(
    (sum, item) => sum + item.score * (weights[item.category] ?? 1),
    0,
  );
  return clamp(Math.round(weightedScore / totalWeight));
}

function describeCapitalEvidence(
  startupCosts: number,
  availableCapital: number,
): string[] {
  return [
    `Estimated startup costs: $${startupCosts.toLocaleString("en-US")}.`,
    `Available founder capital: $${availableCapital.toLocaleString("en-US")}.`,
  ];
}

function describeFundingEvidence(input: FeasibilityProjectInput): string[] {
  const startupCosts = input.financialAssumptions?.startupCosts ??
    input.idea.expectedStartupCosts;
  const gap = Math.max(0, startupCosts - input.founder.availableStartupCapital);
  return compact([
    `Estimated funding gap: $${gap.toLocaleString("en-US")}.`,
    input.founder.desiredFundingAmount > 0
      ? `Desired funding amount: $${input.founder.desiredFundingAmount.toLocaleString("en-US")}.`
      : undefined,
    input.fundingReadiness?.readinessScore !== undefined
      ? `Funding-readiness score: ${input.fundingReadiness.readinessScore}.`
      : undefined,
  ]);
}

function describeRegulatoryEvidence(
  input: FeasibilityProjectInput,
  level: RegulatoryLevel,
): string[] {
  return unique([
    `Regulatory complexity: ${level}.`,
    ...input.idea.licensingConcerns,
    ...(input.regulatoryNotes?.permits ?? []),
    ...(input.regulatoryNotes?.highRiskRequirements ?? []),
  ]);
}

function buildSources(input: FeasibilityProjectInput): SourceReference[] {
  return uniqueSources([
    founderInputSource,
    conceptSource,
    ...(input.marketResearchReport?.sources ?? []),
    hasSupportingEvidence(input) ? feasibilityEvidenceSource : undefined,
  ]);
}

function hasSupportingEvidence(input: FeasibilityProjectInput): boolean {
  const proof = input.proofOfConcept;
  return Boolean(
    input.competitorAnalysis ||
      input.financialAssumptions ||
      input.fundingReadiness ||
      input.regulatoryNotes ||
      proof.stage !== "idea_only" ||
      proof.prototypeNotes ||
      proof.customerInterviewCount ||
      proof.letterOfIntentCount ||
      proof.betaCustomerCount ||
      proof.firstSaleCount ||
      proof.repeatCustomerCount ||
      proof.purchaseOrderCount ||
      proof.activeMonthlyRevenue ||
      proof.notes.length,
  );
}

function uniqueSources(
  sources: (SourceReference | undefined)[],
): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source): source is SourceReference => {
    if (!source || seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

function compact<T>(values: (T | undefined)[]): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
