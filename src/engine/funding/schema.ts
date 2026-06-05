import { z } from "zod";

import { BusinessConceptSchema } from "@/engine/concept/schema";
import {
  FeasibilityEvaluationSchema,
  ProofOfConceptEvidenceSchema,
} from "@/engine/feasibility/schema";
import { FinancialProjectionSchema } from "@/engine/financials/schema";
import {
  BusinessIdeaIntakeSchema,
  FounderIntakeSchema,
} from "@/engine/intake/schema";
import { MarketResearchReportSchema } from "@/engine/market-research/schema";

const scoreSchema = z.number().int().min(0).max(100);

export const FundingCategorySchema = z.enum([
  "sba_7a",
  "sba_504",
  "sba_microloan",
  "sba_lender_match",
  "cdfi_loan",
  "local_community_bank",
  "credit_union",
  "state_grant",
  "local_economic_development_incentive",
  "grants_gov",
  "sam_gov_contracting_pathway",
  "sbir_sttr",
  "veteran_owned_program",
  "disabled_veteran_owned_program",
  "woman_owned_program",
  "minority_owned_program",
  "rural_program",
  "tribal_program",
  "crowdfunding",
  "equipment_financing",
  "bootstrapping",
  "friends_family",
  "angel_investment",
  "venture_capital",
]);

export const FundingProgramNatureSchema = z.enum([
  "loan",
  "lender_referral",
  "grant_search",
  "incentive_search",
  "contracting_pathway",
  "research_award",
  "equity",
  "self_funding",
  "community_funding",
]);

export const CollateralReadinessSchema = z.enum([
  "unknown",
  "none",
  "partial",
  "ready",
]);

export const UseOfFundsClaritySchema = z.enum([
  "unknown",
  "developing",
  "clear",
]);

export const LegalEntityReadinessSchema = z.enum([
  "unknown",
  "not_started",
  "developing",
  "registered",
]);

export const FundingReadinessCategorySchema = z.enum([
  "business_plan_completeness",
  "financial_projection_completeness",
  "owner_contribution",
  "credit_readiness_self_assessment",
  "collateral_readiness",
  "proof_of_concept",
  "revenue_evidence",
  "market_research_quality",
  "use_of_funds_clarity",
  "legal_entity_readiness",
]);

export const FundingEngineInputSchema = z.object({
  founder: FounderIntakeSchema,
  idea: BusinessIdeaIntakeSchema,
  businessConcept: BusinessConceptSchema.optional(),
  feasibilityReport: FeasibilityEvaluationSchema.optional(),
  proofOfConcept: ProofOfConceptEvidenceSchema.optional(),
  financialProjection: FinancialProjectionSchema.optional(),
  marketResearchReport: MarketResearchReportSchema.optional(),
  businessPlanCompleteness: scoreSchema.optional(),
  collateralReadiness: CollateralReadinessSchema.default("unknown"),
  useOfFundsClarity: UseOfFundsClaritySchema.default("unknown"),
  legalEntityReadiness: LegalEntityReadinessSchema.default("unknown"),
  scalableHighGrowth: z.boolean().default(false),
  technologyResearchAndDevelopment: z.boolean().default(false),
  federalContractingInterest: z.boolean().default(false),
});

export const FundingReadinessCategoryScoreSchema = z.object({
  category: FundingReadinessCategorySchema,
  title: z.string().min(1),
  score: scoreSchema,
  explanation: z.string().min(1),
  missingInformation: z.array(z.string()),
});

export const FundingReadinessScoreSchema = z.object({
  score: scoreSchema,
  level: z.enum(["early", "developing", "application_ready"]),
  categoryScores: z.array(FundingReadinessCategoryScoreSchema).length(10),
  explanation: z.string().min(1),
});

export const FundingMatchSchema = z.object({
  id: z.string().min(1),
  opportunityName: z.string().min(1),
  type: FundingCategorySchema,
  programNature: FundingProgramNatureSchema,
  source: z.string().min(1),
  url: z.url(),
  eligibilityTags: z.array(z.string()),
  matchScore: scoreSchema,
  whyItFits: z.array(z.string().min(1)).min(1),
  whyItMayNotFit: z.array(z.string().min(1)).min(1),
  documentsNeeded: z.array(z.string().min(1)).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  deadline: z.string().min(1),
  amountRange: z.string().min(1),
  riskNotes: z.array(z.string().min(1)).min(1),
  officialSourceRequired: z.boolean(),
  isTemplate: z.boolean(),
  verificationStatus: z.literal("template_requires_verification"),
});

export const FundingMatchResultSchema = z.object({
  fundingReadinessScore: FundingReadinessScoreSchema,
  estimatedFundingGap: z.number().finite().nonnegative(),
  matches: z.array(FundingMatchSchema),
  priorityMatches: z.array(FundingMatchSchema).max(5),
  documentsToPrepare: z.array(z.string()),
  verificationReminder: z.string().min(1),
});

export type FundingCategory = z.infer<typeof FundingCategorySchema>;
export type FundingProgramNature = z.infer<typeof FundingProgramNatureSchema>;
export type CollateralReadiness = z.infer<typeof CollateralReadinessSchema>;
export type UseOfFundsClarity = z.infer<typeof UseOfFundsClaritySchema>;
export type LegalEntityReadiness = z.infer<typeof LegalEntityReadinessSchema>;
export type FundingEngineInput = z.input<typeof FundingEngineInputSchema>;
export type NormalizedFundingEngineInput = z.output<
  typeof FundingEngineInputSchema
>;
export type FundingReadinessCategory = z.infer<
  typeof FundingReadinessCategorySchema
>;
export type FundingReadinessCategoryScore = z.infer<
  typeof FundingReadinessCategoryScoreSchema
>;
export type FundingReadinessScore = z.infer<typeof FundingReadinessScoreSchema>;
export type FundingMatch = z.infer<typeof FundingMatchSchema>;
export type FundingMatchResult = z.infer<typeof FundingMatchResultSchema>;
