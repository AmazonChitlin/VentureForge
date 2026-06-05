import assert from "node:assert/strict";
import test from "node:test";
import { BusinessConceptEngine } from "../engine/concept/business-concept-engine";
import { StrategyExecutionEngine } from "../engine/execution/strategy-execution-engine";
import { LaunchRoadmapEngine } from "../engine/launch-roadmap/launch-roadmap-engine";
import { sampleProjects } from "../../prisma/seed-data";

test("launch tasks depend on business model", () => {
  const physical = executionPlan(0);
  const online = executionPlan(0, {
    businessModel: "online",
  });
  const physicalWebsite = findInitiative(physical, "website");
  const onlineWebsite = findInitiative(online, "website");

  assert.match(physicalWebsite.description, /local discovery/i);
  assert.match(onlineWebsite.description, /conversion-focused website/i);
  assert.equal(physicalWebsite.priority, "high");
  assert.equal(onlineWebsite.priority, "critical");
});

test("physical location business includes licensing and location tasks", () => {
  const plan = executionPlan(0);
  const licensing = findInitiative(plan, "licensing");

  assert.equal(plan.strategyFormulation.businessModel, "physical_location");
  assert.match(licensing.description, /zoning, occupancy, permits/i);
  assert.equal(licensing.priority, "critical");
  assert.equal(
    plan.impactAssessment.find((item) => item.area === "licensing")?.impactLevel,
    "high",
  );
});

test("online business includes website and digital marketing tasks", () => {
  const plan = executionPlan(0, { businessModel: "online" });
  const website = findInitiative(plan, "website");
  const marketing = findInitiative(plan, "launch_marketing");

  assert.match(website.description, /analytics/i);
  assert.match(marketing.description, /digital campaigns/i);
  assert.equal(website.priority, "critical");
});

test("roadmap tasks include dependencies and KPIs", () => {
  const plan = executionPlan(2);
  const roadmap = LaunchRoadmapEngine.generate({
    executionPlan: plan,
    businessModel: "mobile",
  });
  const tasks = allRoadmapTasks(roadmap.data);
  const workflow = tasks.find(
    (task) => task.initiativeKey === "operational_workflow",
  );

  assert.ok(workflow);
  assert.ok(workflow.dependency.length > 0);
  assert.ok(workflow.KPI.length > 0);
  assert.ok(roadmap.data.feedbackCycles.weeklyLaunchReview.length > 0);
  assert.ok(roadmap.data.feedbackCycles.pivotTriggers.length > 0);
});

function executionPlan(
  sampleIndex: number,
  overrides: { businessModel?: string } = {},
) {
  const sample = sampleProjects[sampleIndex];
  assert.ok(sample);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  return StrategyExecutionEngine.buildExecutionPlan({
    businessConcept,
    founder: sample.intake.founder,
    businessModel: overrides.businessModel ?? sample.intake.idea.businessModel,
    location: {
      city: sample.intake.idea.city,
      county: sample.intake.idea.county,
      stateCode: sample.intake.idea.state,
      zipCode: sample.intake.idea.zipCode,
    },
    regulatoryConcerns: sample.intake.idea.licensingConcerns,
    websiteNeeded: true,
  }).data;
}

function findInitiative(
  plan: ReturnType<typeof executionPlan>,
  key: ReturnType<typeof executionPlan>["initiatives"][number]["key"],
) {
  const initiative = plan.initiatives.find((item) => item.key === key);
  assert.ok(initiative);
  return initiative;
}

function allRoadmapTasks(
  roadmap: ReturnType<typeof LaunchRoadmapEngine.generate>["data"],
) {
  return [
    ...roadmap.today,
    ...roadmap.thisWeek,
    ...roadmap.thirtyDays,
    ...roadmap.sixtyDays,
    ...roadmap.ninetyDays,
    ...roadmap.sixMonths,
    ...roadmap.twelveMonths,
  ];
}
