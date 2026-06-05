import { engineResultSchema, type EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import type { BusinessIdeaIntake } from "@/engine/intake/schema";
import {
  BusinessConceptInputSchema,
  BusinessConceptSchema,
  type BusinessConcept,
} from "@/engine/concept/schema";
import {
  findMockNaicsMappings,
  suggestNaicsCodes,
} from "@/engine/concept/naics-suggestions";

type BusinessConceptDraft = {
  founder?: unknown;
  idea?: unknown;
  intakeEvaluation?: unknown;
};

type BusinessModel = Exclude<BusinessIdeaIntake["businessModel"], "">;

const founderInputSource: SourceReference = {
  id: "founder-intake",
  title: "Founder intake responses",
  sourceName: "VentureForge intake",
  sourceType: "user",
  notes: "User-provided planning inputs have not been independently verified.",
};

const mockNaicsSource: SourceReference = {
  id: "mock-naics-keyword-mappings",
  title: "Mock NAICS keyword mappings",
  sourceName: "VentureForge concept engine",
  sourceType: "mock",
  notes:
    "Keyword-based NAICS candidates are planning aids only. Confirm the primary business activity against the official Census NAICS reference.",
};

const censusNaicsSource: SourceReference = {
  id: "census-naics-reference",
  title: "North American Industry Classification System",
  sourceName: "U.S. Census Bureau",
  sourceType: "official",
  url: "https://www.census.gov/naics/",
  notes:
    "Use the official Census NAICS search to confirm the final classification before requesting downstream data.",
};

export const BusinessConceptEngine = {
  generate(input: BusinessConceptDraft): EngineResult<BusinessConcept> {
    const { founder, idea, intakeEvaluation } =
      BusinessConceptInputSchema.parse(input);
    const mappings = findMockNaicsMappings(idea);
    const suggestedNaicsCodes = suggestNaicsCodes(idea);
    const primaryProductOrService = orMissing(
      idea.productOrService || idea.businessIdea,
      "The primary product or service still needs definition.",
    );
    const customerProblem = orMissing(
      idea.customerProblem,
      "The customer problem still needs definition.",
    );
    const proposedSolution = orMissing(
      idea.proposedSolution,
      "The proposed solution still needs definition.",
    );
    const targetCustomerSegment = orMissing(
      idea.targetCustomer,
      "The first target customer segment still needs definition.",
    );
    const distributionModel = describeDistribution(idea.businessModel);
    const revenueModel = describeRevenueModel(idea.businessModel, idea.pricingIdea);
    const coreCustomerBenefit = describeCustomerBenefit(
      idea.customerProblem,
      idea.proposedSolution,
    );
    const founderAdvantage = describeFounderAdvantage(founder);
    const differentiator = describeDifferentiator(idea.proposedSolution);
    const proofNeeded = describeProofNeeded(idea.businessModel);
    const assumptions = buildAssumptions(idea, targetCustomerSegment);
    const unknowns = buildUnknowns(
      idea,
      Boolean(
        founder.founderExperience ||
          founder.industryExperience ||
          founder.skills.length > 0,
      ),
      intakeEvaluation,
    );
    const earlyRisks = buildEarlyRisks(idea);
    const confidence = calculateConfidence(input, intakeEvaluation?.completenessScore);
    const warnings = buildWarnings(
      confidence,
      mappings.length > 0,
      Boolean(idea.naicsGuess),
    );
    const nextActions = buildNextActions(idea, suggestedNaicsCodes.length > 0);

    const concept = BusinessConceptSchema.parse({
      businessConceptStatement: [
        `${primaryProductOrService} for ${targetCustomerSegment}.`,
        `The concept aims to deliver ${coreCustomerBenefit} through ${distributionModel}.`,
        `The founder advantage is ${founderAdvantage}.`,
        `Before major spending, the founder needs ${proofNeeded}.`,
      ].join(" "),
      customerProblem,
      proposedSolution,
      primaryProductOrService,
      targetCustomerSegment,
      coreCustomerBenefit,
      distributionModel,
      revenueModel,
      founderAdvantage,
      differentiator,
      assumptions,
      unknowns,
      earlyRisks,
      suggestedNaicsCodes,
      suggestedBusinessType:
        mappings[0]?.businessType ??
        describeBusinessType(idea.businessModel),
      possibleSpinOffProducts: unique(
        mappings.flatMap((mapping) => mapping.spinOffProducts),
      ),
      environmentalOrCommunityImpactNotes: unique(
        mappings.flatMap((mapping) => mapping.impactNotes),
      ),
    });

    return engineResultSchema(BusinessConceptSchema).parse({
      data: concept,
      confidence,
      assumptions,
      missingInformation: unknowns,
      warnings,
      sources: buildSources(mappings.length > 0),
      nextActions,
    });
  },
};

function describeDistribution(model: BusinessModel | ""): string {
  const descriptions: Record<BusinessModel, string> = {
    physical_location: "a physical storefront or facility",
    online: "online channels",
    mobile: "mobile service delivery",
    home_based: "a home-based operating model",
    hybrid: "a combination of in-person and online channels",
    franchise: "a franchise operating model",
    service: "direct service delivery",
    product: "product sales channels that still need definition",
    marketplace: "a marketplace that connects buyers and sellers",
    subscription: "a recurring subscription relationship",
    manufacturing: "production and distribution channels that still need definition",
  };
  return model
    ? descriptions[model]
    : "a distribution method that still needs definition";
}

function describeRevenueModel(model: BusinessModel | "", pricingIdea: string): string {
  const models: Record<BusinessModel, string> = {
    physical_location: "Primarily direct sales from a physical location",
    online: "Primarily online sales",
    mobile: "Primarily mobile service fees",
    home_based: "Primarily direct sales or service fees from a home-based operation",
    hybrid: "A mix of in-person and online sales",
    franchise: "Sales under a franchise model, subject to franchise terms",
    service: "Direct service fees",
    product: "Product sales",
    marketplace: "Marketplace fees or commissions",
    subscription: "Recurring subscription revenue",
    manufacturing: "Sales of manufactured products or contract production",
  };
  const base = model ? models[model] : "The revenue model still needs definition";
  return pricingIdea ? `${base}. Initial pricing idea: ${pricingIdea}.` : `${base}.`;
}

function describeCustomerBenefit(
  customerProblem: string,
  proposedSolution: string,
): string {
  if (proposedSolution && customerProblem) {
    return `${proposedSolution.toLowerCase()} to address ${customerProblem.toLowerCase()}`;
  }
  if (proposedSolution) {
    return proposedSolution.toLowerCase();
  }
  return "a customer benefit that still needs definition";
}

function describeFounderAdvantage(founder: {
  founderExperience: string;
  industryExperience: string;
  skills: string[];
}): string {
  const experience = founder.industryExperience || founder.founderExperience;
  const skills = founder.skills.slice(0, 3).join(", ");
  if (experience && skills) {
    return `${experience}; relevant skills include ${skills}`;
  }
  if (experience) {
    return experience;
  }
  if (skills) {
    return `the founder's stated skills: ${skills}`;
  }
  return "not yet defined; relevant founder experience and skills are missing";
}

function describeDifferentiator(proposedSolution: string): string {
  return proposedSolution
    ? `The initial differentiator is the founder's proposed approach: ${proposedSolution}. It still needs customer validation.`
    : "The differentiator still needs definition and customer validation.";
}

function describeProofNeeded(model: BusinessModel | ""): string {
  if (model === "physical_location") {
    return "customer interviews and a low-cost paid demand test before committing to a lease";
  }
  if (model === "mobile") {
    return "customer interviews and paid pilot bookings before major equipment spending";
  }
  return "customer interviews and a small paid or behavioral demand test";
}

function describeBusinessType(model: BusinessModel | ""): string {
  if (!model) {
    return "Business type still needs definition.";
  }
  return `${model.replaceAll("_", " ")} business`;
}

function buildAssumptions(
  idea: {
    targetCustomer: string;
    customerProblem: string;
    proposedSolution: string;
    pricingIdea: string;
  },
  targetCustomerSegment: string,
): string[] {
  return unique([
    "The concept uses founder-provided intake responses as planning assumptions until verified.",
    "No official market-size, demand, competitor, or pricing data has been added at this stage.",
    idea.targetCustomer
      ? `${targetCustomerSegment} is assumed to be the first customer segment worth testing.`
      : "A first customer segment must be selected before validation.",
    idea.customerProblem
      ? `The stated customer problem is assumed to matter enough for customers to consider a solution: ${idea.customerProblem}.`
      : "The customer problem is not yet known.",
    idea.proposedSolution
      ? `The proposed solution is an early hypothesis: ${idea.proposedSolution}.`
      : "The proposed solution is not yet known.",
    idea.pricingIdea
      ? `The pricing idea is provisional: ${idea.pricingIdea}.`
      : "Pricing has not been tested.",
  ]);
}

function buildUnknowns(
  idea: {
    businessIdea: string;
    productOrService: string;
    customerProblem: string;
    proposedSolution: string;
    targetCustomer: string;
    city: string;
    state: string;
    businessModel: BusinessModel | "";
    pricingIdea: string;
    knownCompetitors: string[];
    licensingConcerns: string[];
  },
  hasFounderAdvantage: boolean,
  intakeEvaluation?: { missingFields: string[] },
): string[] {
  return unique([
    !idea.businessIdea ? "The business idea is missing." : undefined,
    !idea.productOrService
      ? "The primary product or service has not been described."
      : undefined,
    !idea.customerProblem
      ? "The customer problem has not been described."
      : undefined,
    !idea.proposedSolution
      ? "The proposed solution has not been described."
      : undefined,
    !idea.targetCustomer
      ? "The first target customer segment has not been described."
      : undefined,
    !idea.city || !idea.state
      ? "The operating city and state are incomplete."
      : undefined,
    !idea.businessModel
      ? "The distribution and operating model have not been selected."
      : undefined,
    !idea.pricingIdea ? "Pricing and willingness to pay are untested." : undefined,
    idea.knownCompetitors.length === 0
      ? "Competitors and substitutes have not been identified."
      : undefined,
    idea.licensingConcerns.length === 0
      ? "Licensing, permit, zoning, and insurance concerns have not been recorded."
      : undefined,
    !hasFounderAdvantage
      ? "Relevant founder experience has not been described."
      : undefined,
    "Customer demand and willingness to pay have not been validated with paid evidence.",
    "Local demand, competition, and market size remain unverified.",
    "The final NAICS classification remains unverified.",
    ...(intakeEvaluation?.missingFields.map(
      (field) => `The intake evaluation still marks ${field} as incomplete.`,
    ) ?? []),
  ]);
}

function buildEarlyRisks(idea: {
  businessModel: BusinessModel | "";
  pricingIdea: string;
  expectedStartupCosts: number;
  licensingConcerns: string[];
}): string[] {
  return unique([
    "Spending ahead of customer validation could lock the founder into an unproven concept.",
    !idea.pricingIdea || idea.expectedStartupCosts <= 0
      ? "Pricing and startup-cost assumptions may not support sustainable margins."
      : "Pricing and startup-cost assumptions still require validation.",
    idea.licensingConcerns.length === 0
      ? "Unknown licensing, permit, zoning, or insurance requirements could delay launch."
      : "Recorded licensing and permit concerns still require official verification.",
    idea.businessModel === "physical_location"
      ? "A lease or facility commitment made before demand testing could create avoidable fixed-cost risk."
      : undefined,
  ]);
}

function calculateConfidence(
  input: {
    founder?: unknown;
    idea?: unknown;
  },
  intakeCompletenessScore?: number,
): number {
  const { founder, idea } = BusinessConceptInputSchema.pick({
    founder: true,
    idea: true,
  }).parse(input);
  const checks = [
    idea.businessIdea,
    idea.productOrService,
    idea.customerProblem,
    idea.proposedSolution,
    idea.targetCustomer,
    idea.businessModel,
    idea.industry,
    idea.city && idea.state,
    idea.pricingIdea,
    founder.founderExperience ||
      founder.industryExperience ||
      founder.skills.length > 0,
  ];
  const conceptReadiness = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  if (intakeCompletenessScore === undefined) {
    return conceptReadiness;
  }
  return Math.round((conceptReadiness * 3 + intakeCompletenessScore) / 4);
}

function buildWarnings(
  confidence: number,
  hasMockNaicsMappings: boolean,
  hasFounderNaicsGuess: boolean,
): string[] {
  return unique([
    "This concept is AI-free, deterministic planning output based on founder intake. It is not a market-validation result.",
    "No official market data is claimed or fabricated by this module.",
    hasMockNaicsMappings
      ? "NAICS suggestions are keyword-based candidates. Confirm the final classification with the official Census NAICS reference."
      : hasFounderNaicsGuess
        ? "The founder-provided NAICS guess has not been verified. Confirm the final classification with the official Census NAICS reference."
        : "No NAICS keyword match was found. Add industry detail and confirm the final classification with the official Census NAICS reference.",
    confidence < 50
      ? "The concept input is weak. Fill the missing intake details before relying on this summary."
      : undefined,
  ]);
}

function buildNextActions(
  idea: {
    customerProblem: string;
    targetCustomer: string;
    businessModel: BusinessModel | "";
  },
  hasNaicsSuggestions: boolean,
): string[] {
  return unique([
    !idea.customerProblem
      ? "Describe the customer problem in plain language."
      : undefined,
    !idea.targetCustomer
      ? "Choose the first customer segment to interview."
      : undefined,
    !idea.businessModel
      ? "Choose the initial operating and distribution model."
      : undefined,
    hasNaicsSuggestions
      ? "Verify the suggested NAICS candidates against the official Census NAICS reference."
      : "Add industry detail, then search the official Census NAICS reference for candidate classifications.",
    "Run customer interviews and a low-cost demand test before major spending.",
    "Review the structured concept, then pass it to the future feasibility stage.",
  ]);
}

function buildSources(hasMockNaicsMappings: boolean): SourceReference[] {
  return hasMockNaicsMappings
    ? [founderInputSource, mockNaicsSource, censusNaicsSource]
    : [founderInputSource, censusNaicsSource];
}

function orMissing(value: string, missingText: string): string {
  return value || missingText;
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}
