import {
  BusinessIdeaIntakeSchema,
  FounderBusinessIntakeSchema,
  FounderIntakeSchema,
  type FounderBusinessIntake,
} from "@/engine/intake/schema";
import {
  FinancialEngineInputSchema,
  type FinancialEngineInput,
} from "@/engine/financials/schema";
import type { StateProgramProjectInput } from "@/engine/state-programs/schema";
import {
  GuidedAnswerSchema,
  type GuidedAnswer,
  type GuidedAnswerValue,
  type GuidedStepId,
} from "@/engine/guided-builder/schema";

export interface GuidedFundingPreferences {
  needsOutsideMoney: boolean | null;
  desiredAmount: number;
  preferredPaths: string[];
  comfortableUsingCreditOrCollateral: boolean | null;
  matchFounderPrograms: boolean | null;
}

export interface GuidedAnswerMapping {
  intake: FounderBusinessIntake;
  financialAssumptions: FinancialEngineInput;
  stateProgramInput: StateProgramProjectInput;
  fundingPreferences: GuidedFundingPreferences;
  rawAnswers: Record<string, GuidedAnswer>;
  fieldMappings: Record<string, string[]>;
  inferredHints: {
    industry: string;
    targetCustomerHint: string;
    locationHint: string;
    possibleRevenueStreams: string[];
    possibleDifferentiators: string[];
  };
}

const FIELD_MAPPINGS: Record<string, string[]> = {
  businessIdea: ["idea.businessIdea", "idea.industry"],
  targetCustomer: ["idea.targetCustomer", "customer.earlyAdopterProfile"],
  businessModel: ["idea.businessModel"],
  city: ["idea.city"],
  county: ["idea.county"],
  state: ["idea.state"],
  zipCode: ["idea.zipCode"],
  productOrService: ["idea.productOrService"],
  customerProblem: ["idea.customerProblem"],
  differentiator: ["idea.proposedSolution", "concept.differentiator"],
  knownCompetitors: ["idea.knownCompetitors"],
  equipmentCost: ["financial.equipment"],
  inventoryCost: ["financial.inventory"],
  startupSpaceCost: ["financial.startupCosts"],
  otherStartupCost: ["financial.startupCosts"],
  monthlyRent: ["financial.rent"],
  pricePerSale: ["idea.pricingIdea", "financial.pricePerUnitService"],
  weeklySales: ["financial.expectedUnitSales"],
  availableStartupCapital: ["founder.availableStartupCapital"],
  desiredFundingAmount: ["founder.desiredFundingAmount"],
  fundingPreference: ["funding.preferredPaths"],
  comfortableUsingCreditOrCollateral: ["funding.creditOrCollateral"],
  matchFounderPrograms: ["funding.matchFounderPrograms"],
  regulatedActivities: ["idea.licensingConcerns"],
  hasEmployees: ["idea.staffingPlan", "state.hasEmployees"],
  sellsTaxableGoodsOrServices: ["state.sellsTaxableGoodsOrServices"],
  customersVisitLocation: ["state.physicalLocation"],
  founderExperience: ["founder.founderExperience"],
  weeklyAvailableHours: ["founder.weeklyAvailableHours"],
};

export const GuidedAnswerMapper = {
  createAnswer(
    field: string,
    stepId: GuidedStepId,
    rawValue: GuidedAnswerValue,
    options?: { isUnsure?: boolean; updatedAt?: string },
  ): GuidedAnswer {
    const isUnsure = options?.isUnsure ?? rawValue === null;
    return GuidedAnswerSchema.parse({
      field,
      stepId,
      rawValue,
      structuredValue: isUnsure ? null : normalizeValue(rawValue),
      isUnsure,
      updatedAt: options?.updatedAt ?? new Date().toISOString(),
    });
  },

  mapAnswers(answers: Record<string, GuidedAnswer>): GuidedAnswerMapping {
    const parsedAnswers = Object.fromEntries(
      Object.entries(answers)
        .map(([field, answer]) => {
          const parsed = GuidedAnswerSchema.safeParse(answer);
          return parsed.success ? [field, parsed.data] : undefined;
        })
        .filter((entry): entry is [string, GuidedAnswer] => Boolean(entry)),
    );
    const ideaDescription = textValue(parsedAnswers, "businessIdea");
    const hints = inferHints(ideaDescription);
    const startupCosts = sum([
      numberValue(parsedAnswers, "startupSpaceCost"),
      numberValue(parsedAnswers, "equipmentCost"),
      numberValue(parsedAnswers, "inventoryCost"),
      numberValue(parsedAnswers, "otherStartupCost"),
    ]);
    const hasEmployees = booleanValue(parsedAnswers, "hasEmployees");
    const desiredFundingAmount = numberValue(
      parsedAnswers,
      "desiredFundingAmount",
    );
    const pricePerSale = numberValue(parsedAnswers, "pricePerSale");
    const weeklySales = numberValue(parsedAnswers, "weeklySales");
    const regulatedActivities = listValue(parsedAnswers, "regulatedActivities");

    const founder = parseFounderDraft({
      founderName: textValue(parsedAnswers, "founderName"),
      founderExperience: textValue(parsedAnswers, "founderExperience"),
      skills: listValue(parsedAnswers, "skills"),
      industryExperience: textValue(parsedAnswers, "industryExperience"),
      availableStartupCapital: numberValue(
        parsedAnswers,
        "availableStartupCapital",
      ),
      desiredFundingAmount,
      creditReadinessSelfAssessment: textValue(
        parsedAnswers,
        "creditReadinessSelfAssessment",
      ),
      riskTolerance: textValue(parsedAnswers, "riskTolerance"),
      weeklyAvailableHours: numberValue(parsedAnswers, "weeklyAvailableHours"),
      launchTimeline: textValue(parsedAnswers, "launchTimeline"),
      ownershipAttributes: ownershipAttributes(parsedAnswers),
    });

    const businessModel = textValue(parsedAnswers, "businessModel");
    const productOrService =
      textValue(parsedAnswers, "productOrService") ||
      hints.possibleRevenueStreams.join(", ");
    const idea = parseBusinessIdeaDraft({
      businessName: textValue(parsedAnswers, "businessName"),
      businessIdea: ideaDescription,
      productOrService,
      customerProblem: textValue(parsedAnswers, "customerProblem"),
      proposedSolution: textValue(parsedAnswers, "differentiator"),
      targetCustomer:
        textValue(parsedAnswers, "targetCustomer") || hints.targetCustomerHint,
      city: textValue(parsedAnswers, "city") || hints.city,
      county: textValue(parsedAnswers, "county"),
      state: stateForIntake(textValue(parsedAnswers, "state") || hints.state),
      zipCode: zipCodeForIntake(textValue(parsedAnswers, "zipCode")),
      businessModel: businessModelForIntake(businessModel),
      industry: textValue(parsedAnswers, "industry") || hints.industry,
      naicsGuess: textValue(parsedAnswers, "naicsGuess"),
      knownCompetitors: splitOrList(parsedAnswers, "knownCompetitors"),
      pricingIdea: pricePerSale > 0 ? `$${pricePerSale} per normal sale` : "",
      expectedStartupCosts: startupCosts,
      staffingPlan:
        hasEmployees === true
          ? "Plans to hire employees or staff."
          : hasEmployees === false
            ? "Founder-only at launch; no employees planned yet."
            : "",
      requiredEquipment: listValue(parsedAnswers, "requiredEquipment"),
      licensingConcerns: regulatedActivities,
      fundingNeed:
        desiredFundingAmount > 0
          ? `Founder estimates a need for $${desiredFundingAmount} in outside funding.`
          : "",
      websiteNeeds: textValue(parsedAnswers, "websiteTone")
        ? `Starter website with a ${textValue(parsedAnswers, "websiteTone")} tone.`
        : "",
    });
    const intake = parseFounderBusinessDraft({ founder, idea });

    const financialAssumptions = parseFinancialDraft({
      startupCosts: valueOrUndefined(startupCosts),
      equipment: valueOrUndefined(numberValue(parsedAnswers, "equipmentCost")),
      inventory: valueOrUndefined(numberValue(parsedAnswers, "inventoryCost")),
      rent: valueOrUndefined(numberValue(parsedAnswers, "monthlyRent")),
      pricePerUnitService: valueOrUndefined(pricePerSale),
      expectedUnitSales: valueOrUndefined(weeklySales * 4),
      availableOwnerCapital: valueOrUndefined(
        founder.availableStartupCapital,
      ),
      openingCash: valueOrUndefined(founder.availableStartupCapital),
    });

    const fundingPreferences: GuidedFundingPreferences = {
      needsOutsideMoney:
        desiredFundingAmount > 0
          ? true
          : booleanValue(parsedAnswers, "needsOutsideMoney"),
      desiredAmount: desiredFundingAmount,
      preferredPaths: listValue(parsedAnswers, "fundingPreference"),
      comfortableUsingCreditOrCollateral: booleanValue(
        parsedAnswers,
        "comfortableUsingCreditOrCollateral",
      ),
      matchFounderPrograms: booleanValue(parsedAnswers, "matchFounderPrograms"),
    };

    return {
      intake,
      financialAssumptions,
      stateProgramInput: {
        founder,
        idea,
        hasEmployees: optionalBoolean(hasEmployees),
        sellsTaxableGoodsOrServices: optionalBoolean(
          booleanValue(parsedAnswers, "sellsTaxableGoodsOrServices"),
        ),
      },
      fundingPreferences,
      rawAnswers: parsedAnswers,
      fieldMappings: FIELD_MAPPINGS,
      inferredHints: {
        industry: hints.industry,
        targetCustomerHint: hints.targetCustomerHint,
        locationHint: [hints.city, hints.state].filter(Boolean).join(", "),
        possibleRevenueStreams: hints.possibleRevenueStreams,
        possibleDifferentiators: hints.possibleDifferentiators,
      },
    };
  },
};

function inferHints(description: string) {
  const normalized = description.toLowerCase();
  const recordStore = /record|vinyl|music store/.test(normalized);
  const foodTruck = /food truck|mobile food|street food/.test(normalized);
  const detailing = /detail|car wash|auto clean/.test(normalized);
  const childcare = /childcare|daycare|child care/.test(normalized);
  const ecommerce = /ecommerce|e-commerce|online shop|online store/.test(
    normalized,
  );
  const consulting = /consult|advisory|bookkeep/.test(normalized);
  const manufacturing = /manufactur|fabricat|machine shop/.test(normalized);

  const match = [
    recordStore && {
      industry: "Retail record store",
      streams: ["records", "shirts", "local art"],
      customer: /asu|college|student/.test(normalized)
        ? "College students and local music fans near ASU"
        : "Local music fans and record collectors",
      differences: ["curated music selection", "local artist merchandise"],
    },
    foodTruck && {
      industry: "Mobile food service",
      streams: ["prepared food", "drinks"],
      customer: "Local customers looking for convenient prepared food",
      differences: ["mobile convenience", "focused menu"],
    },
    detailing && {
      industry: "Mobile automotive detailing",
      streams: ["detailing packages", "add-on cleaning services"],
      customer: "Busy vehicle owners who value mobile convenience",
      differences: ["service at the customer location"],
    },
    childcare && {
      industry: "Childcare services",
      streams: ["childcare enrollment"],
      customer: "Families seeking reliable childcare",
      differences: ["care model still needs definition"],
    },
    ecommerce && {
      industry: "E-commerce retail",
      streams: ["online product sales"],
      customer: "Online shoppers in the first target niche",
      differences: ["online convenience"],
    },
    consulting && {
      industry: "Professional consulting services",
      streams: ["service packages", "project fees"],
      customer: "Small businesses needing specialized help",
      differences: ["specialized founder expertise"],
    },
    manufacturing && {
      industry: "Small manufacturing",
      streams: ["manufactured products", "contract production"],
      customer: "Businesses or buyers needing the manufactured product",
      differences: ["production capability"],
    },
  ].find(
    (
      candidate,
    ): candidate is {
      industry: string;
      streams: string[];
      customer: string;
      differences: string[];
    } => Boolean(candidate),
  );

  return {
    industry: match?.industry ?? "",
    targetCustomerHint: match?.customer ?? "",
    city: /tempe|asu/.test(normalized) ? "Tempe" : "",
    state: /tempe|asu|phoenix|arizona/.test(normalized) ? "AZ" : "",
    possibleRevenueStreams: match?.streams ?? [],
    possibleDifferentiators: match?.differences ?? [],
  };
}

function answerValue(
  answers: Record<string, GuidedAnswer>,
  field: string,
): GuidedAnswerValue {
  const answer = answers[field];
  return answer?.isUnsure ? null : answer?.structuredValue ?? null;
}

function textValue(answers: Record<string, GuidedAnswer>, field: string): string {
  const value = answerValue(answers, field);
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(
  answers: Record<string, GuidedAnswer>,
  field: string,
): number {
  const value = answerValue(answers, field);
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  if (typeof value === "string" && value.trim()) {
    const number = Number(value.replaceAll(/[$,\s]/g, ""));
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }
  return 0;
}

function booleanValue(
  answers: Record<string, GuidedAnswer>,
  field: string,
): boolean | null {
  const value = answerValue(answers, field);
  return typeof value === "boolean" ? value : null;
}

function listValue(
  answers: Record<string, GuidedAnswer>,
  field: string,
): string[] {
  const value = answerValue(answers, field);
  return Array.isArray(value)
    ? value.map((entry) => entry.trim()).filter(Boolean)
    : [];
}

function splitOrList(
  answers: Record<string, GuidedAnswer>,
  field: string,
): string[] {
  const list = listValue(answers, field);
  if (list.length > 0) {
    return list;
  }
  return textValue(answers, field)
    .split(/,|\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeValue(value: GuidedAnswerValue): GuidedAnswerValue {
  // Preserve the exact text while the user is typing. Engine-facing mappings
  // trim later through textValue(), but controlled inputs need trailing spaces
  // to remain intact so normal multi-word typing works.
  return value;
}

function zipCodeForIntake(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 5);
  return /^\d{5}$/.test(digits) ? digits : "";
}

function stateForIntake(value: string): string {
  const stateCode = value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(stateCode) ? stateCode : "";
}

function businessModelForIntake(value: string): string {
  const parsed = BusinessIdeaIntakeSchema.shape.businessModel.safeParse(value);
  return parsed.success ? parsed.data : "";
}

function parseFounderDraft(input: unknown) {
  const parsed = FounderIntakeSchema.safeParse(input);
  return parsed.success ? parsed.data : FounderIntakeSchema.parse({});
}

function parseBusinessIdeaDraft(input: unknown) {
  const parsed = BusinessIdeaIntakeSchema.safeParse(input);
  return parsed.success ? parsed.data : BusinessIdeaIntakeSchema.parse({});
}

function parseFounderBusinessDraft(input: unknown) {
  const parsed = FounderBusinessIntakeSchema.safeParse(input);
  return parsed.success ? parsed.data : FounderBusinessIntakeSchema.parse({});
}

function parseFinancialDraft(input: unknown) {
  const parsed = FinancialEngineInputSchema.safeParse(input);
  return parsed.success ? parsed.data : FinancialEngineInputSchema.parse({});
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function valueOrUndefined(value: number): number | undefined {
  return value > 0 ? value : undefined;
}

function optionalBoolean(value: boolean | null): boolean | undefined {
  return value === null ? undefined : value;
}

function ownershipAttributes(answers: Record<string, GuidedAnswer>) {
  const values = listValue(answers, "ownershipAttributes");
  return {
    veteranOwned: values.includes("veteranOwned"),
    disabledVeteranOwned: values.includes("disabledVeteranOwned"),
    womanOwned: values.includes("womanOwned"),
    minorityOwned: values.includes("minorityOwned"),
    ruralOwned: values.includes("ruralOwned"),
    tribalOwned: values.includes("tribalOwned"),
    immigrantOwned: values.includes("immigrantOwned"),
    justiceImpactedFounder: values.includes("justiceImpactedFounder"),
    studentFounder: values.includes("studentFounder"),
    seniorFounder: values.includes("seniorFounder"),
  };
}
