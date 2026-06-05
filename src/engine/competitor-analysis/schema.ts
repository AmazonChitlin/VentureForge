import { z } from "zod";

const textSchema = z.string().trim().default("");
const stringListSchema = z.array(z.string().trim().min(1)).default([]);

export const CompetitorEvidenceLabelSchema = z.enum([
  "user_provided",
  "manual",
  "estimated",
]);

export const CompetitorRelationshipSchema = z.enum([
  "direct",
  "indirect",
  "substitute",
  "unknown",
]);

export const CompetitorThreatLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "unknown",
]);

export const CompetitorLocationInputSchema = z.object({
  city: textSchema,
  county: textSchema,
  stateCode: textSchema,
  zipCode: textSchema,
});

export const ManualCompetitorRecordSchema = z.object({
  name: z.string().trim().min(1),
  url: z.url().optional(),
  location: textSchema,
  directOrIndirect: CompetitorRelationshipSchema.default("unknown"),
  productsServices: stringListSchema,
  pricePosition: textSchema,
  targetCustomer: textSchema,
  perceivedStrengths: stringListSchema,
  perceivedWeaknesses: stringListSchema,
  reviewsSummary: textSchema,
  differentiators: stringListSchema,
  marketingChannels: stringListSchema,
  estimatedMarketPosition: textSchema,
  threatLevel: CompetitorThreatLevelSchema.default("unknown"),
});

export const CompetitorRecordSchema = ManualCompetitorRecordSchema.extend({
  evidenceLabel: CompetitorEvidenceLabelSchema,
});

export const CompetitiveGridEntrySchema = z.object({
  competitorName: z.string().min(1),
  relationship: CompetitorRelationshipSchema,
  pricePosition: z.string().min(1),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  differentiators: z.array(z.string()),
  threatLevel: CompetitorThreatLevelSchema,
  evidenceLabel: CompetitorEvidenceLabelSchema,
});

export const CompetitorAnalysisInputSchema = z.object({
  knownCompetitors: stringListSchema,
  location: CompetitorLocationInputSchema,
  industry: textSchema,
  targetCustomer: textSchema,
  pricingIdea: textSchema,
  manualCompetitorRecords: z.array(ManualCompetitorRecordSchema).default([]),
});

export const CompetitorAnalysisSchema = z.object({
  directCompetitors: z.array(CompetitorRecordSchema),
  indirectCompetitors: z.array(CompetitorRecordSchema),
  substituteProductsOrServices: z.array(z.string()),
  competitiveGrid: z.array(CompetitiveGridEntrySchema),
  barriersToEntry: z.array(z.string()),
  likelyCompetitorResponse: z.array(z.string()),
  whiteSpaceOpportunities: z.array(z.string()),
  differentiationRecommendations: z.array(z.string()),
});

export const competitorEvidenceLabelSchema = CompetitorEvidenceLabelSchema;
export const competitorRelationshipSchema = CompetitorRelationshipSchema;
export const competitorThreatLevelSchema = CompetitorThreatLevelSchema;
export const competitorLocationInputSchema = CompetitorLocationInputSchema;
export const manualCompetitorRecordSchema = ManualCompetitorRecordSchema;
export const competitorRecordSchema = CompetitorRecordSchema;
export const competitiveGridEntrySchema = CompetitiveGridEntrySchema;
export const competitorAnalysisInputSchema = CompetitorAnalysisInputSchema;
export const competitorAnalysisSchema = CompetitorAnalysisSchema;

export type CompetitorEvidenceLabel = z.infer<typeof CompetitorEvidenceLabelSchema>;
export type CompetitorRelationship = z.infer<typeof CompetitorRelationshipSchema>;
export type CompetitorThreatLevel = z.infer<typeof CompetitorThreatLevelSchema>;
export type CompetitorLocationInput = z.infer<typeof CompetitorLocationInputSchema>;
export type ManualCompetitorRecord = z.infer<typeof ManualCompetitorRecordSchema>;
export type CompetitorRecord = z.infer<typeof CompetitorRecordSchema>;
export type CompetitorAnalysisInput = z.infer<typeof CompetitorAnalysisInputSchema>;
export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;
