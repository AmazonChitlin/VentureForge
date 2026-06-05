import { engineResultSchema, type EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import {
  StrategicAnalysisInputSchema,
  StrategicAnalysisSchema,
  type ETOPItem,
  type NormalizedStrategicAnalysisInput,
  type StrategyRecommendation,
  type StrategicAnalysis,
  type StrategicAnalysisInput,
} from "@/engine/strategy/schema";

const conceptSource: SourceReference = {
  id: "strategy-business-concept",
  title: "Structured business concept",
  sourceName: "VentureForge concept engine",
  sourceType: "manual",
  notes: "Deterministic planning output derived from founder intake.",
};

const strategySource: SourceReference = {
  id: "strategy-analysis-method",
  title: "Deterministic strategic-analysis synthesis",
  sourceName: "VentureForge strategy engine",
  sourceType: "manual",
  notes: "Strategy recommendations are planning hypotheses tied to available inputs.",
};

type SaturationLevel = "low" | "moderate" | "high" | "unknown";

export const StrategicAnalysisEngine = {
  generate(inputDraft: StrategicAnalysisInput): EngineResult<StrategicAnalysis> {
    const input = StrategicAnalysisInputSchema.parse(inputDraft);
    const saturation = inferSaturation(input);
    const serviceBusiness = isServiceBusiness(input);
    const customer = customerSegment(input);
    const channels = customerChannels(input);
    const missingInformation = buildMissingInformation(input);
    const warnings = buildWarnings(input, saturation);
    const assumptions = unique([
      ...input.businessConcept.assumptions,
      "Strategic recommendations are deterministic planning hypotheses, not guarantees.",
      "Recommendations must be retested as market, competitor, customer, and financial evidence improves.",
    ]);
    const recommendations = buildRecommendations(input, saturation, channels);
    const analysis = StrategicAnalysisSchema.parse({
      swot: {
        strengths: buildStrengths(input),
        weaknesses: buildWeaknesses(input),
        opportunities: buildOpportunities(input, saturation),
        threats: buildThreats(input, saturation),
        actionsToUseStrengths: [
          `Use the founder advantage in the first customer-facing message: ${input.businessConcept.founderAdvantage}.`,
          `Make the core benefit concrete in a low-cost test for ${customer}: ${input.businessConcept.coreCustomerBenefit}.`,
        ],
        actionsToFixWeaknesses: [
          "Convert the most important unknown into a customer interview, pricing, or pilot test.",
          !input.marketResearchReport
            ? "Gather sourced local market evidence before committing major capital."
            : "Resolve the highest-priority missing-data items in the market report.",
        ],
        actionsToCaptureOpportunities: [
          `Test a focused offer for ${customer} before expanding the product or service line.`,
          saturation === "high"
            ? "Find a narrow white-space position that incumbents do not serve clearly."
            : "Test whether the initial differentiator creates a measurable response.",
        ],
        actionsToReduceThreats: [
          "Track customer objections, competitor alternatives, and switching friction during validation.",
          "Stage spending behind evidence gates and verify legal or regulatory requirements before launch.",
        ],
      },
      pestle: buildPestle(input),
      etopProfile: buildEtop(input, saturation),
      marketingMix: {
        product: [
          `Lead with the primary offer: ${input.businessConcept.primaryProductOrService}.`,
          `Tie the offer to the stated customer benefit: ${input.businessConcept.coreCustomerBenefit}.`,
        ],
        price: [
          "Treat pricing as a testable hypothesis and compare it with customer alternatives.",
          input.customerAnalysis?.priceSensitivity[0] ??
            "Collect willingness-to-pay evidence before scaling.",
        ],
        place: [
          `Use the planned distribution model: ${input.businessConcept.distributionModel}.`,
          ...channels.slice(0, 3),
        ],
        promotion: [
          `Center promotion on the customer problem: ${input.businessConcept.customerProblem}.`,
          "Use measurable calls to action so promotion produces learning, not just visibility.",
        ],
        people: serviceBusiness
          ? [
              "Define who interacts with customers and the trust signals they must deliver.",
              "Train customer-facing work around consistency, responsiveness, and issue recovery.",
            ]
          : ["Identify customer-support responsibilities and trust signals."],
        process: serviceBusiness
          ? [
              "Map the service flow from discovery through booking, fulfillment, follow-up, and repeat purchase.",
              "Track bottlenecks, wait time, handoffs, and customer feedback.",
            ]
          : ["Map ordering, fulfillment, support, and repeat-purchase steps."],
        physicalEvidence: serviceBusiness
          ? [
              "Use visible proof such as clear estimates, confirmations, service standards, testimonials when verified, and follow-up.",
              "Do not use unverified testimonials, review claims, or performance claims.",
            ]
          : ["Use clear product information, policies, confirmations, and verified proof signals."],
      },
      businessModelSummary: {
        revenueStreams: [input.businessConcept.revenueModel],
        keyResources: unique([
          input.businessConcept.founderAdvantage,
          "A validated customer problem and repeatable offer",
          input.founder?.skills.length
            ? `Founder skills: ${input.founder.skills.join(", ")}.`
            : undefined,
        ]),
        keyActivities: unique([
          `Deliver ${input.businessConcept.primaryProductOrService}.`,
          "Validate demand, pricing, and customer objections.",
          "Track unit economics and repeat behavior.",
        ]),
        keyPartners: unique([
          "Suppliers, service providers, or channel partners required for reliable delivery",
          "Professional advisors and official agencies where compliance review is needed",
          "Referral or community partners that reach the target customer",
        ]),
        costStructure: unique([
          "Startup costs, fixed operating costs, variable costs, and customer-acquisition costs require traceable assumptions.",
          input.feasibilityReport
            ? `Use the feasibility spending gates: ${input.feasibilityReport.doNotSpendMoneyUntil.join(" ")}`
            : "Run a feasibility review before major spending.",
        ]),
        channels,
        customerRelationships: unique([
          "Start with direct learning conversations and measurable offer tests.",
          serviceBusiness
            ? "Build follow-up, issue recovery, referral, and repeat-booking steps into the service process."
            : "Build follow-up, support, referral, and repeat-purchase steps into the operating process.",
        ]),
      },
      strategicRecommendations: recommendations,
    });
    const sources = buildSources(input);
    const nextActions = buildNextActions(input, saturation);

    return engineResultSchema(StrategicAnalysisSchema).parse({
      data: analysis,
      confidence: calculateConfidence(input),
      assumptions,
      missingInformation,
      warnings,
      sources,
      nextActions,
    });
  },
};

function buildRecommendations(
  input: NormalizedStrategicAnalysisInput,
  saturation: SaturationLevel,
  channels: string[],
) {
  const customer = customerSegment(input);
  const whiteSpace = input.competitorAnalysis?.whiteSpaceOpportunities[0];
  const positioning = saturation === "high"
    ? `Choose a narrow position for ${customer} around one unmet need: ${whiteSpace ?? input.businessConcept.coreCustomerBenefit}.`
    : `Position the offer for ${customer} around the clearest customer benefit: ${input.businessConcept.coreCustomerBenefit}.`;
  return {
    positioningStrategy: recommendation(
      positioning,
      saturation === "high"
        ? "Competitive saturation appears high, so a broad undifferentiated launch would create avoidable risk."
        : `The concept and customer inputs identify ${customer} and a specific benefit to test.`,
    ),
    pricingStrategy: recommendation(
      "Run a staged price test against the customer's current alternatives before locking a price ladder.",
      input.customerAnalysis?.priceSensitivity[0] ??
        "Pricing remains a hypothesis and should be grounded in willingness-to-pay evidence.",
    ),
    marketingStrategy: recommendation(
      `Start with ${channels.slice(0, 3).join(", ")} and use a measurable call to action.`,
      `These channels follow the planned distribution model and the available customer-analysis reach hypotheses for ${customer}.`,
    ),
    salesStrategy: recommendation(
      "Use a low-cost pilot, preorder, consultation, or first-sale path that records objections and conversion behavior.",
      input.feasibilityReport
        ? `The feasibility recommendation is ${input.feasibilityReport.recommendation}, so sales activity should produce evidence before scale.`
        : "Feasibility evidence is missing, so early sales work should prioritize learning and paid proof.",
    ),
    operationsStrategy: recommendation(
      `Design the first operating workflow around reliable delivery of ${input.businessConcept.primaryProductOrService}.`,
      `The concept uses ${input.businessConcept.distributionModel}; the first workflow should expose cost, timing, quality, and capacity risks.`,
    ),
    supplierResourceStrategy: recommendation(
      "Verify the smallest set of suppliers, tools, facilities, and professional resources needed for a pilot.",
      input.businessConcept.earlyRisks[0] ??
        "Staged resource commitments reduce the risk of spending ahead of evidence.",
    ),
    growthStrategy: recommendation(
      "Expand only after the first segment shows repeat behavior, referrals, or follow-on orders.",
      input.feasibilityReport
        ? `The strongest recorded proof is ${input.feasibilityReport.proofOfConceptScore.title.toLowerCase()}; stronger proof should unlock larger commitments.`
        : "No feasibility proof ladder is available yet, so growth should remain gated by behavioral evidence.",
    ),
    riskMitigationStrategy: recommendation(
      "Retest the largest assumption each cycle and stage major spending behind customer, market, financial, and regulatory evidence.",
      input.feasibilityReport?.topWeaknesses[0] ??
        input.businessConcept.earlyRisks[0] ??
        "The concept still contains unresolved assumptions.",
    ),
  };
}

function buildStrengths(input: NormalizedStrategicAnalysisInput): string[] {
  return unique([
    `Founder-value hypothesis: ${input.businessConcept.founderAdvantage}.`,
    `Defined benefit hypothesis: ${input.businessConcept.coreCustomerBenefit}.`,
    input.feasibilityReport?.topStrengths[0],
    input.customerAnalysis
      ? `Customer-analysis focus: ${input.customerAnalysis.primaryCustomerPersona.segment}.`
      : undefined,
  ]);
}

function buildWeaknesses(input: NormalizedStrategicAnalysisInput): string[] {
  return unique([
    input.feasibilityReport?.topWeaknesses[0],
    !input.marketResearchReport
      ? "Local market demand, size, and economic context are not yet supported by a market-research report."
      : undefined,
    !input.customerAnalysis
      ? "Customer motivations, objections, and channels have not been analyzed."
      : undefined,
    !input.competitorAnalysis
      ? "Competitor alternatives and white-space opportunities have not been analyzed."
      : undefined,
    ...input.businessConcept.unknowns.slice(0, 2),
  ]);
}

function buildOpportunities(
  input: NormalizedStrategicAnalysisInput,
  saturation: SaturationLevel,
): string[] {
  return unique([
    ...(input.competitorAnalysis?.whiteSpaceOpportunities.slice(0, 2) ?? []),
    saturation === "high"
      ? "A narrow, underserved customer need may be more defensible than a broad launch."
      : "The concept can test whether its initial differentiator produces measurable response.",
    input.businessConcept.possibleSpinOffProducts[0]
      ? `Future extension after proof: ${input.businessConcept.possibleSpinOffProducts[0]}.`
      : undefined,
  ]);
}

function buildThreats(
  input: NormalizedStrategicAnalysisInput,
  saturation: SaturationLevel,
): string[] {
  return unique([
    saturation === "high"
      ? "High estimated competitor saturation can make customer acquisition harder and increase price pressure."
      : undefined,
    ...(input.competitorAnalysis?.barriersToEntry.slice(0, 2) ?? []),
    ...input.businessConcept.earlyRisks.slice(0, 2),
    input.marketResearchReport?.containsMockData
      ? "Market-research placeholders could create false confidence if treated as official evidence."
      : undefined,
  ]);
}

function buildPestle(input: NormalizedStrategicAnalysisInput) {
  const market = input.marketResearchReport;
  return {
    political: [
      "Verify state and local business rules, public programs, and policy-sensitive requirements with official agencies.",
    ],
    economic: [
      market?.economicCycleSensitivity ??
        "Economic-cycle sensitivity has not been researched.",
      market?.marketSizeEstimate ?? "Market-size evidence is missing.",
    ],
    social: unique([
      `Test whether ${customerSegment(input)} prioritize the stated benefit.`,
      ...(input.customerAnalysis?.psychographicProfile.slice(0, 2) ?? []),
    ]),
    technological: [
      market?.technologyDisruption ??
        "Technology disruption and digital substitutes have not been researched.",
    ],
    legal: [
      market?.regulatorySensitivity ??
        "Legal and regulatory sensitivity require official verification.",
    ],
    environmental: unique([
      ...input.businessConcept.environmentalOrCommunityImpactNotes,
      "Verify environmental obligations and community impacts that apply to the operating model.",
    ]),
  };
}

function buildEtop(
  input: NormalizedStrategicAnalysisInput,
  saturation: SaturationLevel,
): ETOPItem[] {
  return [
    {
      sector: "Customer demand",
      opportunityOrThreat: "opportunity",
      impactLevel: "high",
      probability: input.customerAnalysis ? "moderate" : "unknown",
      strategicResponse: `Test a measurable offer for ${customerSegment(input)} before scaling.`,
    },
    {
      sector: "Competition",
      opportunityOrThreat: saturation === "high" ? "threat" : "opportunity",
      impactLevel: saturation === "high" ? "high" : "moderate",
      probability: saturation,
      strategicResponse: saturation === "high"
        ? "Choose a narrow white-space position and compare conversion against alternatives."
        : "Test whether the proposed differentiator creates a response competitors do not address clearly.",
    },
    {
      sector: "Economics",
      opportunityOrThreat: "threat",
      impactLevel: "moderate",
      probability: input.marketResearchReport ? "moderate" : "unknown",
      strategicResponse: "Build traceable cost and pricing assumptions, then test sensitivity before major commitments.",
    },
    {
      sector: "Legal and regulatory",
      opportunityOrThreat: "threat",
      impactLevel: "moderate",
      probability: "unknown",
      strategicResponse: "Verify official licensing, zoning, tax, insurance, and compliance requirements before launch.",
    },
    {
      sector: "Technology",
      opportunityOrThreat: "opportunity",
      impactLevel: "moderate",
      probability: input.marketResearchReport ? "moderate" : "unknown",
      strategicResponse: "Use technology only where it reduces customer friction or improves operating reliability.",
    },
  ];
}

function inferSaturation(input: NormalizedStrategicAnalysisInput): SaturationLevel {
  const records = input.competitorAnalysis?.competitiveGrid ?? [];
  if (records.some((record) => record.threatLevel === "high")) return "high";
  if (records.filter((record) => record.relationship === "direct").length >= 4) {
    return "high";
  }
  if (records.length >= 3) return "moderate";
  if (records.length > 0) return "low";
  if (input.marketResearchReport?.marketSaturationEstimate.toLowerCase().includes("high")) {
    return "high";
  }
  return "unknown";
}

function isServiceBusiness(input: NormalizedStrategicAnalysisInput): boolean {
  if (input.serviceBusiness !== undefined) return input.serviceBusiness;
  const text = [
    input.businessConcept.primaryProductOrService,
    input.businessConcept.suggestedBusinessType,
    input.businessConcept.distributionModel,
  ].join(" ").toLowerCase();
  return ["service", "consult", "care", "mobile", "subscription", "hospitality"]
    .some((keyword) => text.includes(keyword));
}

function customerSegment(input: NormalizedStrategicAnalysisInput): string {
  return input.customerAnalysis?.primaryCustomerPersona.segment ??
    input.businessConcept.targetCustomerSegment;
}

function customerChannels(input: NormalizedStrategicAnalysisInput): string[] {
  return unique([
    ...(input.customerAnalysis?.channelsWhereCustomersCanBeReached ?? []),
    "Direct customer interviews",
    "A measurable landing-page or offer test",
  ]);
}

function buildMissingInformation(input: NormalizedStrategicAnalysisInput): string[] {
  return unique([
    !input.feasibilityReport ? "Feasibility report is missing." : undefined,
    !input.marketResearchReport ? "Market-research report is missing." : undefined,
    !input.customerAnalysis ? "Customer analysis is missing." : undefined,
    !input.competitorAnalysis ? "Competitor analysis is missing." : undefined,
    !input.founder ? "Founder intake is missing." : undefined,
    ...input.businessConcept.unknowns.slice(0, 3),
  ]);
}

function buildWarnings(
  input: NormalizedStrategicAnalysisInput,
  saturation: SaturationLevel,
): string[] {
  return unique([
    "Strategy recommendations are planning hypotheses and must be validated through execution evidence.",
    !input.marketResearchReport
      ? "Market research is missing. Strategy confidence is reduced."
      : undefined,
    input.marketResearchReport?.containsMockData
      ? "The market-research report contains mock data. Replace placeholders before relying on local market claims."
      : undefined,
    saturation === "high"
      ? "High competitor saturation detected. Test a narrow position before broad spending."
      : undefined,
  ]);
}

function buildNextActions(
  input: NormalizedStrategicAnalysisInput,
  saturation: SaturationLevel,
): string[] {
  return unique([
    !input.marketResearchReport
      ? "Complete sourced local market research."
      : undefined,
    !input.customerAnalysis
      ? "Generate customer analysis and run discovery interviews."
      : undefined,
    !input.competitorAnalysis
      ? "Research direct competitors, indirect alternatives, and substitutes."
      : undefined,
    saturation === "high"
      ? "Test a narrow white-space position against incumbent alternatives."
      : "Run a measurable offer test for the first customer segment.",
    "Review the strategy after each validation cycle and update the largest assumption.",
  ]);
}

function calculateConfidence(input: NormalizedStrategicAnalysisInput): number {
  let score = 25;
  if (input.feasibilityReport) score += 15;
  if (input.marketResearchReport) score += 20;
  if (input.marketResearchReport && !input.marketResearchReport.containsMockData) {
    score += 10;
  }
  if (input.customerAnalysis) score += 12;
  if (input.competitorAnalysis) score += 12;
  if (input.founder) score += 6;
  return clamp(score);
}

function buildSources(input: NormalizedStrategicAnalysisInput): SourceReference[] {
  return uniqueSources([
    conceptSource,
    strategySource,
    ...(input.marketResearchReport?.sourcesUsed ?? []),
  ]);
}

function recommendation(
  text: string,
  reasoning: string,
): StrategyRecommendation {
  return { recommendation: text, reasoning };
}

function uniqueSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
