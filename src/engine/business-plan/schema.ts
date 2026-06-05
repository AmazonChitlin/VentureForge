import { z } from "zod";

import { BusinessConceptSchema } from "@/engine/concept/schema";
import { CompetitorAnalysisSchema } from "@/engine/competitor-analysis/schema";
import { CustomerAnalysisSchema } from "@/engine/customer-analysis/schema";
import { StrategyExecutionPlanSchema } from "@/engine/execution/schema";
import { FeasibilityEvaluationSchema } from "@/engine/feasibility/schema";
import { FinancialProjectionSchema } from "@/engine/financials/schema";
import { FundingMatchResultSchema } from "@/engine/funding/schema";
import {
  BusinessIdeaIntakeSchema,
  FounderIntakeSchema,
} from "@/engine/intake/schema";
import { LaunchRoadmapSchema } from "@/engine/launch-roadmap/schema";
import { MarketResearchReportSchema } from "@/engine/market-research/schema";
import { RiskRegisterSchema } from "@/engine/risk/schema";
import { sourceReferenceSchema } from "@/engine/shared/source-reference";
import { StateLaunchChecklistSchema } from "@/engine/state-programs/schema";
import { StrategicAnalysisSchema } from "@/engine/strategy/schema";

const scoreSchema = z.number().int().min(0).max(100);
const stringListSchema = z.array(z.string().trim().min(1)).default([]);

export const BusinessPlanTypeSchema = z.enum([
  "lean_plan",
  "traditional_plan",
  "sba_lender_style_plan",
  "internal_operating_plan",
  "funding_package",
  "one_page_plan",
]);

export const BusinessPlanSectionKeySchema = z.enum([
  "executive_summary",
  "business_concept",
  "company_description",
  "mission_vision_values",
  "founder_management_team",
  "industry_analysis",
  "market_research",
  "customer_analysis",
  "competitive_analysis",
  "product_service_line",
  "business_model",
  "marketing_sales_plan",
  "operations_process_plan",
  "organization_legal_structure",
  "technology_systems_plan",
  "risk_contingency_plan",
  "growth_plan",
  "funding_request",
  "financial_plan",
  "launch_roadmap",
  "appendix",
]);

export const SectionRegenerateActionSchema = z.enum([
  "generated",
  "regenerated",
  "preserved_locked",
]);

export const SectionRegenerateMetadataSchema = z.object({
  canRegenerate: z.literal(true),
  generationVersion: z.literal("deterministic-v1"),
  lastAction: SectionRegenerateActionSchema,
  regenerationCount: z.number().int().nonnegative(),
  preservedBecauseLocked: z.boolean(),
  consumedEngineOutputs: z.array(z.string()),
  regenerationGuidance: z.string().min(1),
});

export const EditableBusinessPlanSectionSchema = z.object({
  key: BusinessPlanSectionKeySchema,
  title: z.string().min(1),
  narrative: z.string().min(1),
  editableContent: z.string().min(1),
  requiredUserInputs: z.array(z.string()),
  assumptions: z.array(z.string()),
  sourceNotes: z.array(sourceReferenceSchema),
  confidenceScore: scoreSchema,
  missingInformation: z.array(z.string()),
  qualityChecklist: z.array(z.string().min(1)).min(1),
  locked: z.boolean(),
  regenerateMetadata: SectionRegenerateMetadataSchema,
});

export const BusinessPlanInputSchema = z.object({
  founder: FounderIntakeSchema,
  idea: BusinessIdeaIntakeSchema,
  businessConcept: BusinessConceptSchema,
  feasibilityReport: FeasibilityEvaluationSchema.optional(),
  marketResearchReport: MarketResearchReportSchema.optional(),
  customerAnalysis: CustomerAnalysisSchema.optional(),
  competitorAnalysis: CompetitorAnalysisSchema.optional(),
  strategicAnalysis: StrategicAnalysisSchema.optional(),
  executionPlan: StrategyExecutionPlanSchema.optional(),
  financialProjection: FinancialProjectionSchema.optional(),
  fundingMatchResult: FundingMatchResultSchema.optional(),
  stateLaunchChecklist: StateLaunchChecklistSchema.optional(),
  launchRoadmap: LaunchRoadmapSchema.optional(),
  riskRegister: RiskRegisterSchema.optional(),
  missionStatement: z.string().trim().default(""),
  visionStatement: z.string().trim().default(""),
  values: stringListSchema,
  legalStructure: z.string().trim().default(""),
  technologyNotes: stringListSchema,
  supportingDocuments: stringListSchema,
  manualSourceNotes: z.array(sourceReferenceSchema).default([]),
});

export const BusinessPlanSchema = z.object({
  planType: BusinessPlanTypeSchema,
  title: z.string().min(1),
  intendedAudience: z.string().min(1),
  concise: z.boolean(),
  sections: z.array(EditableBusinessPlanSectionSchema).min(1),
  sectionOrder: z.array(BusinessPlanSectionKeySchema).min(1),
  overallConfidence: scoreSchema,
  detailedSupportMaterialPlacement: z.literal("appendix"),
});

export type BusinessPlanType = z.infer<typeof BusinessPlanTypeSchema>;
export type BusinessPlanSectionKey = z.infer<
  typeof BusinessPlanSectionKeySchema
>;
export type SectionRegenerateAction = z.infer<
  typeof SectionRegenerateActionSchema
>;
export type SectionRegenerateMetadata = z.infer<
  typeof SectionRegenerateMetadataSchema
>;
export type EditableBusinessPlanSection = z.infer<
  typeof EditableBusinessPlanSectionSchema
>;
export type BusinessPlanInput = z.input<typeof BusinessPlanInputSchema>;
export type NormalizedBusinessPlanInput = z.output<
  typeof BusinessPlanInputSchema
>;
export type BusinessPlan = z.infer<typeof BusinessPlanSchema>;
