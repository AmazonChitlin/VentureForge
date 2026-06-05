import { z } from "zod";

import {
  BusinessIdeaIntakeSchema,
  FounderIntakeSchema,
} from "@/engine/intake/schema";

const scoreSchema = z.number().int().min(0).max(100);

export const StateProgramCategorySchema = z.enum([
  "entity_formation",
  "business_name_search",
  "registered_agent",
  "ein",
  "state_tax_registration",
  "sales_tax_or_tpt",
  "local_business_license",
  "zoning",
  "health_department",
  "liquor_license",
  "contractor_license",
  "professional_license",
  "employer_registration",
  "workers_compensation",
  "unemployment_insurance",
  "economic_development",
  "targeted_business_resources",
  "sbdc_score_vboc",
]);

export const StateProgramApplicabilitySchema = z.enum([
  "always",
  "taxable_sales",
  "local_operations",
  "physical_location",
  "food_business",
  "liquor_business",
  "contractor_business",
  "professional_service",
  "has_employees",
]);

export const EstimatedDifficultySchema = z.enum(["low", "moderate", "high"]);
export const SourceReliabilitySchema = z.enum([
  "official_curated",
  "official_partner",
  "placeholder",
  "unverified",
]);

export const StateResourceAgencySchema = z.object({
  agencyName: z.string().min(1),
  url: z.url().optional(),
  description: z.string().min(1),
  sourceReliability: SourceReliabilitySchema,
  lastVerifiedAt: z.iso.date(),
  needsVerification: z.boolean(),
});

export const StateProgramResourceSchema = z.object({
  id: z.string().min(1),
  stateCode: z.string().regex(/^[A-Z]{2}$/),
  title: z.string().min(1),
  category: StateProgramCategorySchema,
  agency: z.string().min(1),
  url: z.url().optional(),
  description: z.string().min(1),
  eligibilityTags: z.array(z.string()),
  industries: z.array(z.string()),
  lastVerifiedAt: z.iso.date(),
  sourceType: z.literal("official"),
  sourceReliability: SourceReliabilitySchema,
  needsVerification: z.boolean(),
  applicability: z.array(StateProgramApplicabilitySchema).min(1),
  whenNeeded: z.string().min(1),
  dependency: z.string().min(1),
  estimatedDifficulty: EstimatedDifficultySchema,
  founderNotes: z.string().min(1),
});

export const StateIndustrySpecificFlagSchema = z.object({
  id: StateProgramApplicabilitySchema,
  label: z.string().min(1),
  description: z.string().min(1),
  applicability: z.array(StateProgramApplicabilitySchema).min(1),
  tasks: z.array(StateProgramResourceSchema),
});

export const StateResourceFileSchema = z.object({
  stateCode: z.string().regex(/^[A-Z]{2}$/),
  stateName: z.string().min(1),
  entityFormationAgency: StateResourceAgencySchema,
  taxAgency: StateResourceAgencySchema,
  licensingPortal: StateResourceAgencySchema,
  economicDevelopmentAgency: StateResourceAgencySchema,
  workforceAgency: StateResourceAgencySchema,
  SBDC: StateResourceAgencySchema,
  SCORE: StateResourceAgencySchema,
  VBOC: StateResourceAgencySchema.optional(),
  commonBusinessSetupTasks: z.array(StateProgramResourceSchema),
  industrySpecificFlags: z.array(StateIndustrySpecificFlagSchema),
  lastVerifiedAt: z.iso.date(),
  verifyWarning: z.string().min(1),
  sourceReliability: SourceReliabilitySchema,
  needsVerification: z.boolean(),
});

export const StateProgramProjectInputSchema = z.object({
  founder: FounderIntakeSchema.optional(),
  idea: BusinessIdeaIntakeSchema,
  hasEmployees: z.boolean().optional(),
  sellsTaxableGoodsOrServices: z.boolean().optional(),
  liquorRelated: z.boolean().optional(),
  contractorRelated: z.boolean().optional(),
  professionalLicenseRelated: z.boolean().optional(),
});

export const LaunchComplianceTaskSchema = z.object({
  id: z.string().min(1),
  category: StateProgramCategorySchema,
  task: z.string().min(1),
  agency: z.string().min(1),
  officialUrl: z.url().optional(),
  description: z.string().min(1),
  whenNeeded: z.string().min(1),
  dependency: z.string().min(1),
  estimatedDifficulty: EstimatedDifficultySchema,
  founderNotes: z.string().min(1),
  verifyWithAgencyWarning: z.string().min(1),
  lastVerifiedAt: z.iso.date(),
  sourceReliability: SourceReliabilitySchema,
  needsVerification: z.boolean(),
});

export const ChecklistApplicabilitySummarySchema = z.object({
  hasEmployees: z.boolean(),
  taxableSalesLikely: z.boolean(),
  localOperationsLikely: z.boolean(),
  physicalLocationLikely: z.boolean(),
  foodBusinessLikely: z.boolean(),
  liquorBusinessLikely: z.boolean(),
  contractorBusinessLikely: z.boolean(),
  professionalServiceLikely: z.boolean(),
});

export const StateLaunchChecklistSchema = z.object({
  stateCode: z.string().min(1),
  stateName: z.string().min(1),
  supportedState: z.boolean(),
  checklist: z.array(LaunchComplianceTaskSchema),
  applicabilitySummary: ChecklistApplicabilitySummarySchema,
  coverageScore: scoreSchema,
  entityFormationAgency: StateResourceAgencySchema.optional(),
  taxAgency: StateResourceAgencySchema.optional(),
  licensingPortal: StateResourceAgencySchema.optional(),
  economicDevelopmentAgency: StateResourceAgencySchema.optional(),
  workforceAgency: StateResourceAgencySchema.optional(),
  SBDC: StateResourceAgencySchema.optional(),
  SCORE: StateResourceAgencySchema.optional(),
  VBOC: StateResourceAgencySchema.optional(),
  lastVerifiedAt: z.iso.date().optional(),
  verifyWarning: z.string().optional(),
  sourceReliability: SourceReliabilitySchema.optional(),
  needsVerification: z.boolean().optional(),
});

export type StateProgramCategory = z.infer<typeof StateProgramCategorySchema>;
export type StateProgramApplicability = z.infer<
  typeof StateProgramApplicabilitySchema
>;
export type EstimatedDifficulty = z.infer<typeof EstimatedDifficultySchema>;
export type SourceReliability = z.infer<typeof SourceReliabilitySchema>;
export type StateResourceAgency = z.infer<typeof StateResourceAgencySchema>;
export type StateProgramResource = z.infer<typeof StateProgramResourceSchema>;
export type StateIndustrySpecificFlag = z.infer<
  typeof StateIndustrySpecificFlagSchema
>;
export type StateResourceFile = z.infer<typeof StateResourceFileSchema>;
export type StateProgramProjectInput = z.input<
  typeof StateProgramProjectInputSchema
>;
export type NormalizedStateProgramProjectInput = z.output<
  typeof StateProgramProjectInputSchema
>;
export type LaunchComplianceTask = z.infer<typeof LaunchComplianceTaskSchema>;
export type ChecklistApplicabilitySummary = z.infer<
  typeof ChecklistApplicabilitySummarySchema
>;
export type StateLaunchChecklist = z.infer<typeof StateLaunchChecklistSchema>;
