import assert from "node:assert/strict";
import test from "node:test";

import { sampleProjects } from "../../prisma/seed-data";
import { BusinessPlanEngine } from "../engine/business-plan";
import { BusinessConceptEngine } from "../engine/concept";
import { CustomerAnalysisEngine } from "../engine/customer-analysis";
import { StrategyExecutionEngine } from "../engine/execution";
import { FinancialEngine } from "../engine/financials";
import { FundingEngine } from "../engine/funding";
import { LaunchRoadmapEngine } from "../engine/launch-roadmap";
import { MarketResearchEngine } from "../engine/market-research";
import { StrategicAnalysisEngine } from "../engine/strategy";
import { WebsiteEngine } from "../engine/website";
import {
  ExportService,
  ExportUnavailableError,
  VISIBLE_MOCK_DATA_WARNING,
} from "../exports";

const exports = new ExportService();

test("Markdown export includes every business-plan section and supporting context", async () => {
  const plan = BusinessPlanEngine.generate(basePlanInput(), "traditional_plan");
  const [artifact] = await exports.exportBusinessPlan("markdown", plan);
  assert.ok(artifact);
  const markdown = String(artifact.contents);

  assert.match(artifact.filename, /\.md$/);
  assert.match(markdown, /## Executive Summary/);
  assert.match(markdown, /## Appendix/);
  for (const section of plan.data.sections) {
    assert.match(markdown, new RegExp(`## ${escapeRegex(section.title)}`));
  }
  assert.match(markdown, /## Export warnings/);
  assert.match(markdown, /## Missing information/);
  assert.match(markdown, /## Overall assumptions/);
  assert.match(markdown, /## Overall sources/);
});

test("HTML business-plan export is escaped and preserves warnings", async () => {
  const plan = BusinessPlanEngine.generate(basePlanInput(), "traditional_plan");
  const [artifact] = await exports.exportBusinessPlan("html", {
    ...plan,
    warnings: [...plan.warnings, "Review <unsafe> founder note."],
  });
  assert.ok(artifact);
  const html = String(artifact.contents);

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /Review &lt;unsafe&gt; founder note\./);
  assert.doesNotMatch(html, /Review <unsafe>/);
});

test("CSV funding export includes match score and next steps", async () => {
  const sample = firstSample();
  const funding = FundingEngine.match({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    businessPlanCompleteness: 70,
    financialProjection: FinancialEngine.generate({
      startupCosts: sample.intake.idea.expectedStartupCosts,
      availableOwnerCapital: sample.intake.founder.availableStartupCapital,
      fixedMonthlyCosts: 2_000,
      pricePerUnitService: 100,
      expectedUnitSales: 50,
    }).data,
  });
  const [artifact] = await exports.exportFundingChecklist(funding);
  assert.ok(artifact);
  const csv = String(artifact.contents);

  assert.match(artifact.filename, /funding-checklist\.csv/);
  assert.match(csv, /Match score/);
  assert.match(csv, /Next steps/);
  assert.match(csv, /Official URL/);
  assert.match(csv, /SBA/);
});

test("CSV launch-roadmap export is spreadsheet-friendly", async () => {
  const sample = firstSample();
  const concept = BusinessConceptEngine.generate(sample.intake).data;
  const execution = StrategyExecutionEngine.buildExecutionPlan({
    businessConcept: concept,
    founder: sample.intake.founder,
    businessModel: sample.intake.idea.businessModel,
    location: {
      city: sample.intake.idea.city,
      county: sample.intake.idea.county,
      stateCode: sample.intake.idea.state,
      zipCode: sample.intake.idea.zipCode,
    },
    regulatoryConcerns: sample.intake.idea.licensingConcerns,
    websiteNeeded: true,
  });
  const roadmap = LaunchRoadmapEngine.generate({
    executionPlan: execution.data,
    businessModel: sample.intake.idea.businessModel,
  });
  const [artifact] = await exports.exportLaunchRoadmap(roadmap);
  assert.ok(artifact);
  const csv = String(artifact.contents);

  assert.match(csv, /^Time bucket,Task,Description,Priority,Status,Dependencies,KPI/);
  assert.match(csv, /Market validation/);
  assert.match(csv, /This week|30 days/);
});

test("static website ZIP scaffold creates the expected files", async () => {
  const website = websiteResult();
  const bundle = exports.buildStaticWebsiteBundle(website);
  const names = bundle.files.map((file) => file.path);

  assert.deepEqual(names, [
    "index.html",
    "about.html",
    "services.html",
    "contact.html",
    "faq.html",
    "styles.css",
  ]);
  assert.equal(bundle.zip[0], 0x50);
  assert.equal(bundle.zip[1], 0x4b);
  assert.match(bundle.files[0]!.content, /href="about\.html"/);
  assert.match(bundle.files[4]!.content, /<details>/);
});

test("mock-data warnings remain visible in document and website exports", async () => {
  const sample = firstSample();
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const market = await MarketResearchEngine.generate({
    projectId: sample.id,
    businessConcept,
    idea: sample.intake.idea,
    manualResearchEntries: [],
  });
  const plan = BusinessPlanEngine.generate(
    { ...basePlanInput(), marketResearchReport: market.data },
    "traditional_plan",
  );
  const [markdownArtifact] = await exports.exportBusinessPlan("markdown", plan);
  assert.ok(markdownArtifact);
  assert.match(String(markdownArtifact.contents), new RegExp(escapeRegex(VISIBLE_MOCK_DATA_WARNING)));

  const website = websiteResult();
  const bundle = exports.buildStaticWebsiteBundle({
    ...website,
    sources: [...website.sources, ...market.sources],
  });
  assert.match(bundle.files[0]!.content, new RegExp(escapeRegex(VISIBLE_MOCK_DATA_WARNING)));
});

test("PDF and DOCX exporters expose honest unavailable scaffolds", async () => {
  const plan = BusinessPlanEngine.generate(basePlanInput(), "traditional_plan");
  const capabilities = exports.capabilities();

  assert.equal(capabilities.find((item) => item.id === "business-plan-pdf")?.available, false);
  assert.equal(capabilities.find((item) => item.id === "business-plan-docx")?.available, false);
  await assert.rejects(
    exports.exportBusinessPlan("pdf", plan),
    ExportUnavailableError,
  );
  await assert.rejects(
    exports.exportBusinessPlan("docx", plan),
    ExportUnavailableError,
  );
});

function basePlanInput() {
  const sample = firstSample();
  return {
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    businessConcept: BusinessConceptEngine.generate(sample.intake).data,
  };
}

function websiteResult() {
  const sample = firstSample();
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const customerAnalysis = CustomerAnalysisEngine.generate({
    businessConcept,
    idea: sample.intake.idea,
  }).data;
  const strategicAnalysis = StrategicAnalysisEngine.generate({
    businessConcept,
    customerAnalysis,
    founder: sample.intake.founder,
  }).data;
  return WebsiteEngine.generate({
    businessName: sample.intake.idea.businessName,
    brandStyle: "Warm neighborhood guide",
    targetCustomer: sample.intake.idea.targetCustomer,
    productsServices: [sample.intake.idea.productOrService],
    location: {
      city: sample.intake.idea.city,
      state: sample.intake.idea.state,
      zipCode: sample.intake.idea.zipCode,
    },
    contactInfo: {
      email: "hello@example.com",
      phone: "480-555-0100",
      address: "123 Sample Street, Tempe, AZ",
    },
    hours: ["Monday-Saturday 10:00 AM-6:00 PM"],
    tone: "friendly",
    callToAction: "Ask about current inventory",
    valueProposition: businessConcept.coreCustomerBenefit,
    customerPainPoints: customerAnalysis.customerPainPoints,
    differentiators: ["Curated selection"],
    seoKeywords: ["vinyl records"],
    localServiceArea: ["Tempe, Arizona"],
    businessConcept,
    customerAnalysis,
    marketingStrategy: strategicAnalysis.strategicRecommendations.marketingStrategy,
    positioningStrategy: strategicAnalysis.strategicRecommendations.positioningStrategy,
  });
}

function firstSample() {
  const sample = sampleProjects[0];
  assert.ok(sample);
  return sample;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

