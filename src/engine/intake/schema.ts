import { z } from "zod";

const draftTextSchema = z.string().trim().default("");
const draftStringListSchema = z.array(z.string().trim().min(1)).default([]);
const draftMoneySchema = z.number().finite().nonnegative().default(0);
const missingObjectToEmpty = (value: unknown) => value ?? {};

export const OwnershipAttributesSchema = z.object({
  veteranOwned: z.boolean().default(false),
  disabledVeteranOwned: z.boolean().default(false),
  womanOwned: z.boolean().default(false),
  minorityOwned: z.boolean().default(false),
  ruralOwned: z.boolean().default(false),
  tribalOwned: z.boolean().default(false),
  immigrantOwned: z.boolean().default(false),
  justiceImpactedFounder: z.boolean().default(false),
  studentFounder: z.boolean().default(false),
  seniorFounder: z.boolean().default(false),
});

export const CreditReadinessSelfAssessmentSchema = z.enum([
  "unknown",
  "needs_work",
  "developing",
  "ready",
]);

export const RiskToleranceSchema = z.enum([
  "conservative",
  "moderate",
  "growth_oriented",
]);

export const BusinessModelSchema = z.enum([
  "physical_location",
  "online",
  "mobile",
  "home_based",
  "hybrid",
  "franchise",
  "service",
  "product",
  "marketplace",
  "subscription",
  "manufacturing",
]);

export const FounderIntakeSchema = z.object({
  founderName: draftTextSchema,
  founderExperience: draftTextSchema,
  skills: draftStringListSchema,
  industryExperience: draftTextSchema,
  availableStartupCapital: draftMoneySchema,
  desiredFundingAmount: draftMoneySchema,
  creditReadinessSelfAssessment: z
    .union([CreditReadinessSelfAssessmentSchema, z.literal("")])
    .default(""),
  riskTolerance: z.union([RiskToleranceSchema, z.literal("")]).default(""),
  weeklyAvailableHours: z.number().int().nonnegative().default(0),
  launchTimeline: draftTextSchema,
  ownershipAttributes: z.preprocess(
    missingObjectToEmpty,
    OwnershipAttributesSchema,
  ),
});

export const BusinessIdeaIntakeSchema = z.object({
  businessName: draftTextSchema,
  businessIdea: draftTextSchema,
  productOrService: draftTextSchema,
  customerProblem: draftTextSchema,
  proposedSolution: draftTextSchema,
  targetCustomer: draftTextSchema,
  city: draftTextSchema,
  county: draftTextSchema,
  state: z
    .union([
      z
        .string()
        .trim()
        .regex(/^[A-Za-z]{2}$/)
        .transform((value) => value.toUpperCase()),
      z.literal(""),
    ])
    .default(""),
  zipCode: z.union([z.string().regex(/^\d{5}$/), z.literal("")]).default(""),
  businessModel: z.union([BusinessModelSchema, z.literal("")]).default(""),
  industry: draftTextSchema,
  naicsGuess: draftTextSchema,
  knownCompetitors: draftStringListSchema,
  pricingIdea: draftTextSchema,
  expectedStartupCosts: draftMoneySchema,
  staffingPlan: draftTextSchema,
  requiredEquipment: draftStringListSchema,
  licensingConcerns: draftStringListSchema,
  fundingNeed: draftTextSchema,
  websiteNeeds: draftTextSchema,
});

export const FounderBusinessIntakeSchema = z.object({
  founder: z.preprocess(missingObjectToEmpty, FounderIntakeSchema),
  idea: z.preprocess(missingObjectToEmpty, BusinessIdeaIntakeSchema),
});

export const IntakeCategorySchema = z.enum([
  "idea_clarity",
  "customer_clarity",
  "location_clarity",
  "business_model_clarity",
  "financial_clarity",
  "founder_fit_clarity",
  "regulatory_clarity",
  "market_research_readiness",
]);

export const IntakeCategoryScoreSchema = z.object({
  category: IntakeCategorySchema,
  title: z.string().min(1),
  score: z.number().int().min(0).max(100),
  missingFields: z.array(z.string()),
});

export const IntakeCompletenessScoreSchema = z.object({
  completenessScore: z.number().int().min(0).max(100),
  categoryScores: z.array(IntakeCategoryScoreSchema).length(8),
});

export const IntakeEvaluationSchema = IntakeCompletenessScoreSchema.extend({
  missingFields: z.array(z.string()),
  nextBestQuestions: z.array(z.string()),
  warnings: z.array(z.string()),
  nextActions: z.array(z.string()),
});

export const ownershipAttributesSchema = OwnershipAttributesSchema;
export const creditReadinessSelfAssessmentSchema =
  CreditReadinessSelfAssessmentSchema;
export const riskToleranceSchema = RiskToleranceSchema;
export const businessModelSchema = BusinessModelSchema;
export const founderIntakeSchema = FounderIntakeSchema;
export const businessIdeaIntakeSchema = BusinessIdeaIntakeSchema;
export const founderBusinessIntakeSchema = FounderBusinessIntakeSchema;
export const intakeEvaluationSchema = IntakeEvaluationSchema;

export type OwnershipAttributes = z.infer<typeof OwnershipAttributesSchema>;
export type FounderIntake = z.infer<typeof FounderIntakeSchema>;
export type BusinessIdeaIntake = z.infer<typeof BusinessIdeaIntakeSchema>;
export type FounderBusinessIntake = z.infer<typeof FounderBusinessIntakeSchema>;
export type IntakeCategory = z.infer<typeof IntakeCategorySchema>;
export type IntakeCategoryScore = z.infer<typeof IntakeCategoryScoreSchema>;
export type IntakeCompletenessScore = z.infer<
  typeof IntakeCompletenessScoreSchema
>;
export type IntakeEvaluation = z.infer<typeof IntakeEvaluationSchema>;
