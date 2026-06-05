import assert from "node:assert/strict";
import test from "node:test";

import { sampleProjects } from "../../prisma/seed-data";
import {
  BusinessPlanEngine,
  setSectionLocked,
  updateEditableContent,
} from "../engine/business-plan";
import { CompetitorAnalysisEngine } from "../engine/competitor-analysis";
import { BusinessConceptEngine } from "../engine/concept";
import { CustomerAnalysisEngine } from "../engine/customer-analysis";
import { FeasibilityEngine } from "../engine/feasibility";
import { FinancialEngine } from "../engine/financials";
import { FundingEngine } from "../engine/funding";
import { IntakeEngine } from "../engine/intake";
import { MarketResearchEngine } from "../engine/market-research";
import { RiskEngine, type RiskCategory } from "../engine/risk";
import { StateProgramEngine } from "../engine/state-programs";
import { StrategicAnalysisEngine } from "../engine/strategy";
import { WebsiteEngine } from "../engine/website";
import {
  ExportService,
  VISIBLE_MOCK_DATA_WARNING,
} from "../exports";
import { buildTraceabilityReport } from "../lib/project-workspace/traceability";
import type { WorkspaceProject } from "../lib/project-workspace/types";

const exports = new ExportService();

test("changing state from Arizona to Pennsylvania changes the state checklist", () => {
  const sample = projectSample(0);
  const arizona = StateProgramEngine.generateChecklist({
    idea: { ...sample.intake.idea, state: "AZ" },
  });
  const pennsylvania = StateProgramEngine.generateChecklist({
    idea: { ...sample.intake.idea, state: "PA" },
  });

  assert.equal(arizona.data.stateName, "Arizona");
  assert.equal(pennsylvania.data.stateName, "Pennsylvania");
  assert.notDeepEqual(
    arizona.data.checklist.map((task) => task.id),
    pennsylvania.data.checklist.map((task) => task.id),
  );
});

test("changing an online model to a physical model adds licensing and location tasks", () => {
  const sample = projectSample(0);
  const online = StateProgramEngine.generateChecklist({
    idea: {
      ...sample.intake.idea,
      businessModel: "online",
      businessIdea: "An online record-discovery store with shipping.",
    },
  });
  const physical = StateProgramEngine.generateChecklist({
    idea: { ...sample.intake.idea, businessModel: "physical_location" },
  });

  assert.equal(hasCategory(online.data.checklist, "zoning"), false);
  assert.equal(hasCategory(physical.data.checklist, "zoning"), true);
  assert.ok(physical.data.checklist.length > online.data.checklist.length);
});

test("adding repeat-sales proof improves the feasibility score", () => {
  const sample = projectSample(0);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const ideaOnly = FeasibilityEngine.evaluate({
    businessConcept,
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    proofOfConcept: { stage: "idea_only" },
  });
  const repeatSales = FeasibilityEngine.evaluate({
    businessConcept,
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    proofOfConcept: {
      stage: "repeat_sales",
      firstSaleCount: 16,
      repeatCustomerCount: 7,
    },
  });

  assert.ok(
    repeatSales.data.totalFeasibilityScore > ideaOnly.data.totalFeasibilityScore,
  );
  assert.ok(
    repeatSales.data.proofOfConceptScore.score >
      ideaOnly.data.proofOfConceptScore.score,
  );
});

test("removing market research lowers strategy and business-plan confidence", async () => {
  const pipeline = await evidencePipeline();
  const strategyWithoutMarket = StrategicAnalysisEngine.generate({
    businessConcept: pipeline.businessConcept,
    customerAnalysis: pipeline.customerAnalysis,
    competitorAnalysis: pipeline.competitorAnalysis,
    founder: pipeline.sample.intake.founder,
  });
  const strategyWithMarket = StrategicAnalysisEngine.generate({
    businessConcept: pipeline.businessConcept,
    customerAnalysis: pipeline.customerAnalysis,
    competitorAnalysis: pipeline.competitorAnalysis,
    marketResearchReport: pipeline.reviewedMarketResearch,
    founder: pipeline.sample.intake.founder,
  });
  const planWithoutMarket = BusinessPlanEngine.generate(
    {
      founder: pipeline.sample.intake.founder,
      idea: pipeline.sample.intake.idea,
      businessConcept: pipeline.businessConcept,
      strategicAnalysis: strategyWithoutMarket.data,
    },
    "traditional_plan",
  );
  const planWithMarket = BusinessPlanEngine.generate(
    {
      founder: pipeline.sample.intake.founder,
      idea: pipeline.sample.intake.idea,
      businessConcept: pipeline.businessConcept,
      marketResearchReport: pipeline.reviewedMarketResearch,
      strategicAnalysis: strategyWithMarket.data,
    },
    "traditional_plan",
  );

  assert.ok(strategyWithMarket.confidence > strategyWithoutMarket.confidence);
  assert.ok(
    planSection(planWithMarket, "market_research").confidenceScore >
      planSection(planWithoutMarket, "market_research").confidenceScore,
  );
});

test("increasing rent changes the financial projection and downstream risk output", () => {
  const sample = projectSample(0);
  const lowRent = financialProjectionWithRent(500);
  const highRent = financialProjectionWithRent(8_500);
  const lowRentRisk = RiskEngine.generate({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    financialProjection: lowRent.data,
  });
  const highRentRisk = RiskEngine.generate({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    financialProjection: highRent.data,
  });

  assert.notEqual(
    lowRent.data.monthlyProfitLoss12Months[0]?.netIncome,
    highRent.data.monthlyProfitLoss12Months[0]?.netIncome,
  );
  assert.notDeepEqual(
    findRisk(lowRentRisk, "cash_flow_risk").evidence,
    findRisk(highRentRisk, "cash_flow_risk").evidence,
  );
  assert.equal(findRisk(highRentRisk, "cash_flow_risk").likelihood, "high");
});

test("veteran-owned founder input adds veteran funding pathways", () => {
  const sample = projectSample(0);
  const withoutVeteranFlag = FundingEngine.match({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
  });
  const withVeteranFlag = FundingEngine.match({
    founder: {
      ...sample.intake.founder,
      ownershipAttributes: {
        ...sample.intake.founder.ownershipAttributes,
        veteranOwned: true,
      },
    },
    idea: sample.intake.idea,
  });

  assert.equal(hasFundingType(withoutVeteranFlag, "veteran_owned_program"), false);
  assert.equal(hasFundingType(withVeteranFlag, "veteran_owned_program"), true);
});

test("customer persona changes website homepage copy and FAQ content", () => {
  const sample = projectSample(0);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const customerAnalysis = CustomerAnalysisEngine.generate({
    businessConcept,
    idea: sample.intake.idea,
  }).data;
  const studentPersona = {
    ...customerAnalysis,
    primaryCustomerPersona: {
      ...customerAnalysis.primaryCustomerPersona,
      segment: "College students building a first vinyl collection",
    },
    customerObjections: [
      "I need to know whether the selection is friendly for a first-time buyer.",
    ],
  };
  const collectorPersona = {
    ...customerAnalysis,
    primaryCustomerPersona: {
      ...customerAnalysis.primaryCustomerPersona,
      segment: "Experienced collectors hunting for harder-to-find pressings",
    },
    customerObjections: [
      "I need to know whether the shop carries unusual pressings before I visit.",
    ],
  };
  const studentWebsite = websiteForPersona(businessConcept, studentPersona);
  const collectorWebsite = websiteForPersona(businessConcept, collectorPersona);

  assert.notEqual(
    studentWebsite.data.homepage.introduction,
    collectorWebsite.data.homepage.introduction,
  );
  assert.ok(
    collectorWebsite.data.faqPage.faqs.some((faq) =>
      faq.answer.includes(collectorPersona.customerObjections[0]!),
    ),
  );
});

test("competitor saturation changes positioning recommendations", () => {
  const sample = projectSample(0);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const competitorAnalysis = competitorAnalysisFor(sample);
  const lowSaturation = StrategicAnalysisEngine.generate({
    businessConcept,
    competitorAnalysis: {
      ...competitorAnalysis,
      competitiveGrid: competitorAnalysis.competitiveGrid.map((record) => ({
        ...record,
        threatLevel: "low" as const,
      })),
    },
  });
  const highSaturation = StrategicAnalysisEngine.generate({
    businessConcept,
    competitorAnalysis: {
      ...competitorAnalysis,
      competitiveGrid: competitorAnalysis.competitiveGrid.map((record, index) => ({
        ...record,
        threatLevel: index === 0 ? "high" as const : record.threatLevel,
      })),
    },
  });

  assert.notEqual(
    lowSaturation.data.strategicRecommendations.positioningStrategy.recommendation,
    highSaturation.data.strategicRecommendations.positioningStrategy.recommendation,
  );
  assert.match(
    highSaturation.data.strategicRecommendations.positioningStrategy.reasoning,
    /saturation appears high/i,
  );
});

test("locked business-plan sections survive regeneration after upstream changes", () => {
  const sample = projectSample(0);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const initial = BusinessPlanEngine.generate(
    {
      founder: sample.intake.founder,
      idea: sample.intake.idea,
      businessConcept,
    },
    "traditional_plan",
  );
  const approvedCopy = "Founder-approved summary that must survive regeneration.";
  const locked = setSectionLocked(
    updateEditableContent(planSection(initial, "executive_summary"), approvedCopy),
  );
  const regenerated = BusinessPlanEngine.generate(
    {
      founder: sample.intake.founder,
      idea: sample.intake.idea,
      businessConcept: {
        ...businessConcept,
        coreCustomerBenefit: "A revised upstream customer benefit hypothesis.",
      },
    },
    "traditional_plan",
    [locked],
  );
  const preserved = planSection(regenerated, "executive_summary");

  assert.equal(preserved.editableContent, approvedCopy);
  assert.equal(preserved.locked, true);
  assert.equal(preserved.regenerateMetadata.lastAction, "preserved_locked");
});

test("mock market data warning remains visible in the final plan export", async () => {
  const sample = projectSample(0);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const market = await MarketResearchEngine.generate({
    projectId: sample.id,
    businessConcept,
    idea: sample.intake.idea,
    manualResearchEntries: [],
  });
  const plan = BusinessPlanEngine.generate(
    {
      founder: sample.intake.founder,
      idea: sample.intake.idea,
      businessConcept,
      marketResearchReport: market.data,
    },
    "traditional_plan",
  );
  const [artifact] = await exports.exportBusinessPlan("markdown", plan);

  assert.ok(artifact);
  assert.match(String(artifact.contents), new RegExp(escapeRegex(VISIBLE_MOCK_DATA_WARNING)));
});

test("traceability report reuses stored engine metadata and downstream links", () => {
  const sample = projectSample(0);
  const intake = IntakeEngine.evaluate(sample.intake);
  const concept = BusinessConceptEngine.generate({
    ...sample.intake,
    intakeEvaluation: intake.data,
  });
  const project: WorkspaceProject = {
    id: sample.id,
    name: sample.intake.idea.businessName,
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    intake: sample.intake,
    financialInput: {},
    proofOfConcept: {},
    websiteTone: "professional",
    outputs: { intake, concept },
    generationStatuses: {
      concept: {
        completedAt: "2026-06-02T00:00:00.000Z",
        errorMessage: null,
        failedAt: null,
        retryAvailable: true,
        sanitizedErrorMessage: null,
        startedAt: "2026-06-02T00:00:00.000Z",
        status: "completed",
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
      intake: {
        completedAt: "2026-06-02T00:00:00.000Z",
        errorMessage: null,
        failedAt: null,
        retryAvailable: true,
        sanitizedErrorMessage: null,
        startedAt: "2026-06-02T00:00:00.000Z",
        status: "completed",
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
    },
  };
  const report = buildTraceabilityReport(project);
  const conceptStage = report.stages.find((stage) => stage.key === "concept");

  assert.equal(report.generatedStageCount, 2);
  assert.equal(report.totalStageCount, 13);
  assert.ok(conceptStage);
  assert.equal(conceptStage.confidence, concept.confidence);
  assert.deepEqual(conceptStage.assumptions, concept.assumptions);
  assert.ok(conceptStage.downstreamStages.includes("website"));
});

async function evidencePipeline() {
  const sample = projectSample(0);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const marketResearch = await MarketResearchEngine.generate({
    projectId: sample.id,
    businessConcept,
    idea: sample.intake.idea,
    manualResearchEntries: [],
  });
  const reviewedMarketResearch = {
    ...marketResearch.data,
    containsMockData: false,
    missingData: [],
    confidenceLevel: {
      ...marketResearch.data.confidenceLevel,
      score: 72,
      level: "moderate" as const,
      explanation: "Reviewed local evidence fixture for integration testing.",
    },
    sourcesUsed: [
      {
        id: "reviewed-market-evidence",
        title: "Reviewed market evidence",
        sourceName: "Official integration fixture",
        sourceType: "official" as const,
        url: "https://example.gov/reviewed-market-evidence",
      },
    ],
  };
  const customerAnalysis = CustomerAnalysisEngine.generate({
    businessConcept,
    idea: sample.intake.idea,
    marketResearchReport: reviewedMarketResearch,
  }).data;

  return {
    sample,
    businessConcept,
    reviewedMarketResearch,
    customerAnalysis,
    competitorAnalysis: competitorAnalysisFor(sample),
  };
}

function competitorAnalysisFor(sample: (typeof sampleProjects)[number]) {
  return CompetitorAnalysisEngine.analyze({
    knownCompetitors: sample.intake.idea.knownCompetitors,
    location: {
      city: sample.intake.idea.city,
      county: sample.intake.idea.county,
      stateCode: sample.intake.idea.state,
      zipCode: sample.intake.idea.zipCode,
    },
    industry: sample.intake.idea.industry,
    targetCustomer: sample.intake.idea.targetCustomer,
    pricingIdea: sample.intake.idea.pricingIdea,
    manualCompetitorRecords: [],
  }).data;
}

function financialProjectionWithRent(rent: number) {
  return FinancialEngine.generate({
    startupCosts: 25_000,
    variableCosts: 20,
    pricePerUnitService: 100,
    expectedUnitSales: 60,
    rent,
    availableOwnerCapital: 25_000,
    openingCash: 25_000,
    taxEstimatePlaceholder: 0,
  });
}

function websiteForPersona(
  businessConcept: ReturnType<typeof BusinessConceptEngine.generate>["data"],
  customerAnalysis: ReturnType<typeof CustomerAnalysisEngine.generate>["data"],
) {
  return WebsiteEngine.generate({
    businessName: "Needle & Groove Records",
    brandStyle: "Neighborhood record-store guide",
    targetCustomer: customerAnalysis.primaryCustomerPersona.segment,
    productsServices: ["Curated vinyl records"],
    callToAction: "Ask about current inventory",
    valueProposition: businessConcept.coreCustomerBenefit,
    customerPainPoints: customerAnalysis.customerPainPoints,
    differentiators: [businessConcept.differentiator],
    businessConcept,
    customerAnalysis,
  });
}

function hasCategory(
  checklist: ReturnType<typeof StateProgramEngine.generateChecklist>["data"]["checklist"],
  category: string,
) {
  return checklist.some((task) => task.category === category);
}

function hasFundingType(
  result: ReturnType<typeof FundingEngine.match>,
  type: ReturnType<typeof FundingEngine.match>["data"]["matches"][number]["type"],
) {
  return result.data.matches.some((match) => match.type === type);
}

function planSection(
  result: ReturnType<typeof BusinessPlanEngine.generate>,
  key: ReturnType<typeof BusinessPlanEngine.generate>["data"]["sections"][number]["key"],
) {
  const section = result.data.sections.find((item) => item.key === key);
  assert.ok(section);
  return section;
}

function findRisk(
  result: ReturnType<typeof RiskEngine.generate>,
  category: RiskCategory,
) {
  const risk = result.data.risks.find((item) => item.category === category);
  assert.ok(risk);
  return risk;
}

function projectSample(index: number) {
  const sample = sampleProjects[index];
  assert.ok(sample);
  return sample;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
