import { z } from "zod";

export const GuidedBuilderModeSchema = z.enum(["guided", "review", "pro"]);

export const GuidedStepIdSchema = z.enum([
  "welcome",
  "idea_basics",
  "customer_basics",
  "location_model",
  "products_services",
  "differentiation",
  "startup_costs",
  "money_funding",
  "state_legal",
  "profile_review",
  "feasibility",
  "launch_plan",
  "business_plan",
  "website",
]);

export const GuidedJourneySectionSchema = z.enum([
  "Idea",
  "Customers",
  "Market",
  "Money",
  "Funding",
  "Launch",
  "Plan",
  "Website",
]);

export const GuidedAnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export const GuidedAnswerSchema = z.object({
  field: z.string().min(1),
  stepId: GuidedStepIdSchema,
  rawValue: GuidedAnswerValueSchema,
  structuredValue: GuidedAnswerValueSchema,
  isUnsure: z.boolean().default(false),
  updatedAt: z.string().min(1),
});

export const GuidedChoiceSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
});

export const GuidedQuestionSchema = z.object({
  field: z.string().min(1),
  question: z.string().min(1),
  helperText: z.string().min(1),
  whyItMatters: z.string().min(1),
  examples: z.array(z.string()),
  inputControl: z.enum([
    "text",
    "textarea",
    "choice",
    "location",
    "products",
    "cost_checklist",
    "money_calculator",
    "flag_checklist",
  ]),
  allowUnsure: z.boolean(),
  canSkip: z.boolean(),
  choices: z.array(GuidedChoiceSchema).default([]),
});

export const GuidedStepSchema = z.object({
  id: GuidedStepIdSchema,
  journeySection: GuidedJourneySectionSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  kind: z.enum(["welcome", "question", "review", "result"]),
  question: GuidedQuestionSchema.optional(),
  learnedMessage: z.string().min(1),
  mapsTo: z.array(z.string()),
});

export const GuidedBuilderStateSchema = z.object({
  projectId: z.string().min(1),
  mode: GuidedBuilderModeSchema,
  currentStepIndex: z.number().int().nonnegative(),
  answers: z.record(z.string(), GuidedAnswerSchema),
  completedStepIds: z.array(GuidedStepIdSchema),
  startedAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type GuidedBuilderMode = z.infer<typeof GuidedBuilderModeSchema>;
export type GuidedStepId = z.infer<typeof GuidedStepIdSchema>;
export type GuidedJourneySection = z.infer<typeof GuidedJourneySectionSchema>;
export type GuidedAnswerValue = z.infer<typeof GuidedAnswerValueSchema>;
export type GuidedAnswer = z.infer<typeof GuidedAnswerSchema>;
export type GuidedChoice = z.infer<typeof GuidedChoiceSchema>;
export type GuidedQuestion = z.infer<typeof GuidedQuestionSchema>;
export type GuidedStep = z.infer<typeof GuidedStepSchema>;
export type GuidedBuilderState = z.infer<typeof GuidedBuilderStateSchema>;
