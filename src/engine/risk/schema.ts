import { z } from "zod";

import { FeasibilityEvaluationSchema } from "@/engine/feasibility/schema";
import { FinancialProjectionSchema } from "@/engine/financials/schema";
import {
  BusinessIdeaIntakeSchema,
  FounderIntakeSchema,
} from "@/engine/intake/schema";
import { StrategicAnalysisSchema } from "@/engine/strategy/schema";

const scoreSchema = z.number().int().min(0).max(100);

export const RiskCategorySchema = z.enum([
  "market_risk",
  "customer_adoption_risk",
  "funding_risk",
  "cash_flow_risk",
  "regulatory_risk",
  "operational_risk",
  "supplier_risk",
  "staffing_risk",
  "technology_risk",
  "competition_risk",
  "founder_burnout_risk",
  "location_risk",
  "seasonality_risk",
  "economic_downturn_risk",
]);

export const RiskLevelSchema = z.enum(["low", "moderate", "high"]);

export const SupplierDependenceSchema = z.enum([
  "unknown",
  "low",
  "moderate",
  "high",
]);

export const LocationCommitmentSchema = z.enum([
  "unknown",
  "none",
  "exploring",
  "lease_or_purchase_planned",
  "committed",
]);

export const RiskEngineInputSchema = z.object({
  founder: FounderIntakeSchema,
  idea: BusinessIdeaIntakeSchema,
  feasibilityReport: FeasibilityEvaluationSchema.optional(),
  financialProjection: FinancialProjectionSchema.optional(),
  strategicAnalysis: StrategicAnalysisSchema.optional(),
  supplierDependence: SupplierDependenceSchema.default("unknown"),
  locationCommitment: LocationCommitmentSchema.default("unknown"),
  websiteOrMarketingCritical: z.boolean().optional(),
});

export const RiskItemSchema = z.object({
  category: RiskCategorySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  likelihood: RiskLevelSchema,
  impact: RiskLevelSchema,
  exposureScore: z.number().int().min(1).max(9),
  warningSigns: z.array(z.string().min(1)).min(1),
  mitigation: z.array(z.string().min(1)).min(1),
  contingencyPlan: z.array(z.string().min(1)).min(1),
  owner: z.string().min(1),
  reviewCadence: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
});

export const ContingencyScenarioKeySchema = z.enum([
  "demand_lower_than_expected",
  "costs_higher_than_expected",
  "funding_denied",
  "competitor_response",
  "delay_in_licensing",
  "founder_time_shortage",
  "supplier_failure",
  "website_or_marketing_underperforms",
]);

export const ContingencyScenarioSchema = z.object({
  scenario: ContingencyScenarioKeySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  trigger: z.string().min(1),
  immediateActions: z.array(z.string().min(1)).min(1),
  fallbackPlan: z.array(z.string().min(1)).min(1),
  owner: z.string().min(1),
  reviewCadence: z.string().min(1),
});

export const RiskRegisterSchema = z.object({
  risks: z.array(RiskItemSchema).length(14),
  priorityRisks: z.array(RiskItemSchema),
  contingencyScenarios: z.array(ContingencyScenarioSchema).length(8),
  overallRiskLevel: RiskLevelSchema,
  overallExposureScore: scoreSchema,
  summary: z.string().min(1),
});

export type RiskCategory = z.infer<typeof RiskCategorySchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type SupplierDependence = z.infer<typeof SupplierDependenceSchema>;
export type LocationCommitment = z.infer<typeof LocationCommitmentSchema>;
export type RiskEngineInput = z.input<typeof RiskEngineInputSchema>;
export type NormalizedRiskEngineInput = z.output<typeof RiskEngineInputSchema>;
export type RiskItem = z.infer<typeof RiskItemSchema>;
export type ContingencyScenarioKey = z.infer<
  typeof ContingencyScenarioKeySchema
>;
export type ContingencyScenario = z.infer<typeof ContingencyScenarioSchema>;
export type RiskRegister = z.infer<typeof RiskRegisterSchema>;
