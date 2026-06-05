import { z } from "zod";
import {
  FeedbackLoopSchema,
  InitiativeKeySchema,
  InitiativePrioritySchema,
  InitiativeStatusSchema,
  StrategyExecutionPlanSchema,
} from "@/engine/execution/schema";

export const RoadmapBucketSchema = z.enum([
  "today",
  "this_week",
  "30_days",
  "60_days",
  "90_days",
  "6_months",
  "12_months",
]);

export const LaunchRoadmapTaskSchema = z.object({
  initiativeKey: InitiativeKeySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  bucket: RoadmapBucketSchema,
  priority: InitiativePrioritySchema,
  dependency: z.array(InitiativeKeySchema),
  KPI: z.string().min(1),
  evidenceRequired: z.array(z.string()),
  status: InitiativeStatusSchema,
  notes: z.array(z.string()),
});

export const LaunchRoadmapInputSchema = z.object({
  executionPlan: StrategyExecutionPlanSchema,
  businessModel: z.string().trim().default(""),
});

export const LaunchRoadmapSchema = z.object({
  today: z.array(LaunchRoadmapTaskSchema),
  thisWeek: z.array(LaunchRoadmapTaskSchema),
  thirtyDays: z.array(LaunchRoadmapTaskSchema),
  sixtyDays: z.array(LaunchRoadmapTaskSchema),
  ninetyDays: z.array(LaunchRoadmapTaskSchema),
  sixMonths: z.array(LaunchRoadmapTaskSchema),
  twelveMonths: z.array(LaunchRoadmapTaskSchema),
  feedbackCycles: FeedbackLoopSchema,
});

export const roadmapBucketSchema = RoadmapBucketSchema;
export const launchRoadmapTaskSchema = LaunchRoadmapTaskSchema;
export const launchRoadmapInputSchema = LaunchRoadmapInputSchema;
export const launchRoadmapSchema = LaunchRoadmapSchema;

export type RoadmapBucket = z.infer<typeof RoadmapBucketSchema>;
export type LaunchRoadmapTask = z.infer<typeof LaunchRoadmapTaskSchema>;
export type LaunchRoadmapInput = z.input<typeof LaunchRoadmapInputSchema>;
export type NormalizedLaunchRoadmapInput = z.infer<typeof LaunchRoadmapInputSchema>;
export type LaunchRoadmap = z.infer<typeof LaunchRoadmapSchema>;
