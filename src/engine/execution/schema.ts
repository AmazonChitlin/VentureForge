import { z } from "zod";
import { BusinessConceptSchema } from "@/engine/concept/schema";
import { CompetitorAnalysisSchema } from "@/engine/competitor-analysis/schema";
import { CustomerAnalysisSchema } from "@/engine/customer-analysis/schema";
import { FeasibilityEvaluationSchema } from "@/engine/feasibility/schema";
import { FounderIntakeSchema } from "@/engine/intake/schema";
import { MarketResearchReportSchema } from "@/engine/market-research/schema";
import { StrategicAnalysisSchema } from "@/engine/strategy/schema";

const stringListSchema = z.array(z.string().trim().min(1)).default([]);

export const InitiativeKeySchema = z.enum([
  "entity_formation",
  "licensing",
  "market_validation",
  "funding_preparation",
  "supplier_setup",
  "prototype_mvp",
  "branding",
  "website",
  "launch_marketing",
  "sales_process",
  "accounting_setup",
  "insurance",
  "hiring_contractors",
  "operational_workflow",
  "customer_feedback_loop",
]);

export const InitiativePrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export const InitiativeRiskSchema = z.enum(["high", "moderate", "low"]);
export const InitiativeStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "blocked",
  "complete",
]);

export const ExecutionInitiativeSchema = z.object({
  key: InitiativeKeySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  owner: z.string().min(1),
  dependency: z.array(InitiativeKeySchema),
  costEstimate: z.string().min(1),
  durationEstimate: z.string().min(1),
  priority: InitiativePrioritySchema,
  risk: InitiativeRiskSchema,
  KPI: z.string().min(1),
  evidenceRequired: z.array(z.string()),
  status: InitiativeStatusSchema,
});

export const StrategyFormulationSchema = z.object({
  strategicObjective: z.string().min(1),
  targetCustomer: z.string().min(1),
  valueProposition: z.string().min(1),
  targetPosition: z.string().min(1),
  businessModel: z.string().min(1),
  successMetrics: z.array(z.string()),
});

export const ImpactAssessmentItemSchema = z.object({
  area: z.enum([
    "founder time",
    "capital",
    "operations",
    "licensing",
    "staffing",
    "supply chain",
    "technology",
    "website",
    "marketing",
    "sales",
    "accounting",
    "insurance",
    "compliance",
    "customer experience",
  ]),
  impactLevel: z.enum(["low", "moderate", "high", "unknown"]),
  assessment: z.string().min(1),
  response: z.string().min(1),
});

export const TargetBusinessDesignSchema = z.object({
  futureOperatingModel: z.string().min(1),
  coreCapabilitiesNeeded: z.array(z.string()),
  requiredResources: z.array(z.string()),
  requiredSystemsTools: z.array(z.string()),
  valueStream: z.array(z.string()),
  supplierResourceMap: z.array(z.string()),
  dataInformationNeeds: z.array(z.string()),
});

export const DeploymentPlanSchema = z.object({
  sequence: z.array(InitiativeKeySchema),
  criticalPath: z.array(InitiativeKeySchema),
  deploymentNotes: z.array(z.string()),
});

export const FeedbackLoopSchema = z.object({
  weeklyLaunchReview: z.array(z.string()),
  monthlyFinancialReview: z.array(z.string()),
  quarterlyBusinessPlanReview: z.array(z.string()),
  kpiReview: z.array(z.string()),
  assumptionsToRetest: z.array(z.string()),
  pivotTriggers: z.array(z.string()),
});

export const StrategyExecutionInputSchema = z.object({
  businessConcept: BusinessConceptSchema,
  feasibilityReport: FeasibilityEvaluationSchema.optional(),
  marketResearchReport: MarketResearchReportSchema.optional(),
  customerAnalysis: CustomerAnalysisSchema.optional(),
  competitorAnalysis: CompetitorAnalysisSchema.optional(),
  strategicAnalysis: StrategicAnalysisSchema.optional(),
  founder: FounderIntakeSchema.optional(),
  businessModel: z.string().trim().default(""),
  location: z
    .object({
      city: z.string().trim().default(""),
      county: z.string().trim().default(""),
      stateCode: z.string().trim().default(""),
      zipCode: z.string().trim().default(""),
    })
    .default({
      city: "",
      county: "",
      stateCode: "",
      zipCode: "",
    }),
  regulatoryConcerns: stringListSchema,
  websiteNeeded: z.boolean().default(true),
});

export const StrategyExecutionPlanSchema = z.object({
  strategyFormulation: StrategyFormulationSchema,
  impactAssessment: z.array(ImpactAssessmentItemSchema).length(14),
  targetBusinessDesign: TargetBusinessDesignSchema,
  initiatives: z.array(ExecutionInitiativeSchema).length(15),
  deploymentPlan: DeploymentPlanSchema,
  feedbackLoop: FeedbackLoopSchema,
});

export const initiativeKeySchema = InitiativeKeySchema;
export const executionInitiativeSchema = ExecutionInitiativeSchema;
export const strategyFormulationSchema = StrategyFormulationSchema;
export const impactAssessmentItemSchema = ImpactAssessmentItemSchema;
export const targetBusinessDesignSchema = TargetBusinessDesignSchema;
export const deploymentPlanSchema = DeploymentPlanSchema;
export const feedbackLoopSchema = FeedbackLoopSchema;
export const strategyExecutionInputSchema = StrategyExecutionInputSchema;
export const strategyExecutionPlanSchema = StrategyExecutionPlanSchema;

export type InitiativeKey = z.infer<typeof InitiativeKeySchema>;
export type ExecutionInitiative = z.infer<typeof ExecutionInitiativeSchema>;
export type StrategyFormulation = z.infer<typeof StrategyFormulationSchema>;
export type ImpactAssessmentItem = z.infer<typeof ImpactAssessmentItemSchema>;
export type TargetBusinessDesign = z.infer<typeof TargetBusinessDesignSchema>;
export type DeploymentPlan = z.infer<typeof DeploymentPlanSchema>;
export type FeedbackLoop = z.infer<typeof FeedbackLoopSchema>;
export type StrategyExecutionInput = z.input<typeof StrategyExecutionInputSchema>;
export type NormalizedStrategyExecutionInput = z.infer<
  typeof StrategyExecutionInputSchema
>;
export type StrategyExecutionPlan = z.infer<typeof StrategyExecutionPlanSchema>;
