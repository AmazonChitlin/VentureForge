import { engineResultSchema, type EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import {
  CustomerAnalysisInputSchema,
  CustomerAnalysisSchema,
  type CustomerAnalysis,
  type CustomerAnalysisInput,
  type CustomerPersona,
} from "@/engine/customer-analysis/schema";

const intakeSource: SourceReference = {
  id: "customer-analysis-intake",
  title: "Founder business-idea intake",
  sourceName: "VentureForge intake",
  sourceType: "user",
  notes: "Customer hypotheses derived from founder-entered intake require validation.",
};

const conceptSource: SourceReference = {
  id: "customer-analysis-concept",
  title: "Structured business concept",
  sourceName: "VentureForge concept engine",
  sourceType: "manual",
  notes: "Deterministic concept-stage planning output derived from founder intake.",
};

export const CustomerAnalysisEngine = {
  generate(inputDraft: CustomerAnalysisInput): EngineResult<CustomerAnalysis> {
    const input = CustomerAnalysisInputSchema.parse(inputDraft);
    const { idea, businessConcept } = input;
    const target = idea.targetCustomer ||
      "A first target customer segment that still needs definition";
    const channels = channelsForModel(idea.businessModel);
    const pains = unique([
      idea.customerProblem ||
        "The primary customer pain point still needs definition.",
      "The severity, frequency, and urgency of the problem remain unverified.",
    ]);
    const motivations = unique([
      businessConcept.coreCustomerBenefit,
      "A credible solution with clear benefits and low purchasing friction.",
      idea.businessModel === "physical_location"
        ? "A nearby experience that is convenient and easy to trust."
        : undefined,
      idea.businessModel === "mobile"
        ? "Time saved through service delivery at a convenient location."
        : undefined,
    ]);
    const missingInformation = buildMissingInformation(input);
    const warnings = buildWarnings(input);
    const assumptions = buildAssumptions(input);
    const sources = uniqueSources([
      intakeSource,
      conceptSource,
      ...(input.marketResearchReport?.sourcesUsed ?? []),
    ]);
    const nextActions = buildNextActions(input);

    const analysis = CustomerAnalysisSchema.parse({
      primaryCustomerPersona: persona(
        "Primary customer hypothesis",
        target,
        pains,
        motivations,
        channels,
        "user_provided",
      ),
      secondaryCustomerPersonas: secondaryPersonas(input, channels),
      demographicProfile: unique([
        ...(input.marketResearchReport?.customerDemographics ?? []),
        "Demographic characteristics are hypotheses until supported by official data or primary research.",
        `Founder-entered target segment: ${idea.targetCustomer || "not yet defined"}.`,
      ]),
      geographicProfile: [
        `Initial service geography: ${describeGeography(input)}.`,
        "Validate where target customers live, work, shop, travel, or search online.",
      ],
      psychographicProfile: [
        "Estimated hypothesis: urgency, trust, convenience, and price affect adoption.",
        "Estimated hypothesis: customers want to reduce effort and risk when choosing an alternative.",
        "Validate psychographic claims through interviews and observed customer behavior.",
      ],
      buyingMotivations: motivations,
      purchasingPatterns: [
        "Purchasing timing, research behavior, and decision process are not yet verified.",
        `Test how customers currently choose among alternatives for ${idea.productOrService || "the proposed offer"}.`,
      ],
      buyingSensitivity: [
        "Test sensitivity to convenience, trust, urgency, availability, and switching effort.",
        "Do not assume stated interest will translate into a purchase.",
      ],
      priceSensitivity: [
        idea.pricingIdea
          ? `Treat this as an unverified price hypothesis: ${idea.pricingIdea}.`
          : "Define and test an initial price range.",
        "Ask customers to compare the offer with their current alternative and test a real purchase decision.",
      ],
      frequencyOfPurchase: [
        "Purchase frequency is unknown until behavior or primary research is recorded.",
        "Measure first purchase, repeat purchase, referral, and time between purchases where relevant.",
      ],
      customerPainPoints: pains,
      customerJobsToBeDone: [
        `Find a practical way to address: ${idea.customerProblem || "the unresolved customer problem"}.`,
        `Evaluate whether ${idea.productOrService || "the offer"} is credible, convenient, and worth the cost.`,
        "Reduce the effort and risk involved in choosing among alternatives.",
      ],
      customerObjections: unique([
        "The offer may cost more than the customer's current alternative.",
        "The customer may not yet trust a new business.",
        "The problem may not feel urgent enough to solve now.",
        idea.pricingIdea
          ? `The initial pricing idea needs willingness-to-pay testing: ${idea.pricingIdea}.`
          : "Pricing has not been defined or tested.",
      ]),
      channelsWhereCustomersCanBeReached: channels,
      earlyAdopterProfile:
        `Estimated early-adopter hypothesis: ${target} who feel the stated problem strongly, already seek alternatives, and are willing to try ${idea.productOrService || "the proposed offer"}.`,
      customerValidationQuestions: validationQuestions(input),
      surveyQuestions: surveyQuestions(input),
      interviewQuestions: interviewQuestions(input),
      focusGroupPrompts: focusGroupPrompts(input),
      observationalChecklist: observationalChecklist(input),
      landingPageTestCopy: {
        headline: `A clearer way to ${benefitPhrase(input)}`,
        body: `${idea.productOrService || "A focused offer"} for ${target}. ${businessConcept.coreCustomerBenefit}. This message is a test hypothesis.`,
        callToAction: "Tell us what you need",
        evidenceLabel: "estimated",
      },
      offerTestCopy: {
        headline: `Test the first offer for ${target}`,
        body: `${idea.proposedSolution || "A proposed solution"} with pricing and terms to be tested before scaling.`,
        callToAction: "Ask about the pilot offer",
        evidenceLabel: "estimated",
      },
    });

    return engineResultSchema(CustomerAnalysisSchema).parse({
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

function persona(
  name: string,
  segment: string,
  pains: string[],
  motivations: string[],
  channels: string[],
  evidenceLabel: CustomerPersona["evidenceLabel"],
): CustomerPersona {
  return {
    name,
    segment,
    summary: `${segment}. This persona is a planning hypothesis and requires customer validation.`,
    pains,
    motivations,
    channels,
    evidenceLabel,
  };
}

function secondaryPersonas(
  input: CustomerAnalysisInput,
  channels: string[],
): CustomerPersona[] {
  const target = input.idea.targetCustomer || "the first target segment";
  return [
    persona(
      "Adjacent customer hypothesis",
      `Customers adjacent to ${target} who experience the same problem less urgently`,
      [input.idea.customerProblem || "Customer pain point still needs definition."],
      ["A lower-friction or lower-risk version of the core offer."],
      channels,
      "estimated",
    ),
    persona(
      "Referral or influence hypothesis",
      `People or organizations that influence purchases for ${target}`,
      ["They need a credible option they can recommend with confidence."],
      [input.businessConcept.coreCustomerBenefit],
      channels,
      "estimated",
    ),
  ];
}

function validationQuestions(input: CustomerAnalysisInput): string[] {
  return [
    `How often do customers experience: ${input.idea.customerProblem || "the problem under consideration"}?`,
    "What do customers use today instead of the proposed solution?",
    `Which part of ${input.idea.productOrService || "the offer"} is most valuable, and which part is unnecessary?`,
    "What evidence would make customers trust a new provider?",
    "What price range produces a real purchase decision rather than polite interest?",
  ];
}

function surveyQuestions(input: CustomerAnalysisInput): string[] {
  return [
    `How often have you experienced: ${input.idea.customerProblem || "the described problem"}?`,
    "What solution do you use today?",
    "How satisfied are you with your current option, and why?",
    `How interested would you be in testing ${input.idea.productOrService || "the proposed offer"}?`,
    "What would make you decide not to buy?",
    "What is the best way to reach you with an offer like this?",
  ];
}

function interviewQuestions(input: CustomerAnalysisInput): string[] {
  return [
    `Tell me about the last time you experienced: ${input.idea.customerProblem || "the problem"}.`,
    "What did you do next?",
    "Which alternatives did you consider and what did they cost?",
    "What was frustrating about the current solution?",
    `What would you need to see before trying ${input.idea.productOrService || "a new offer"}?`,
    "Would you consider a paid pilot or preorder? Why or why not?",
  ];
}

function focusGroupPrompts(input: CustomerAnalysisInput): string[] {
  return [
    `Discuss how people currently solve: ${input.idea.customerProblem || "the stated problem"}.`,
    "Compare the proposed offer with current alternatives.",
    "Identify the clearest benefit and the least believable claim.",
    "Discuss what feels fair, expensive, or suspicious about the proposed pricing.",
    "List the information needed before making a purchase decision.",
  ];
}

function observationalChecklist(input: CustomerAnalysisInput): string[] {
  return [
    `Observe where and when customers encounter: ${input.idea.customerProblem || "the problem"}.`,
    "Record the current workaround, effort, wait time, and switching friction.",
    "Note which alternatives customers notice, compare, ignore, or abandon.",
    "Record questions customers ask before purchasing.",
    "Do not record personally identifying information without appropriate consent.",
  ];
}

function channelsForModel(model: string): string[] {
  const common = [
    "Customer interviews and referral conversations",
    "Search-friendly landing page with a measurable call to action",
  ];
  const channelMap: Record<string, string[]> = {
    physical_location: ["Local search", "Community partnerships", "Nearby events"],
    online: ["Search", "Relevant online communities", "Email capture"],
    mobile: ["Local search", "Route or event partnerships", "Referral channels"],
    home_based: ["Local search", "Referral channels", "Community partnerships"],
    hybrid: ["Local search", "Online discovery", "Community partnerships"],
    franchise: ["Local search", "Franchise-approved channels", "Referral channels"],
    service: ["Referral channels", "Local search", "Professional partnerships"],
    product: ["Search", "Retail or marketplace channels", "Email capture"],
    marketplace: ["Relevant online communities", "Partnerships", "Search"],
    subscription: ["Search", "Email capture", "Referral channels"],
    manufacturing: ["Direct outreach", "Industry referrals", "Trade associations"],
  };
  return unique([...common, ...(channelMap[model] ?? ["Channel research needed"])]);
}

function buildMissingInformation(input: CustomerAnalysisInput): string[] {
  return unique([
    !input.idea.targetCustomer ? "The first target customer segment is missing." : undefined,
    !input.idea.customerProblem ? "The customer problem is missing." : undefined,
    !input.idea.pricingIdea ? "The pricing hypothesis is missing." : undefined,
    !input.marketResearchReport ? "A market-research report is missing." : undefined,
    "Customer interview evidence is missing.",
    "Observed purchasing behavior and willingness-to-pay evidence are missing.",
    "Validated purchase frequency is missing.",
  ]);
}

function buildWarnings(input: CustomerAnalysisInput): string[] {
  return unique([
    "Customer personas and channel recommendations are planning hypotheses, not verified customer facts.",
    "Do not treat survey interest as proof of purchase behavior.",
    input.marketResearchReport?.containsMockData
      ? "The market-research input contains mock data. Replace placeholders before relying on demographic or geographic claims."
      : undefined,
  ]);
}

function buildAssumptions(input: CustomerAnalysisInput): string[] {
  return unique([
    ...input.businessConcept.assumptions,
    `${input.idea.targetCustomer || "The target segment"} is treated as the first segment to test, not a proven market.`,
    "Customer motivations, objections, channels, and frequency are hypotheses until primary research is recorded.",
  ]);
}

function buildNextActions(input: CustomerAnalysisInput): string[] {
  return unique([
    !input.idea.targetCustomer ? "Define the first target customer segment." : undefined,
    "Interview target customers using the generated guide.",
    "Run a low-cost landing-page or offer test with a measurable call to action.",
    "Record objections, current alternatives, willingness to pay, and observed behavior.",
    input.marketResearchReport?.containsMockData
      ? "Replace mock demographic placeholders with official or primary research."
      : undefined,
  ]);
}

function calculateConfidence(input: CustomerAnalysisInput): number {
  let score = 25;
  if (input.idea.targetCustomer) score += 15;
  if (input.idea.customerProblem) score += 10;
  if (input.idea.proposedSolution) score += 5;
  if (input.idea.city && input.idea.state) score += 5;
  if (input.marketResearchReport) score += 15;
  if (input.marketResearchReport?.sourcesUsed.length) score += 5;
  if (input.marketResearchReport && !input.marketResearchReport.containsMockData) {
    score += 10;
  }
  return clamp(score);
}

function describeGeography(input: CustomerAnalysisInput): string {
  const { city, county, state, zipCode } = input.idea;
  return [city, county, state, zipCode].filter(Boolean).join(", ") ||
    "not yet defined";
}

function benefitPhrase(input: CustomerAnalysisInput): string {
  return input.idea.customerProblem
    ? `solve ${input.idea.customerProblem.toLowerCase()}`
    : "test whether this offer solves a real customer problem";
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
