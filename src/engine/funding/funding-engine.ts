import {
  fundingOpportunityTemplates,
  type FundingOpportunityTemplate,
} from "@/engine/funding/catalog";
import {
  FundingEngineInputSchema,
  FundingMatchResultSchema,
  type FundingCategory,
  type FundingEngineInput,
  type FundingMatch,
  type FundingMatchResult,
  type FundingReadinessCategory,
  type FundingReadinessCategoryScore,
  type FundingReadinessScore,
  type NormalizedFundingEngineInput,
} from "@/engine/funding/schema";
import {
  engineResultSchema,
  type EngineResult,
} from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import {
  getSBAResourceById,
  getSBAResourcesForFundingCategory,
  sbaResourceToSourceReference,
} from "@/providers/sba/provider";

const TEMPLATE_WARNING =
  "Funding matches are planning templates, not live offers. Verify current eligibility, terms, deadlines, and application requirements with the official source, lender, or program administrator. Final eligibility is determined by the lender, investor, or program administrator.";
const NO_GUARANTEE_WARNING =
  "VentureForge does not guarantee loans, grants, investments, certifications, contracting awards, or business success. Final decisions belong to the lender, investor, or program administrator.";
const PREDATORY_LENDER_WARNING =
  "Avoid predatory lending: compare written rates, fees, repayment terms, guarantees, liens, and early-payment conditions before accepting capital.";

interface MatchContext {
  input: NormalizedFundingEngineInput;
  readiness: FundingReadinessScore;
  estimatedFundingGap: number;
  startupCosts: number;
  desiredFundingAmount: number;
  ownerContributionRatio: number;
  hasEquipmentNeed: boolean;
  isFixedAssetCandidate: boolean;
  isOrdinarySmallBusiness: boolean;
  isManufacturing: boolean;
  isSoftwareOrPlatform: boolean;
  isVentureAppropriate: boolean;
  proofTitle: string;
  hasContractingPathReason: boolean;
}

const proofScoreByStage = {
  idea_only: 10,
  prototype: 30,
  customer_interview_evidence: 40,
  letter_of_intent: 52,
  beta_customer: 58,
  first_sale: 68,
  repeat_sales: 82,
  purchase_order: 88,
  active_revenue: 95,
} as const;

export const FundingEngine = {
  match(inputDraft: FundingEngineInput): EngineResult<FundingMatchResult> {
    const input = FundingEngineInputSchema.parse(inputDraft);
    const readiness = scoreReadiness(input);
    const estimatedFundingGap = fundingGap(input);
    const context = buildContext(input, readiness, estimatedFundingGap);
    const matches = fundingOpportunityTemplates
      .filter((template) => shouldInclude(template.type, context))
      .map((template) => buildMatch(template, context))
      .sort(
        (left, right) =>
          right.matchScore - left.matchScore ||
          left.opportunityName.localeCompare(right.opportunityName),
      );
    const missingInformation = unique(
      readiness.categoryScores.flatMap((category) => category.missingInformation),
    );
    const sources = uniqueSources(matches.flatMap(sourcesFromMatch));
    const documentsToPrepare = unique(
      matches.slice(0, 5).flatMap((match) => match.documentsNeeded),
    );

    return engineResultSchema(FundingMatchResultSchema).parse({
      data: {
        fundingReadinessScore: readiness,
        estimatedFundingGap,
        matches,
        priorityMatches: matches.slice(0, 5),
        documentsToPrepare,
        verificationReminder: TEMPLATE_WARNING,
      },
      confidence: scoreConfidence(input),
      assumptions: [
        "The matcher ranks research pathways, not approvals or live offers.",
        "Ordinary small businesses should investigate SBA, CDFI, community-bank, and credit-union paths before treating equity capital as the default.",
        "Ownership attributes are founder-controlled screening inputs and do not establish certification or final eligibility.",
        context.isVentureAppropriate
          ? "The founder marked this as scalable and high-growth, and the business description indicates software, technology, a platform, a marketplace, or a subscription model."
          : "Venture capital is excluded unless the project is explicitly scalable and high-growth with a venture-suitable model.",
      ],
      missingInformation,
      warnings: [
        TEMPLATE_WARNING,
        NO_GUARANTEE_WARNING,
        PREDATORY_LENDER_WARNING,
        ...(input.financialProjection
          ? []
          : [
              "Financial projections are missing. Debt and investment pathways cannot be evaluated responsibly until startup uses, operating assumptions, cash flow, and funding gap are documented.",
            ]),
        ...(input.marketResearchReport?.containsMockData
          ? [
              "Funding-readiness input includes mock market research. Replace placeholders with verified official and primary research before relying on match scores or applying.",
            ]
          : []),
      ],
      sources,
      nextActions: [
        ...(missingInformation.length > 0
          ? ["Complete the missing funding-readiness evidence before applying."]
          : []),
        ...matches
          .slice(0, 3)
          .map(
            (match) =>
              `Verify the ${match.opportunityName} template against its official source and current requirements.`,
          ),
        "Compare written terms and review legal, tax, accounting, and lending decisions with qualified professionals.",
      ],
    });
  },
};

function scoreReadiness(
  input: NormalizedFundingEngineInput,
): FundingReadinessScore {
  const startupCosts = determineStartupCosts(input);
  const categories: FundingReadinessCategoryScore[] = [
    category(
      "business_plan_completeness",
      "Business plan completeness",
      input.businessPlanCompleteness ?? 0,
      input.businessPlanCompleteness === undefined
        ? "No business-plan completeness score was provided."
        : `Business-plan completeness is recorded at ${input.businessPlanCompleteness}/100.`,
      input.businessPlanCompleteness === undefined
        ? ["Business-plan completeness assessment"]
        : [],
    ),
    category(
      "financial_projection_completeness",
      "Financial projection completeness",
      financialProjectionCompleteness(input),
      input.financialProjection
        ? "Projection completeness reflects the share of editable assumptions that have been replaced with user inputs."
        : "No editable financial projection was provided.",
      input.financialProjection ? [] : ["Editable financial projection"],
    ),
    category(
      "owner_contribution",
      "Owner contribution",
      ownerContributionScore(input, startupCosts),
      startupCosts > 0
        ? `Available startup capital is ${percentage(input.founder.availableStartupCapital / startupCosts)} of estimated startup costs.`
        : "Startup costs are not defined well enough to evaluate the owner contribution.",
      startupCosts > 0 ? [] : ["Verified startup-cost estimate"],
    ),
    category(
      "credit_readiness_self_assessment",
      "Credit readiness self-assessment",
      creditReadinessScore(input.founder.creditReadinessSelfAssessment),
      input.founder.creditReadinessSelfAssessment
        ? `Founder self-assessment: ${input.founder.creditReadinessSelfAssessment.replaceAll("_", " ")}.`
        : "Credit readiness has not been self-assessed.",
      input.founder.creditReadinessSelfAssessment
        ? []
        : ["Credit-readiness self-assessment"],
    ),
    category(
      "collateral_readiness",
      "Collateral readiness",
      readinessMap(input.collateralReadiness, {
        unknown: 10,
        none: 25,
        partial: 60,
        ready: 90,
      }),
      `Collateral readiness is marked ${input.collateralReadiness.replaceAll("_", " ")}.`,
      input.collateralReadiness === "unknown"
        ? ["Collateral and personal-guarantee review"]
        : [],
    ),
    category(
      "proof_of_concept",
      "Proof of concept",
      proofOfConceptScore(input),
      `Strongest recorded proof: ${proofOfConceptTitle(input)}.`,
      hasProofEvidence(input) ? [] : ["Customer or sales evidence"],
    ),
    category(
      "revenue_evidence",
      "Revenue evidence",
      revenueEvidenceScore(input),
      revenueEvidenceExplanation(input),
      revenueEvidenceScore(input) > 10 ? [] : ["Revenue evidence"],
    ),
    category(
      "market_research_quality",
      "Market-research quality",
      input.marketResearchReport?.confidenceLevel.score ?? 0,
      input.marketResearchReport
        ? `Market-research confidence is ${input.marketResearchReport.confidenceLevel.score}/100.`
        : "No market-research report was provided.",
      input.marketResearchReport ? [] : ["Market-research report"],
    ),
    category(
      "use_of_funds_clarity",
      "Use-of-funds clarity",
      useOfFundsScore(input),
      useOfFundsExplanation(input),
      input.useOfFundsClarity === "clear"
        ? []
        : ["Itemized use-of-funds schedule"],
    ),
    category(
      "legal_entity_readiness",
      "Legal and entity readiness",
      readinessMap(input.legalEntityReadiness, {
        unknown: 10,
        not_started: 15,
        developing: 55,
        registered: 90,
      }),
      `Legal and entity readiness is marked ${input.legalEntityReadiness.replaceAll("_", " ")}.`,
      input.legalEntityReadiness === "registered"
        ? []
        : ["Entity-registration status and required records"],
    ),
  ];
  const score = clamp(
    categories.reduce((total, current) => total + current.score, 0) /
      categories.length,
  );

  return {
    score,
    level:
      score >= 75 ? "application_ready" : score >= 45 ? "developing" : "early",
    categoryScores: categories,
    explanation:
      score >= 75
        ? "The project has a useful application-preparation base, but every lender or program still makes its own decision."
        : score >= 45
          ? "The project is developing. Fill the evidence gaps before treating any funding path as application-ready."
          : "The project is early. Document the business case, financials, and validation evidence before applying or accepting expensive capital.",
  };
}

function category(
  categoryName: FundingReadinessCategory,
  title: string,
  score: number,
  explanation: string,
  missingInformation: string[],
): FundingReadinessCategoryScore {
  return {
    category: categoryName,
    title,
    score: clamp(score),
    explanation,
    missingInformation,
  };
}

function buildContext(
  input: NormalizedFundingEngineInput,
  readiness: FundingReadinessScore,
  estimatedFundingGap: number,
): MatchContext {
  const startupCosts = determineStartupCosts(input);
  const description = [
    input.idea.businessIdea,
    input.idea.industry,
    input.idea.productOrService,
    input.businessConcept?.primaryProductOrService,
    input.businessConcept?.revenueModel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const isManufacturing =
    input.idea.businessModel === "manufacturing" ||
    /manufactur|machine shop|fabricat|production/.test(description);
  const isSoftwareOrPlatform =
    /software|saas|technology|tech platform|app\b|digital platform/.test(
      description,
    ) ||
    input.idea.businessModel === "marketplace" ||
    input.idea.businessModel === "subscription";
  const isVentureAppropriate =
    input.scalableHighGrowth && isSoftwareOrPlatform;
  const ownership = input.founder.ownershipAttributes;
  const hasContractingPathReason =
    input.federalContractingInterest ||
    isManufacturing ||
    ownership.veteranOwned ||
    ownership.disabledVeteranOwned ||
    ownership.womanOwned ||
    ownership.minorityOwned ||
    ownership.tribalOwned;

  return {
    input,
    readiness,
    estimatedFundingGap,
    startupCosts,
    desiredFundingAmount:
      input.founder.desiredFundingAmount || estimatedFundingGap,
    ownerContributionRatio:
      startupCosts > 0 ? input.founder.availableStartupCapital / startupCosts : 0,
    hasEquipmentNeed:
      input.idea.requiredEquipment.length > 0 ||
      (input.financialProjection?.startupCostTable.find(
        (item) => item.key === "equipment",
      )?.amount ?? 0) > 0,
    isFixedAssetCandidate:
      isManufacturing ||
      input.idea.businessModel === "physical_location" ||
      input.idea.requiredEquipment.length > 0,
    isOrdinarySmallBusiness: !isVentureAppropriate,
    isManufacturing,
    isSoftwareOrPlatform,
    isVentureAppropriate,
    proofTitle: proofOfConceptTitle(input),
    hasContractingPathReason,
  };
}

function shouldInclude(
  type: FundingCategory,
  context: MatchContext,
): boolean {
  const ownership = context.input.founder.ownershipAttributes;

  switch (type) {
    case "sba_microloan":
      return (
        context.desiredFundingAmount > 0 && context.desiredFundingAmount <= 50_000
      );
    case "sba_504":
      return (
        context.isFixedAssetCandidate &&
        (context.desiredFundingAmount >= 75_000 || context.isManufacturing)
      );
    case "sam_gov_contracting_pathway":
      return context.hasContractingPathReason;
    case "sbir_sttr":
      return context.input.technologyResearchAndDevelopment;
    case "veteran_owned_program":
      return ownership.veteranOwned || ownership.disabledVeteranOwned;
    case "disabled_veteran_owned_program":
      return ownership.disabledVeteranOwned;
    case "woman_owned_program":
      return ownership.womanOwned;
    case "minority_owned_program":
      return ownership.minorityOwned;
    case "rural_program":
      return ownership.ruralOwned;
    case "tribal_program":
      return ownership.tribalOwned;
    case "equipment_financing":
      return context.hasEquipmentNeed;
    case "angel_investment":
      return context.input.scalableHighGrowth;
    case "venture_capital":
      return context.isVentureAppropriate;
    default:
      return true;
  }
}

function buildMatch(
  template: FundingOpportunityTemplate,
  context: MatchContext,
): FundingMatch {
  return {
    ...template,
    eligibilityTags: unique([
      ...template.eligibilityTags,
      context.input.idea.state
        ? `state:${context.input.idea.state.toLowerCase()}`
        : undefined,
    ]),
    matchScore: scoreTemplate(template.type, context),
    whyItFits: whyItFits(template.type, context),
    whyItMayNotFit: template.riskNotes,
    documentsNeeded: unique(template.documentsNeeded),
    nextSteps: [
      `Open the official source and verify the current ${template.opportunityName} requirements.`,
      "Confirm eligibility, permitted uses, timing, total cost, and required documents before applying.",
      `Prepare: ${template.documentsNeeded.slice(0, 3).join(", ")}.`,
    ],
    deadline:
      "Template only: verify current deadlines and application windows with the official source.",
    riskNotes: unique([
      ...template.riskNotes,
      "Do not treat this template as an approval, award, or guarantee.",
    ]),
    officialSourceRequired: true,
    isTemplate: true,
    verificationStatus: "template_requires_verification",
  };
}

function scoreTemplate(type: FundingCategory, context: MatchContext): number {
  const readinessAdjustment = Math.round((context.readiness.score - 50) * 0.12);
  const debtAdjustment =
    context.input.founder.creditReadinessSelfAssessment === "ready"
      ? 6
      : context.input.founder.creditReadinessSelfAssessment === "needs_work"
        ? -10
        : 0;
  const ordinaryBonus = context.isOrdinarySmallBusiness ? 6 : 0;

  switch (type) {
    case "sba_7a":
      return clamp(72 + ordinaryBonus + readinessAdjustment + debtAdjustment);
    case "sba_504":
      return clamp(70 + ordinaryBonus + readinessAdjustment + debtAdjustment);
    case "sba_microloan":
      return clamp(78 + ordinaryBonus + readinessAdjustment + debtAdjustment);
    case "sba_lender_match":
      return clamp(74 + ordinaryBonus + readinessAdjustment);
    case "cdfi_loan":
      return clamp(70 + ordinaryBonus + readinessAdjustment + debtAdjustment);
    case "local_community_bank":
      return clamp(66 + ordinaryBonus + readinessAdjustment + debtAdjustment);
    case "credit_union":
      return clamp(64 + ordinaryBonus + readinessAdjustment + debtAdjustment);
    case "state_grant":
      return 48;
    case "local_economic_development_incentive":
      return context.isManufacturing ? 68 : 56;
    case "grants_gov":
      return context.input.technologyResearchAndDevelopment ? 55 : 30;
    case "sam_gov_contracting_pathway":
      return context.input.federalContractingInterest ? 66 : 54;
    case "sbir_sttr":
      return 82;
    case "veteran_owned_program":
      return 72;
    case "disabled_veteran_owned_program":
      return 78;
    case "woman_owned_program":
      return 72;
    case "minority_owned_program":
      return 64;
    case "rural_program":
      return 72;
    case "tribal_program":
      return 78;
    case "crowdfunding":
      return context.input.scalableHighGrowth ? 60 : 52;
    case "equipment_financing":
      return clamp(68 + ordinaryBonus + readinessAdjustment + debtAdjustment);
    case "bootstrapping":
      return context.ownerContributionRatio >= 0.5
        ? 84
        : context.input.founder.availableStartupCapital > 0
          ? 72
          : 46;
    case "friends_family":
      return 42;
    case "angel_investment":
      return context.isVentureAppropriate ? 72 : 60;
    case "venture_capital":
      return 68;
  }
}

function whyItFits(type: FundingCategory, context: MatchContext): string[] {
  const gap = money(context.estimatedFundingGap);
  const desired = money(context.desiredFundingAmount);

  switch (type) {
    case "sba_7a":
      return [
        `The project has an estimated ${gap} funding gap and should compare lender-delivered small-business debt options.`,
        "7(a) is a broad SBA-backed loan research path for eligible small-business purposes.",
      ];
    case "sba_504":
      return [
        "The project indicates facility, equipment, or manufacturing needs that may warrant fixed-asset financing research.",
        `The current desired funding path is approximately ${desired}.`,
      ];
    case "sba_microloan":
      return [
        `The current desired funding path is ${desired}, within the SBA Microloan program's up-to-$50,000 range.`,
        "Intermediary microlenders can be worth comparing for a smaller startup request.",
      ];
    case "sba_lender_match":
      return [
        "The project needs lender research and written-term comparison.",
        "SBA Lender Match can help identify participating lenders without implying approval.",
      ];
    case "cdfi_loan":
      return [
        "Mission-driven CDFIs are a practical research path alongside conventional lenders.",
        "CDFIs can be especially useful when the founder wants a locally informed lending conversation.",
      ];
    case "local_community_bank":
      return [
        "An ordinary small business should compare local relationship-lender options.",
        "A community bank can evaluate the plan, owner contribution, local context, and repayment case.",
      ];
    case "credit_union":
      return [
        "A credit union is a reasonable local comparison path where membership and business products fit.",
        "Comparing multiple written offers can reduce avoidable financing cost.",
      ];
    case "state_grant":
      return [
        `The project is located in ${context.input.idea.state || "an unspecified state"}, so live state-program research is appropriate.`,
        "A state connector can later replace this research template with current opportunities.",
      ];
    case "local_economic_development_incentive":
      return [
        "Local programs may be relevant when location, equipment, or job creation affects the project.",
        "City, county, utility, and economic-development resources should be checked before major commitments.",
      ];
    case "grants_gov":
      return [
        "Grants.gov is the official search path for posted federal grant opportunities.",
        "The project should only pursue a notice whose eligibility and permitted uses clearly match.",
      ];
    case "sam_gov_contracting_pathway":
      return [
        "The business has a manufacturing, ownership-attribute, or federal-contracting reason to investigate procurement readiness.",
        "SAM.gov entity registration is a foundational federal-contracting step.",
      ];
    case "sbir_sttr":
      return [
        "The founder marked the project as technology research and development.",
        "SBIR/STTR research awards should be researched against current agency solicitations and commercialization fit.",
      ];
    case "veteran_owned_program":
      return [
        "The founder selected a veteran-owned attribute.",
        "Veteran-owned certification, assistance, and contracting pathways warrant official-source research.",
      ];
    case "disabled_veteran_owned_program":
      return [
        "The founder selected a disabled-veteran-owned attribute.",
        "Service-disabled veteran-owned certification and contracting pathways warrant official-source research.",
      ];
    case "woman_owned_program":
      return [
        "The founder selected a woman-owned attribute.",
        "Woman-owned certification, assistance, and contracting pathways warrant official-source research.",
      ];
    case "minority_owned_program":
      return [
        "The founder selected a minority-owned attribute.",
        "Official underserved-business resources and any applicable certification pathways warrant research.",
      ];
    case "rural_program":
      return [
        "The founder selected a rural-owned attribute.",
        "USDA Rural Development business programs warrant location-specific research.",
      ];
    case "tribal_program":
      return [
        "The founder selected a tribal-owned attribute.",
        "Indian Affairs loan-guarantee resources warrant eligibility and lender research.",
      ];
    case "crowdfunding":
      return [
        "A staged campaign can test community interest without assuming demand.",
        "The founder can compare reward, donation, presale, and regulated securities pathways with professional review where needed.",
      ];
    case "equipment_financing":
      return [
        `The intake lists equipment needs: ${context.input.idea.requiredEquipment.join(", ") || "review the itemized equipment plan"}.`,
        "Separating equipment financing from working capital can make tradeoffs easier to compare.",
      ];
    case "bootstrapping":
      return [
        `The founder reports ${money(context.input.founder.availableStartupCapital)} in available startup capital.`,
        "Staged self-funding can preserve flexibility while the business validates demand.",
      ];
    case "friends_family":
      return [
        "A documented friends-and-family path can be researched as a limited supplementary source.",
        "Written terms make the financial and relationship risks visible.",
      ];
    case "angel_investment":
      return [
        "The founder marked the project as scalable and high-growth.",
        `The strongest recorded proof is ${context.proofTitle}; stronger traction improves the investor case.`,
      ];
    case "venture_capital":
      return [
        "The founder marked the project as scalable and high-growth, and the model appears software, platform, marketplace, subscription, or technology-oriented.",
        "VC belongs on the research list only because the project is framed around venture-suitable growth economics.",
      ];
  }
}

function determineStartupCosts(input: NormalizedFundingEngineInput): number {
  if (input.financialProjection) {
    return roundMoney(
      input.financialProjection.startupCostTable.reduce(
        (total, row) => total + row.amount,
        0,
      ),
    );
  }
  return roundMoney(input.idea.expectedStartupCosts);
}

function fundingGap(input: NormalizedFundingEngineInput): number {
  const financialGap = input.financialProjection?.fundingGap.value;
  if (financialGap !== undefined && financialGap !== null) return financialGap;
  return roundMoney(
    Math.max(
      0,
      determineStartupCosts(input) - input.founder.availableStartupCapital,
    ),
  );
}

function financialProjectionCompleteness(
  input: NormalizedFundingEngineInput,
): number {
  if (!input.financialProjection) return 0;
  const assumptions = input.financialProjection.editableAssumptions;
  if (assumptions.length === 0) return 25;
  const researched = assumptions.filter(
    (assumption) => !assumption.isPlaceholder,
  ).length;
  return clamp(30 + (researched / assumptions.length) * 70);
}

function ownerContributionScore(
  input: NormalizedFundingEngineInput,
  startupCosts: number,
): number {
  if (startupCosts <= 0) return input.founder.availableStartupCapital > 0 ? 35 : 10;
  return clamp((input.founder.availableStartupCapital / startupCosts) * 100);
}

function creditReadinessScore(
  selfAssessment: NormalizedFundingEngineInput["founder"]["creditReadinessSelfAssessment"],
): number {
  return readinessMap(selfAssessment || "unknown", {
    unknown: 15,
    needs_work: 30,
    developing: 60,
    ready: 90,
  });
}

function proofOfConceptScore(input: NormalizedFundingEngineInput): number {
  if (input.feasibilityReport) {
    return input.feasibilityReport.proofOfConceptScore.score;
  }
  if (!input.proofOfConcept) return 0;
  return proofScoreByStage[input.proofOfConcept.stage];
}

function proofOfConceptTitle(input: NormalizedFundingEngineInput): string {
  if (input.feasibilityReport) {
    return input.feasibilityReport.proofOfConceptScore.title.toLowerCase();
  }
  return input.proofOfConcept?.stage.replaceAll("_", " ") ?? "no proof recorded";
}

function hasProofEvidence(input: NormalizedFundingEngineInput): boolean {
  return proofOfConceptScore(input) > proofScoreByStage.idea_only;
}

function revenueEvidenceScore(input: NormalizedFundingEngineInput): number {
  const proof = input.proofOfConcept;
  if (proof?.activeMonthlyRevenue && proof.activeMonthlyRevenue > 0) return 95;
  const stage =
    input.feasibilityReport?.proofOfConceptScore.stage ?? proof?.stage ?? "idea_only";
  return readinessMap(stage, {
    idea_only: 5,
    prototype: 5,
    customer_interview_evidence: 10,
    letter_of_intent: 15,
    beta_customer: 20,
    first_sale: 55,
    repeat_sales: 80,
    purchase_order: 75,
    active_revenue: 95,
  });
}

function revenueEvidenceExplanation(input: NormalizedFundingEngineInput): string {
  const proof = input.proofOfConcept;
  if (proof?.activeMonthlyRevenue && proof.activeMonthlyRevenue > 0) {
    return `Active monthly revenue is recorded at ${money(proof.activeMonthlyRevenue)}.`;
  }
  return `Revenue evidence is inferred conservatively from ${proofOfConceptTitle(input)}.`;
}

function useOfFundsScore(input: NormalizedFundingEngineInput): number {
  if (input.useOfFundsClarity === "clear") return 90;
  if (input.useOfFundsClarity === "developing") return 55;
  if (input.idea.fundingNeed.trim()) return 35;
  return 10;
}

function useOfFundsExplanation(input: NormalizedFundingEngineInput): string {
  if (input.useOfFundsClarity === "clear") {
    return "The use-of-funds schedule is marked clear.";
  }
  if (input.useOfFundsClarity === "developing") {
    return "The use-of-funds schedule is still developing.";
  }
  return input.idea.fundingNeed.trim()
    ? "A funding-need note exists, but an itemized use-of-funds schedule is still needed."
    : "No itemized use-of-funds schedule is recorded.";
}

function scoreConfidence(input: NormalizedFundingEngineInput): number {
  let score = 35;
  if (input.financialProjection) score += 15;
  if (input.businessPlanCompleteness !== undefined) score += 10;
  if (input.marketResearchReport) score += 10;
  if (input.feasibilityReport || input.proofOfConcept) score += 10;
  if (input.collateralReadiness !== "unknown") score += 5;
  if (input.useOfFundsClarity !== "unknown") score += 5;
  if (input.legalEntityReadiness !== "unknown") score += 5;
  return clamp(Math.min(score, 85));
}

function sourcesFromMatch(match: FundingMatch): SourceReference[] {
  const sbaResources = getSBAResourcesForFundingCategory(match.type);
  if (sbaResources.length > 0) {
    return sbaResources.map(sbaResourceToSourceReference);
  }
  const generalSBAFundingResource = /sba/i.test(match.source)
    ? getSBAResourceById("sba-fund-your-business")
    : undefined;
  if (generalSBAFundingResource) {
    return [sbaResourceToSourceReference(generalSBAFundingResource)];
  }
  return [{
    id: `funding-source:${match.source.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
    title: match.opportunityName,
    sourceName: match.source,
    sourceType: "official",
    url: match.url,
    notes:
      "Official starting point for a static VentureForge template. Verify live eligibility, terms, deadlines, and application instructions.",
  }];
}

function uniqueSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.sourceName}:${source.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values: (string | undefined)[]): string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== undefined)),
  ];
}

function readinessMap<Key extends string>(
  key: Key,
  values: Record<Key, number>,
): number {
  return values[key];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: number): string {
  return `$${roundMoney(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
