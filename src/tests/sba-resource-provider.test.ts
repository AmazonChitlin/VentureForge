import assert from "node:assert/strict";
import test from "node:test";

import { BusinessPlanEngine } from "../engine/business-plan";
import { BusinessConceptEngine } from "../engine/concept";
import { FundingEngine } from "../engine/funding";
import { StateProgramEngine } from "../engine/state-programs";
import {
  loadSBAResources,
  SBAResourceProvider,
} from "../providers/sba/provider";
import { sampleProjects } from "../../prisma/seed-data";

test("SBA resource provider filters by stage", async () => {
  const provider = new SBAResourceProvider();
  const result = await provider.fetch({
    projectId: "sba-filter-test",
    stage: "funding_readiness",
  });

  assert.equal(result.status, "available");
  assert.equal(result.isMockData, false);
  assert.ok(result.data?.resources.some((resource) => resource.id === "sba-loans"));
  assert.ok(result.data?.resources.some((resource) => resource.id === "sba-fund-your-business"));
  assert.ok(result.sources.every((source) => source.sourceType === "official"));
});

test("no SBA resource is labeled as mock or live scraped data", async () => {
  const provider = new SBAResourceProvider();
  const result = await provider.fetch({
    projectId: "sba-label-test",
    stage: "business_plan",
  });

  assert.equal(result.isMockData, false);
  assert.ok(result.warnings.some((warning) => /curated official references/i.test(warning)));
  assert.ok(loadSBAResources().length >= 19);
  assert.ok(loadSBAResources().every((resource) => resource.sourceType === "official"));
  assert.ok(result.sources.every((source) => source.sourceType === "official"));
});

test("business plan section includes SBA business-plan resource", () => {
  const result = BusinessPlanEngine.generate(basePlanInput(), "traditional_plan");
  const executiveSummary = section(result, "executive_summary");

  assert.ok(
    executiveSummary.sourceNotes.some(
      (source) => source.id === "sba-write-business-plan",
    ),
  );
});

test("market research section includes SBA market research resource", () => {
  const result = BusinessPlanEngine.generate(basePlanInput(), "traditional_plan");
  const marketResearch = section(result, "market_research");

  assert.ok(
    marketResearch.sourceNotes.some(
      (source) => source.id === "sba-market-research-competitive-analysis",
    ),
  );
});

test("funding output includes relevant SBA loan resources", () => {
  const sample = sampleProjects[1];
  assert.ok(sample);
  const result = FundingEngine.match({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    businessPlanCompleteness: 75,
    collateralReadiness: "partial",
    useOfFundsClarity: "clear",
    legalEntityReadiness: "developing",
  });

  assert.ok(result.sources.some((source) => source.id === "sba-loans"));
  assert.ok(result.sources.some((source) => source.id === "sba-7a-loans"));
  assert.ok(result.sources.some((source) => source.id === "sba-lender-match"));
});

test("state checklist includes SBA startup/register/license references", () => {
  const sample = sampleProjects[0];
  assert.ok(sample);
  const result = StateProgramEngine.generateChecklist({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    hasEmployees: false,
  });

  assert.ok(result.sources.some((source) => source.id === "sba-register-your-business"));
  assert.ok(result.sources.some((source) => source.id === "sba-licenses-permits"));
  assert.ok(result.sources.some((source) => source.id === "sba-choose-business-structure"));
});

function basePlanInput() {
  const sample = sampleProjects[0];
  assert.ok(sample);
  return {
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    businessConcept: BusinessConceptEngine.generate(sample.intake).data,
  };
}

function section(
  result: ReturnType<typeof BusinessPlanEngine.generate>,
  key: ReturnType<typeof BusinessPlanEngine.generate>["data"]["sections"][number]["key"],
) {
  const found = result.data.sections.find((item) => item.key === key);
  assert.ok(found);
  return found;
}
