import { z } from "zod";
import { BusinessConceptSchema } from "@/engine/concept/schema";
import { BusinessIdeaIntakeSchema } from "@/engine/intake/schema";
import { MarketResearchReportSchema } from "@/engine/market-research/schema";

export const CustomerEvidenceLabelSchema = z.enum([
  "user_provided",
  "estimated",
  "market_research",
]);

export const CustomerPersonaSchema = z.object({
  name: z.string().min(1),
  segment: z.string().min(1),
  summary: z.string().min(1),
  pains: z.array(z.string()),
  motivations: z.array(z.string()),
  channels: z.array(z.string()),
  evidenceLabel: CustomerEvidenceLabelSchema,
});

export const CustomerTestCopySchema = z.object({
  headline: z.string().min(1),
  body: z.string().min(1),
  callToAction: z.string().min(1),
  evidenceLabel: z.literal("estimated"),
});

export const CustomerAnalysisInputSchema = z.object({
  businessConcept: BusinessConceptSchema,
  idea: BusinessIdeaIntakeSchema,
  marketResearchReport: MarketResearchReportSchema.optional(),
});

export const CustomerAnalysisSchema = z.object({
  primaryCustomerPersona: CustomerPersonaSchema,
  secondaryCustomerPersonas: z.array(CustomerPersonaSchema),
  demographicProfile: z.array(z.string()),
  geographicProfile: z.array(z.string()),
  psychographicProfile: z.array(z.string()),
  buyingMotivations: z.array(z.string()),
  purchasingPatterns: z.array(z.string()),
  buyingSensitivity: z.array(z.string()),
  priceSensitivity: z.array(z.string()),
  frequencyOfPurchase: z.array(z.string()),
  customerPainPoints: z.array(z.string()),
  customerJobsToBeDone: z.array(z.string()),
  customerObjections: z.array(z.string()),
  channelsWhereCustomersCanBeReached: z.array(z.string()),
  earlyAdopterProfile: z.string().min(1),
  customerValidationQuestions: z.array(z.string()),
  surveyQuestions: z.array(z.string()),
  interviewQuestions: z.array(z.string()),
  focusGroupPrompts: z.array(z.string()),
  observationalChecklist: z.array(z.string()),
  landingPageTestCopy: CustomerTestCopySchema,
  offerTestCopy: CustomerTestCopySchema,
});

export const customerEvidenceLabelSchema = CustomerEvidenceLabelSchema;
export const customerPersonaSchema = CustomerPersonaSchema;
export const customerTestCopySchema = CustomerTestCopySchema;
export const customerAnalysisInputSchema = CustomerAnalysisInputSchema;
export const customerAnalysisSchema = CustomerAnalysisSchema;

export type CustomerEvidenceLabel = z.infer<typeof CustomerEvidenceLabelSchema>;
export type CustomerPersona = z.infer<typeof CustomerPersonaSchema>;
export type CustomerTestCopy = z.infer<typeof CustomerTestCopySchema>;
export type CustomerAnalysisInput = z.infer<typeof CustomerAnalysisInputSchema>;
export type CustomerAnalysis = z.infer<typeof CustomerAnalysisSchema>;
