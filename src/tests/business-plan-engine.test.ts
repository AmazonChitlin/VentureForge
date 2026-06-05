import assert from "node:assert/strict";
import test from "node:test";

import { sampleProjects } from "../../prisma/seed-data";
import {
  BusinessPlanEngine,
  setSectionLocked,
  toBusinessPlanPersistenceRecord,
  traditionalSectionKeys,
  updateEditableContent,
} from "../engine/business-plan";
import { BusinessConceptEngine } from "../engine/concept";
import { FinancialEngine } from "../engine/financials";
import { MarketResearchEngine } from "../engine/market-research";

test("traditional plan includes all canonical sections", () => {
  const result = BusinessPlanEngine.generate(basePlanInput(), "traditional_plan");

  assert.equal(result.data.sections.length, 21);
  assert.deepEqual(result.data.sectionOrder, traditionalSectionKeys);
  assert.equal(result.data.sections[0]?.title, "Executive Summary");
  assert.equal(result.data.sections.at(-1)?.title, "Appendix");
  assert.ok(
    result.data.sections.every(
      (section) =>
        section.editableContent.length > 0 &&
        section.qualityChecklist.length > 0 &&
        section.regenerateMetadata.canRegenerate,
    ),
  );
});

test("one-page plan is shorter than the traditional plan", () => {
  const input = basePlanInput();
  const traditional = BusinessPlanEngine.generate(input, "traditional_plan");
  const onePage = BusinessPlanEngine.generate(input, "one_page_plan");

  assert.ok(onePage.data.sections.length < traditional.data.sections.length);
  assert.equal(onePage.data.concise, true);
  assert.equal(onePage.data.sections.length, 6);
});

test("missing market research lowers confidence in the market section", async () => {
  const input = basePlanInput();
  const withoutResearch = BusinessPlanEngine.generate(input, "traditional_plan");
  const mockMarketResearchReport = (
    await MarketResearchEngine.generate({
      projectId: "sample-tempe-vinyl",
      businessConcept: input.businessConcept,
      idea: input.idea,
      manualResearchEntries: [],
    })
  ).data;
  const marketResearchReport = {
    ...mockMarketResearchReport,
    containsMockData: false,
    missingData: [],
    confidenceLevel: {
      ...mockMarketResearchReport.confidenceLevel,
      score: 68,
      level: "moderate" as const,
      explanation:
        "Test fixture representing reviewed local evidence from an official source.",
    },
    sourcesUsed: [
      {
        id: "reviewed-local-evidence",
        title: "Reviewed local market evidence",
        sourceName: "Official test fixture",
        sourceType: "official" as const,
        url: "https://example.gov/local-market-evidence",
      },
    ],
  };
  const withResearch = BusinessPlanEngine.generate(
    { ...input, marketResearchReport },
    "traditional_plan",
  );
  const withMockResearch = BusinessPlanEngine.generate(
    { ...input, marketResearchReport: mockMarketResearchReport },
    "traditional_plan",
  );

  assert.ok(
    section(withResearch, "market_research").confidenceScore >
      section(withoutResearch, "market_research").confidenceScore,
  );
  assert.match(
    section(withMockResearch, "market_research").narrative,
    /mock data/i,
  );
});

test("locked sections are not overwritten by regeneration", () => {
  const input = basePlanInput();
  const first = BusinessPlanEngine.generate(input, "traditional_plan");
  const original = section(first, "executive_summary");
  const customContent =
    "Founder-approved executive summary. Preserve this manual review copy.";
  const locked = setSectionLocked(
    updateEditableContent(original, customContent),
  );
  const regenerated = BusinessPlanEngine.generate(
    {
      ...input,
      missionStatement: "A changed upstream input should not overwrite a lock.",
    },
    "traditional_plan",
    [locked],
  );
  const preserved = section(regenerated, "executive_summary");

  assert.equal(preserved.narrative, original.narrative);
  assert.equal(preserved.editableContent, customContent);
  assert.equal(preserved.locked, true);
  assert.equal(
    preserved.regenerateMetadata.lastAction,
    "preserved_locked",
  );
  assert.equal(preserved.regenerateMetadata.preservedBecauseLocked, true);

  const persistence = toBusinessPlanPersistenceRecord(regenerated.data);
  assert.equal(persistence.sections[0]?.isLocked, true);
  assert.equal(
    persistence.sections[0]?.content.editableContent,
    customContent,
  );
});

test("financial section uses traceable financial-engine output", () => {
  const financialProjection = FinancialEngine.generate({
    startupCosts: 30_000,
    fixedMonthlyCosts: 1_000,
    variableCosts: 40,
    pricePerUnitService: 100,
    expectedUnitSales: 20,
    availableOwnerCapital: 10_000,
    taxEstimatePlaceholder: 0,
  }).data;
  const result = BusinessPlanEngine.generate(
    { ...basePlanInput(), financialProjection },
    "traditional_plan",
  );
  const financial = section(result, "financial_plan");

  assert.match(financial.narrative, /startup costs \$30,000/i);
  assert.match(financial.narrative, /funding gap \$20,000/i);
  assert.match(financial.narrative, /break-even of 17 units/i);
  assert.match(financial.narrative, /CPA or bookkeeper/i);
  assert.ok(
    financial.sourceNotes.some(
      (source) => source.id === "sba-calculate-startup-costs",
    ),
  );
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
