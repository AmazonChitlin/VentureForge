import type { EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import { withGlobalGuardrails } from "@/engine/shared/guardrails";
import {
  FounderBusinessIntakeSchema,
  IntakeEvaluationSchema,
  type FounderBusinessIntake,
  type IntakeCategory,
  type IntakeCategoryScore,
  type IntakeCompletenessScore,
  type IntakeEvaluation,
} from "@/engine/intake/schema";

type IntakeDraft = {
  founder?: unknown;
  idea?: unknown;
};

type ScoredField = {
  field: string;
  isComplete: boolean;
};

const founderInputSource: SourceReference = {
  id: "founder-intake",
  title: "Founder intake responses",
  sourceName: "VentureForge intake",
  sourceType: "user",
  notes: "User-provided intake information has not been independently verified.",
};

export const IntakeEngine = {
  evaluate(input: IntakeDraft): EngineResult<IntakeEvaluation> {
    const normalized = FounderBusinessIntakeSchema.parse(input);
    const categoryScores = scoreCategories(normalized);
    const missingFields = unique(
      categoryScores.flatMap((category) => category.missingFields),
    );
    const warnings = buildWarnings(normalized);
    const nextBestQuestions = buildNextBestQuestions(normalized);
    const nextActions = buildNextActions(normalized, missingFields);
    const completenessScore = average(
      categoryScores.map((category) => category.score),
    );

    const evaluation = IntakeEvaluationSchema.parse({
      completenessScore,
      categoryScores,
      missingFields,
      nextBestQuestions,
      warnings,
      nextActions,
    });

    return withGlobalGuardrails({
      data: evaluation,
      confidence: completenessScore,
      assumptions: [
        "Intake responses are treated as user-provided planning inputs until verified.",
        "Completeness measures readiness for the next intake conversation, not business quality.",
      ],
      missingInformation: missingFields,
      warnings,
      sources: [founderInputSource],
      nextActions,
    });
  },
};

export type { IntakeCompletenessScore };

function scoreCategories(input: FounderBusinessIntake): IntakeCategoryScore[] {
  const { founder, idea } = input;
  return [
    scoreCategory("idea_clarity", "Idea clarity", [
      text("idea.businessName", idea.businessName),
      text("idea.businessIdea", idea.businessIdea),
      text("idea.productOrService", idea.productOrService),
      text("idea.proposedSolution", idea.proposedSolution),
    ]),
    scoreCategory("customer_clarity", "Customer clarity", [
      text("idea.customerProblem", idea.customerProblem),
      text("idea.targetCustomer", idea.targetCustomer),
    ]),
    scoreCategory("location_clarity", "Location clarity", [
      text("idea.city", idea.city),
      text("idea.county", idea.county),
      text("idea.state", idea.state),
      zip("idea.zipCode", idea.zipCode),
    ]),
    scoreCategory("business_model_clarity", "Business model clarity", [
      text("idea.businessModel", idea.businessModel),
      text("idea.industry", idea.industry),
    ]),
    scoreCategory("financial_clarity", "Financial clarity", [
      positive("founder.availableStartupCapital", founder.availableStartupCapital),
      nonnegativeFunding("founder.desiredFundingAmount", founder.desiredFundingAmount, idea.fundingNeed),
      positive("idea.expectedStartupCosts", idea.expectedStartupCosts),
      text("idea.pricingIdea", idea.pricingIdea),
      text("idea.fundingNeed", idea.fundingNeed),
    ]),
    scoreCategory("founder_fit_clarity", "Founder fit clarity", [
      text("founder.founderName", founder.founderName),
      text("founder.founderExperience", founder.founderExperience),
      list("founder.skills", founder.skills),
      text("founder.industryExperience", founder.industryExperience),
      text(
        "founder.creditReadinessSelfAssessment",
        founder.creditReadinessSelfAssessment,
      ),
      text("founder.riskTolerance", founder.riskTolerance),
      positive("founder.weeklyAvailableHours", founder.weeklyAvailableHours),
      text("founder.launchTimeline", founder.launchTimeline),
    ]),
    scoreCategory("regulatory_clarity", "Regulatory clarity", [
      list("idea.licensingConcerns", idea.licensingConcerns),
      text("idea.staffingPlan", idea.staffingPlan),
    ]),
    scoreCategory("market_research_readiness", "Market research readiness", [
      text("idea.industry", idea.industry),
      text("idea.naicsGuess", idea.naicsGuess),
      list("idea.knownCompetitors", idea.knownCompetitors),
      text("idea.targetCustomer", idea.targetCustomer),
      text("idea.pricingIdea", idea.pricingIdea),
    ]),
  ];
}

function scoreCategory(
  category: IntakeCategory,
  title: string,
  fields: ScoredField[],
): IntakeCategoryScore {
  const completed = fields.filter((field) => field.isComplete).length;
  return {
    category,
    title,
    score: Math.round((completed / fields.length) * 100),
    missingFields: fields
      .filter((field) => !field.isComplete)
      .map((field) => field.field),
  };
}

function buildWarnings(input: FounderBusinessIntake): string[] {
  const { founder, idea } = input;
  return compact([
    !idea.customerProblem
      ? "Customer problem is missing. Clarify the specific pain, friction, or unmet need before advancing."
      : undefined,
    !idea.targetCustomer
      ? "Target customer is missing. Define who experiences the problem first."
      : undefined,
    !idea.city || !idea.county || !idea.state || !isFiveDigitZip(idea.zipCode)
      ? "Location information is incomplete. State and local planning depends on city, county, state, and ZIP code."
      : undefined,
    idea.licensingConcerns.length === 0
      ? "Licensing and permit concerns have not been recorded yet."
      : undefined,
    idea.knownCompetitors.length === 0
      ? "No known competitors or substitutes are recorded yet."
      : undefined,
    founder.creditReadinessSelfAssessment === "" ||
    founder.creditReadinessSelfAssessment === "unknown"
      ? "Credit readiness is unknown. Record a self-assessment before any future debt-readiness review."
      : undefined,
  ]);
}

function buildNextBestQuestions(input: FounderBusinessIntake): string[] {
  const { founder, idea } = input;
  return compact([
    !idea.businessIdea
      ? "What business idea are you considering in plain language?"
      : undefined,
    !idea.customerProblem
      ? "What specific customer problem, inconvenience, or unmet need will the business solve?"
      : undefined,
    !idea.targetCustomer
      ? "Who is the first customer segment you expect to serve?"
      : undefined,
    !idea.city || !idea.county || !idea.state || !isFiveDigitZip(idea.zipCode)
      ? "Where will the business operate? Add the city, county, state, and five-digit ZIP code."
      : undefined,
    !idea.businessModel
      ? "How will the business operate: physical location, online, mobile, home-based, hybrid, franchise, service, product, marketplace, subscription, or manufacturing?"
      : undefined,
    idea.expectedStartupCosts <= 0
      ? "What is the current startup-cost estimate?"
      : undefined,
    !founder.founderExperience
      ? "Which founder experiences are most relevant to this business?"
      : undefined,
    idea.licensingConcerns.length === 0
      ? "Which licensing, permit, zoning, or insurance concerns should be verified?"
      : undefined,
    idea.knownCompetitors.length === 0
      ? "Which direct competitors, indirect competitors, or substitutes do customers use today?"
      : undefined,
  ]).slice(0, 6);
}

function buildNextActions(
  input: FounderBusinessIntake,
  missingFields: string[],
): string[] {
  const actions = [
    missingFields.length > 0
      ? "Answer the highest-priority intake questions."
      : "Review the completed intake for accuracy.",
    !input.idea.customerProblem || !input.idea.targetCustomer
      ? "Clarify the customer problem and first target segment."
      : undefined,
    !input.idea.city ||
    !input.idea.county ||
    !input.idea.state ||
    !isFiveDigitZip(input.idea.zipCode)
      ? "Complete the location details before state or local guidance is requested."
      : undefined,
    input.idea.licensingConcerns.length === 0
      ? "Record initial regulatory concerns for later official verification."
      : undefined,
    input.idea.knownCompetitors.length === 0
      ? "Add known competitors and substitutes for later research."
      : undefined,
    missingFields.length === 0
      ? "Use the reviewed intake as the input to the next engine module."
      : undefined,
  ];
  return unique(compact(actions));
}

function text(field: string, value: string): ScoredField {
  return { field, isComplete: value.trim().length > 0 };
}

function list(field: string, values: string[]): ScoredField {
  return { field, isComplete: values.length > 0 };
}

function positive(field: string, value: number): ScoredField {
  return { field, isComplete: value > 0 };
}

function nonnegativeFunding(
  field: string,
  amount: number,
  fundingNeed: string,
): ScoredField {
  return {
    field,
    isComplete: amount > 0 || fundingNeed.trim().length > 0,
  };
}

function zip(field: string, value: string): ScoredField {
  return { field, isComplete: isFiveDigitZip(value) };
}

function isFiveDigitZip(value: string): boolean {
  return /^\d{5}$/.test(value);
}

function average(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function compact<T>(values: (T | undefined)[]): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
