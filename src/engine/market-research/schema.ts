import { z } from "zod";
import { BusinessConceptSchema } from "@/engine/concept/schema";
import { BusinessIdeaIntakeSchema } from "@/engine/intake/schema";
import { sourceReferenceSchema } from "@/engine/shared/source-reference";
import { manualResearchEntrySchema } from "@/providers/provider";

const textSchema = z.string().trim().default("");
const stringListSchema = z.array(z.string().trim().min(1)).default([]);
const scoreSchema = z.number().int().min(0).max(100);

export const ResearchDataLabelSchema = z.enum([
  "official",
  "manual",
  "mock",
  "unavailable",
]);

export const ResearchIndicatorSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  dataLabel: ResearchDataLabelSchema,
  notes: z.string().optional(),
});

export const MarketResearchConfidenceEvidenceSchema = z.object({
  sourceQuality: scoreSchema,
  recency: scoreSchema,
  geographicSpecificity: scoreSchema,
  industrySpecificity: scoreSchema,
  sampleSize: scoreSchema,
  primaryResearchAvailability: scoreSchema,
  secondaryDataAvailability: scoreSchema,
  independentSources: scoreSchema,
  consistencyAcrossSources: scoreSchema,
});

export const MarketResearchConfidenceScoreSchema =
  MarketResearchConfidenceEvidenceSchema.extend({
    score: scoreSchema,
    level: z.enum(["low", "moderate", "high"]),
    explanation: z.string().min(1),
  });

export const MarketDataPayloadSchema = z.object({
  industryOverview: textSchema,
  populationIndicators: z.array(ResearchIndicatorSchema).default([]),
  incomeIndicators: z.array(ResearchIndicatorSchema).default([]),
  employmentIndicators: z.array(ResearchIndicatorSchema).default([]),
  customerDemographics: stringListSchema,
  businessDensity: textSchema,
  similarBusinessCount: z.number().int().nonnegative().nullable().default(null),
  marketTrends: stringListSchema,
  demandSignals: stringListSchema,
  pricingSignals: stringListSchema,
  supplyDistributionNotes: stringListSchema,
  economicCycleSensitivity: textSchema,
  seasonality: textSchema,
  technologyDisruption: textSchema,
  regulatorySensitivity: textSchema,
  marketSizeEstimate: textSchema,
  marketSaturationEstimate: textSchema,
  confidenceEvidence: MarketResearchConfidenceEvidenceSchema,
  missingData: stringListSchema,
});

export const MarketResearchEngineInputSchema = z.object({
  projectId: z.string().min(1),
  businessConcept: BusinessConceptSchema,
  idea: BusinessIdeaIntakeSchema,
  manualResearchEntries: z.array(manualResearchEntrySchema).default([]),
});

export const MarketResearchGeographySchema = z.object({
  city: textSchema,
  county: textSchema,
  stateCode: textSchema,
  zipCode: textSchema,
});

export const ProviderRunSummarySchema = z.object({
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  status: z.enum(["available", "unavailable", "error"]),
  confidence: scoreSchema,
  isMockData: z.boolean(),
  warnings: z.array(z.string()),
});

export const MarketResearchReportSchema = z.object({
  industryOverview: z.string().min(1),
  naicsCode: z.string().min(1),
  geography: MarketResearchGeographySchema,
  populationIndicators: z.array(ResearchIndicatorSchema),
  incomeIndicators: z.array(ResearchIndicatorSchema),
  employmentIndicators: z.array(ResearchIndicatorSchema),
  customerDemographics: z.array(z.string()),
  businessDensity: z.string().min(1),
  similarBusinessCount: z.number().int().nonnegative().nullable(),
  marketTrends: z.array(z.string()),
  demandSignals: z.array(z.string()),
  pricingSignals: z.array(z.string()),
  supplyDistributionNotes: z.array(z.string()),
  economicCycleSensitivity: z.string().min(1),
  seasonality: z.string().min(1),
  technologyDisruption: z.string().min(1),
  regulatorySensitivity: z.string().min(1),
  marketSizeEstimate: z.string().min(1),
  marketSaturationEstimate: z.string().min(1),
  confidenceLevel: MarketResearchConfidenceScoreSchema,
  sourcesUsed: z.array(sourceReferenceSchema),
  missingData: z.array(z.string()),
  providerRuns: z.array(ProviderRunSummarySchema),
  containsMockData: z.boolean(),
});

export const researchDataLabelSchema = ResearchDataLabelSchema;
export const researchIndicatorSchema = ResearchIndicatorSchema;
export const marketResearchConfidenceEvidenceSchema =
  MarketResearchConfidenceEvidenceSchema;
export const marketResearchConfidenceScoreSchema =
  MarketResearchConfidenceScoreSchema;
export const marketDataPayloadSchema = MarketDataPayloadSchema;
export const marketResearchEngineInputSchema = MarketResearchEngineInputSchema;
export const marketResearchGeographySchema = MarketResearchGeographySchema;
export const providerRunSummarySchema = ProviderRunSummarySchema;
export const marketResearchReportSchema = MarketResearchReportSchema;

export type ResearchDataLabel = z.infer<typeof ResearchDataLabelSchema>;
export type ResearchIndicator = z.infer<typeof ResearchIndicatorSchema>;
export type MarketResearchConfidenceEvidence = z.infer<
  typeof MarketResearchConfidenceEvidenceSchema
>;
export type MarketResearchConfidenceScore = z.infer<
  typeof MarketResearchConfidenceScoreSchema
>;
export type MarketDataPayload = z.infer<typeof MarketDataPayloadSchema>;
export type MarketResearchEngineInput = z.infer<
  typeof MarketResearchEngineInputSchema
>;
export type MarketResearchReport = z.infer<typeof MarketResearchReportSchema>;
export type ProviderRunSummary = z.infer<typeof ProviderRunSummarySchema>;
