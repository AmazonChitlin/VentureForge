import { z } from "zod";
import { BusinessConceptSchema } from "@/engine/concept/schema";
import {
  BusinessIdeaIntakeSchema,
  FounderIntakeSchema,
} from "@/engine/intake/schema";
import { sourceReferenceSchema } from "@/engine/shared/source-reference";

const draftTextSchema = z.string().trim().default("");
const draftStringListSchema = z.array(z.string().trim().min(1)).default([]);
const scoreSchema = z.number().int().min(0).max(100);
const missingObjectToEmpty = (value: unknown) => value ?? {};

export const ProofOfConceptStageSchema = z.enum([
  "idea_only",
  "prototype",
  "customer_interview_evidence",
  "letter_of_intent",
  "beta_customer",
  "first_sale",
  "repeat_sales",
  "purchase_order",
  "active_revenue",
]);

export const ProofOfConceptEvidenceSchema = z.object({
  stage: ProofOfConceptStageSchema.default("idea_only"),
  prototypeNotes: draftTextSchema,
  customerInterviewCount: z.number().int().nonnegative().default(0),
  letterOfIntentCount: z.number().int().nonnegative().default(0),
  betaCustomerCount: z.number().int().nonnegative().default(0),
  firstSaleCount: z.number().int().nonnegative().default(0),
  repeatCustomerCount: z.number().int().nonnegative().default(0),
  purchaseOrderCount: z.number().int().nonnegative().default(0),
  activeMonthlyRevenue: z.number().finite().nonnegative().default(0),
  notes: draftStringListSchema,
});

export const ProofOfConceptScoreSchema = z.object({
  stage: ProofOfConceptStageSchema,
  title: z.string().min(1),
  score: scoreSchema,
  evidence: z.array(z.string()),
  explanation: z.string().min(1),
});

export const MarketResearchReportSchema = z.object({
  demandScore: scoreSchema.optional(),
  marketSizeScore: scoreSchema.optional(),
  localOpportunityScore: scoreSchema.optional(),
  confidence: scoreSchema.default(0),
  demandSignals: draftStringListSchema,
  missingData: draftStringListSchema,
  sources: z.array(sourceReferenceSchema).default([]),
});

export const CompetitorAnalysisSchema = z.object({
  saturationLevel: z
    .enum(["low", "moderate", "high", "unknown"])
    .default("unknown"),
  differentiationScore: scoreSchema.optional(),
  competitorsIdentified: z.number().int().nonnegative().default(0),
  barriersToEntry: draftStringListSchema,
  notes: draftStringListSchema,
});

export const FinancialAssumptionsSchema = z.object({
  startupCosts: z.number().finite().nonnegative().optional(),
  monthlyRevenue: z.number().finite().nonnegative().optional(),
  monthlyFixedCosts: z.number().finite().nonnegative().optional(),
  variableCostRate: z.number().finite().min(0).max(1).optional(),
  grossMarginPercent: z.number().finite().min(0).max(100).optional(),
  notes: draftStringListSchema,
});

export const FundingReadinessSchema = z.object({
  readinessScore: scoreSchema.optional(),
  financingIdentified: z.boolean().default(false),
  fundingGapCovered: z.boolean().default(false),
  useOfFundsDefined: z.boolean().default(false),
  notes: draftStringListSchema,
});

export const RegulatoryNotesSchema = z.object({
  complexity: z
    .enum(["low", "moderate", "high", "unknown"])
    .default("unknown"),
  permits: draftStringListSchema,
  unresolvedItems: draftStringListSchema,
  highRiskRequirements: draftStringListSchema,
  notes: draftStringListSchema,
});

export const FeasibilityProjectInputSchema = z.object({
  businessConcept: BusinessConceptSchema,
  founder: FounderIntakeSchema,
  idea: BusinessIdeaIntakeSchema,
  marketResearchReport: MarketResearchReportSchema.optional(),
  competitorAnalysis: CompetitorAnalysisSchema.optional(),
  financialAssumptions: FinancialAssumptionsSchema.optional(),
  fundingReadiness: FundingReadinessSchema.optional(),
  regulatoryNotes: RegulatoryNotesSchema.optional(),
  proofOfConcept: z.preprocess(
    missingObjectToEmpty,
    ProofOfConceptEvidenceSchema,
  ),
});

export const FeasibilityCategorySchema = z.enum([
  "customer_need",
  "market_demand",
  "market_size",
  "competitive_saturation",
  "differentiation",
  "founder_fit",
  "startup_cost_feasibility",
  "funding_feasibility",
  "operational_complexity",
  "legal_regulatory_complexity",
  "margin_potential",
  "scalability",
  "proof_of_concept_strength",
  "risk_level",
  "local_opportunity",
]);

export const FeasibilityCategoryScoreSchema = z.object({
  category: FeasibilityCategorySchema,
  title: z.string().min(1),
  score: scoreSchema,
  explanation: z.string().min(1),
  evidence: z.array(z.string()),
  missingInformation: z.array(z.string()),
});

export const FeasibilityRecommendationSchema = z.enum([
  "strong opportunity",
  "promising but needs validation",
  "risky",
  "weak opportunity",
  "insufficient data",
]);

export const FeasibilityEvaluationSchema = z.object({
  totalFeasibilityScore: scoreSchema,
  categoryScores: z.array(FeasibilityCategoryScoreSchema).length(15),
  proofOfConceptScore: ProofOfConceptScoreSchema,
  recommendation: FeasibilityRecommendationSchema,
  topStrengths: z.array(z.string()),
  topWeaknesses: z.array(z.string()),
  criticalAssumptions: z.array(z.string()),
  researchNeeded: z.array(z.string()),
  validationSteps: z.array(z.string()),
  doNotSpendMoneyUntil: z.array(z.string()),
  plainEnglishSummary: z.string().min(1),
});

export const proofOfConceptStageSchema = ProofOfConceptStageSchema;
export const proofOfConceptEvidenceSchema = ProofOfConceptEvidenceSchema;
export const proofOfConceptScoreSchema = ProofOfConceptScoreSchema;
export const marketResearchReportSchema = MarketResearchReportSchema;
export const competitorAnalysisSchema = CompetitorAnalysisSchema;
export const financialAssumptionsSchema = FinancialAssumptionsSchema;
export const fundingReadinessSchema = FundingReadinessSchema;
export const regulatoryNotesSchema = RegulatoryNotesSchema;
export const feasibilityProjectInputSchema = FeasibilityProjectInputSchema;
export const feasibilityCategorySchema = FeasibilityCategorySchema;
export const feasibilityCategoryScoreSchema = FeasibilityCategoryScoreSchema;
export const feasibilityRecommendationSchema = FeasibilityRecommendationSchema;
export const feasibilityEvaluationSchema = FeasibilityEvaluationSchema;

export type ProofOfConceptStage = z.infer<typeof ProofOfConceptStageSchema>;
export type ProofOfConceptEvidence = z.infer<typeof ProofOfConceptEvidenceSchema>;
export type ProofOfConceptScore = z.infer<typeof ProofOfConceptScoreSchema>;
export type MarketResearchReport = z.infer<typeof MarketResearchReportSchema>;
export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;
export type FinancialAssumptions = z.infer<typeof FinancialAssumptionsSchema>;
export type FundingReadiness = z.infer<typeof FundingReadinessSchema>;
export type RegulatoryNotes = z.infer<typeof RegulatoryNotesSchema>;
export type FeasibilityProjectInput = z.infer<typeof FeasibilityProjectInputSchema>;
export type FeasibilityProjectDraftInput = Omit<
  FeasibilityProjectInput,
  "proofOfConcept"
> & {
  proofOfConcept?: Partial<ProofOfConceptEvidence>;
};
export type FeasibilityCategory = z.infer<typeof FeasibilityCategorySchema>;
export type FeasibilityCategoryScore = z.infer<
  typeof FeasibilityCategoryScoreSchema
>;
export type FeasibilityRecommendation = z.infer<
  typeof FeasibilityRecommendationSchema
>;
export type FeasibilityEvaluation = z.infer<typeof FeasibilityEvaluationSchema>;
