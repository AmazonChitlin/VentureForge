import { z } from "zod";
import {
  BusinessIdeaIntakeSchema,
  FounderIntakeSchema,
  IntakeEvaluationSchema,
} from "@/engine/intake/schema";

const missingObjectToEmpty = (value: unknown) => value ?? {};

export const SuggestedNaicsCodeSchema = z.object({
  code: z.string().min(2),
  title: z.string().min(1),
  rationale: z.string().min(1),
  origin: z.enum(["founder_guess", "mock_mapping"]),
  verificationRequired: z.boolean(),
});

export const BusinessConceptInputSchema = z.object({
  founder: z.preprocess(missingObjectToEmpty, FounderIntakeSchema),
  idea: z.preprocess(missingObjectToEmpty, BusinessIdeaIntakeSchema),
  intakeEvaluation: IntakeEvaluationSchema.optional(),
});

export const BusinessConceptSchema = z.object({
  businessConceptStatement: z.string().min(1),
  customerProblem: z.string().min(1),
  proposedSolution: z.string().min(1),
  primaryProductOrService: z.string().min(1),
  targetCustomerSegment: z.string().min(1),
  coreCustomerBenefit: z.string().min(1),
  distributionModel: z.string().min(1),
  revenueModel: z.string().min(1),
  founderAdvantage: z.string().min(1),
  differentiator: z.string().min(1),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  earlyRisks: z.array(z.string()),
  suggestedNaicsCodes: z.array(SuggestedNaicsCodeSchema),
  suggestedBusinessType: z.string().min(1),
  possibleSpinOffProducts: z.array(z.string()),
  environmentalOrCommunityImpactNotes: z.array(z.string()),
});

export const suggestedNaicsCodeSchema = SuggestedNaicsCodeSchema;
export const businessConceptInputSchema = BusinessConceptInputSchema;
export const businessConceptSchema = BusinessConceptSchema;

export type SuggestedNaicsCode = z.infer<typeof SuggestedNaicsCodeSchema>;
export type BusinessConceptInput = z.infer<typeof BusinessConceptInputSchema>;
export type BusinessConcept = z.infer<typeof BusinessConceptSchema>;
