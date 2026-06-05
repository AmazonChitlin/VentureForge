import { z } from "zod";
import { BusinessConceptSchema } from "@/engine/concept/schema";
import { CompetitorAnalysisSchema } from "@/engine/competitor-analysis/schema";
import { CustomerAnalysisSchema } from "@/engine/customer-analysis/schema";
import { FeasibilityEvaluationSchema } from "@/engine/feasibility/schema";
import { FounderIntakeSchema } from "@/engine/intake/schema";
import { MarketResearchReportSchema } from "@/engine/market-research/schema";

const stringListSchema = z.array(z.string().trim().min(1)).default([]);

export const StrategyRecommendationSchema = z.object({
  recommendation: z.string().min(1),
  reasoning: z.string().min(1),
});

export const SWOTAnalysisSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  threats: z.array(z.string()),
  actionsToUseStrengths: z.array(z.string()),
  actionsToFixWeaknesses: z.array(z.string()),
  actionsToCaptureOpportunities: z.array(z.string()),
  actionsToReduceThreats: z.array(z.string()),
});

export const PESTLEAnalysisSchema = z.object({
  political: z.array(z.string()),
  economic: z.array(z.string()),
  social: z.array(z.string()),
  technological: z.array(z.string()),
  legal: z.array(z.string()),
  environmental: z.array(z.string()),
});

export const ETOPItemSchema = z.object({
  sector: z.string().min(1),
  opportunityOrThreat: z.enum(["opportunity", "threat"]),
  impactLevel: z.enum(["low", "moderate", "high"]),
  probability: z.enum(["low", "moderate", "high", "unknown"]),
  strategicResponse: z.string().min(1),
});

export const MarketingMixSchema = z.object({
  product: z.array(z.string()),
  price: z.array(z.string()),
  place: z.array(z.string()),
  promotion: z.array(z.string()),
  people: z.array(z.string()),
  process: z.array(z.string()),
  physicalEvidence: z.array(z.string()),
});

export const BusinessModelSummarySchema = z.object({
  revenueStreams: z.array(z.string()),
  keyResources: z.array(z.string()),
  keyActivities: z.array(z.string()),
  keyPartners: z.array(z.string()),
  costStructure: z.array(z.string()),
  channels: z.array(z.string()),
  customerRelationships: z.array(z.string()),
});

export const StrategicRecommendationsSchema = z.object({
  positioningStrategy: StrategyRecommendationSchema,
  pricingStrategy: StrategyRecommendationSchema,
  marketingStrategy: StrategyRecommendationSchema,
  salesStrategy: StrategyRecommendationSchema,
  operationsStrategy: StrategyRecommendationSchema,
  supplierResourceStrategy: StrategyRecommendationSchema,
  growthStrategy: StrategyRecommendationSchema,
  riskMitigationStrategy: StrategyRecommendationSchema,
});

export const StrategicAnalysisInputSchema = z.object({
  businessConcept: BusinessConceptSchema,
  feasibilityReport: FeasibilityEvaluationSchema.optional(),
  marketResearchReport: MarketResearchReportSchema.optional(),
  customerAnalysis: CustomerAnalysisSchema.optional(),
  competitorAnalysis: CompetitorAnalysisSchema.optional(),
  founder: FounderIntakeSchema.optional(),
  serviceBusiness: z.boolean().optional(),
  planningNotes: stringListSchema,
});

export const StrategicAnalysisSchema = z.object({
  swot: SWOTAnalysisSchema,
  pestle: PESTLEAnalysisSchema,
  etopProfile: z.array(ETOPItemSchema),
  marketingMix: MarketingMixSchema,
  businessModelSummary: BusinessModelSummarySchema,
  strategicRecommendations: StrategicRecommendationsSchema,
});

export const strategyRecommendationSchema = StrategyRecommendationSchema;
export const swotAnalysisSchema = SWOTAnalysisSchema;
export const pestleAnalysisSchema = PESTLEAnalysisSchema;
export const etopItemSchema = ETOPItemSchema;
export const marketingMixSchema = MarketingMixSchema;
export const businessModelSummarySchema = BusinessModelSummarySchema;
export const strategicRecommendationsSchema = StrategicRecommendationsSchema;
export const strategicAnalysisInputSchema = StrategicAnalysisInputSchema;
export const strategicAnalysisSchema = StrategicAnalysisSchema;

export type StrategyRecommendation = z.infer<typeof StrategyRecommendationSchema>;
export type SWOTAnalysis = z.infer<typeof SWOTAnalysisSchema>;
export type PESTLEAnalysis = z.infer<typeof PESTLEAnalysisSchema>;
export type ETOPItem = z.infer<typeof ETOPItemSchema>;
export type MarketingMix = z.infer<typeof MarketingMixSchema>;
export type BusinessModelSummary = z.infer<typeof BusinessModelSummarySchema>;
export type StrategicRecommendations = z.infer<
  typeof StrategicRecommendationsSchema
>;
export type StrategicAnalysisInput = z.input<typeof StrategicAnalysisInputSchema>;
export type NormalizedStrategicAnalysisInput = z.infer<
  typeof StrategicAnalysisInputSchema
>;
export type StrategicAnalysis = z.infer<typeof StrategicAnalysisSchema>;
