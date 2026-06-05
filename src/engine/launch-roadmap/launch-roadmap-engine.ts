import { engineResultSchema, type EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import type { ExecutionInitiative, InitiativeKey } from "@/engine/execution/schema";
import {
  LaunchRoadmapInputSchema,
  LaunchRoadmapSchema,
  type LaunchRoadmap,
  type LaunchRoadmapInput,
  type LaunchRoadmapTask,
  type NormalizedLaunchRoadmapInput,
  type RoadmapBucket,
} from "@/engine/launch-roadmap/schema";

const roadmapSource: SourceReference = {
  id: "launch-roadmap-method",
  title: "Deterministic staged launch roadmap",
  sourceName: "VentureForge launch-roadmap engine",
  sourceType: "manual",
  notes: "Roadmap timing is a planning suggestion and must be updated as evidence and dependencies change.",
};

const executionSource: SourceReference = {
  id: "launch-roadmap-execution-plan",
  title: "Strategy execution plan",
  sourceName: "VentureForge execution engine",
  sourceType: "manual",
  notes: "Roadmap tasks are derived from execution initiatives.",
};

export const LaunchRoadmapEngine = {
  generate(inputDraft: LaunchRoadmapInput): EngineResult<LaunchRoadmap> {
    const input = LaunchRoadmapInputSchema.parse(inputDraft);
    const model = input.businessModel ||
      input.executionPlan.strategyFormulation.businessModel;
    const tasks = input.executionPlan.initiatives.map((initiative) =>
      taskFromInitiative(initiative, model),
    );
    const roadmap = LaunchRoadmapSchema.parse({
      today: tasksForBucket(tasks, "today"),
      thisWeek: tasksForBucket(tasks, "this_week"),
      thirtyDays: tasksForBucket(tasks, "30_days"),
      sixtyDays: tasksForBucket(tasks, "60_days"),
      ninetyDays: tasksForBucket(tasks, "90_days"),
      sixMonths: tasksForBucket(tasks, "6_months"),
      twelveMonths: tasksForBucket(tasks, "12_months"),
      feedbackCycles: input.executionPlan.feedbackLoop,
    });

    return engineResultSchema(LaunchRoadmapSchema).parse({
      data: roadmap,
      confidence: calculateConfidence(input),
      assumptions: [
        "Roadmap timing is a deterministic planning suggestion, not a guaranteed launch schedule.",
        "Dependencies, evidence, official requirements, and founder capacity may change bucket timing.",
      ],
      missingInformation: unique([
        !model ? "Business model is missing." : undefined,
        ...tasks
          .filter((task) => task.dependency.length === 0)
          .slice(0, 1)
          .map(() => "Confirm founder capacity and due dates before scheduling calendar reminders."),
      ]),
      warnings: [
        "Do not advance blocked tasks until dependencies and required evidence are satisfied.",
        "Verify legal, licensing, insurance, accounting, tax, and compliance timing with official agencies and qualified professionals.",
      ],
      sources: [executionSource, roadmapSource],
      nextActions: roadmap.today
        .slice(0, 4)
        .map((task) => `Start roadmap task: ${task.title}.`),
    });
  },
};

function taskFromInitiative(
  initiative: ExecutionInitiative,
  model: string,
): LaunchRoadmapTask {
  const bucket = bucketForInitiative(initiative.key, model);
  return {
    initiativeKey: initiative.key,
    title: initiative.title,
    description: initiative.description,
    bucket,
    priority: initiative.priority,
    dependency: initiative.dependency,
    KPI: initiative.KPI,
    evidenceRequired: initiative.evidenceRequired,
    status: initiative.status,
    notes: [
      `Planning-range cost: ${initiative.costEstimate}.`,
      `Planning-range duration: ${initiative.durationEstimate}.`,
      `Risk level: ${initiative.risk}.`,
    ],
  };
}

function bucketForInitiative(
  key: InitiativeKey,
  model: string,
): RoadmapBucket {
  const online = ["online", "hybrid", "marketplace", "subscription", "ecommerce"]
    .includes(model);
  const physical = ["physical_location", "hybrid", "manufacturing", "franchise"]
    .includes(model);
  const defaults: Record<InitiativeKey, RoadmapBucket> = {
    market_validation: "today",
    entity_formation: "this_week",
    licensing: physical ? "this_week" : "30_days",
    funding_preparation: "30_days",
    supplier_setup: "30_days",
    prototype_mvp: "30_days",
    branding: "30_days",
    website: online ? "this_week" : "60_days",
    launch_marketing: online ? "30_days" : "60_days",
    sales_process: "30_days",
    accounting_setup: "30_days",
    insurance: physical ? "30_days" : "60_days",
    hiring_contractors: "90_days",
    operational_workflow: "60_days",
    customer_feedback_loop: "60_days",
  };
  return defaults[key];
}

function tasksForBucket(
  tasks: LaunchRoadmapTask[],
  bucket: RoadmapBucket,
): LaunchRoadmapTask[] {
  return tasks.filter((task) => task.bucket === bucket);
}

function calculateConfidence(input: NormalizedLaunchRoadmapInput): number {
  const initiatives = input.executionPlan.initiatives;
  const withDependencies = initiatives.filter(
    (initiative) => initiative.dependency.length > 0,
  ).length;
  const withKpi = initiatives.filter((initiative) => initiative.KPI).length;
  return clamp(
    50 +
      Math.round((withDependencies / initiatives.length) * 20) +
      Math.round((withKpi / initiatives.length) * 20) +
      (input.businessModel ? 10 : 0),
  );
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
