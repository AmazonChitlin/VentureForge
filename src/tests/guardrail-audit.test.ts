import assert from "node:assert/strict";
import test from "node:test";

import { sampleProjects } from "../../prisma/seed-data";
import { WebsiteAIService, MockLLMClient } from "../ai";
import { BusinessPlanEngine } from "../engine/business-plan";
import { BusinessConceptEngine } from "../engine/concept";
import { FinancialEngine } from "../engine/financials";
import { FundingEngine } from "../engine/funding";
import {
  ATTORNEY_REVIEW,
  CPA_BOOKKEEPER_REVIEW,
  ESTIMATED_DATA_LABEL,
  GLOBAL_GUARDRAILS,
  MOCK_DATA_WARNING,
  NO_BUSINESS_SUCCESS_GUARANTEE,
  NO_FUNDING_GUARANTEE,
  NO_PROFESSIONAL_ADVICE,
  OFFICIAL_AGENCY_VERIFICATION,
} from "../engine/shared/guardrails";
import { StateProgramEngine } from "../engine/state-programs";
import { WebsiteEngine } from "../engine/website";
import { ExportService } from "../exports";
import { runWorkspaceModule } from "../lib/project-workspace/orchestrator";
import { getWorkspaceProject } from "../lib/project-workspace/testMemoryStore";
import type { WorkspaceModuleKey } from "../lib/project-workspace/types";

const exports = new ExportService();

test("every major workspace engine output inherits global life-savings guardrails", async () => {
  const project = getWorkspaceProject("sample-tempe-vinyl");
  assert.ok(project);
  const modules: WorkspaceModuleKey[] = [
    "intake",
    "concept",
    "market",
    "customers",
    "competitors",
    "feasibility",
    "strategy",
    "execution",
    "financials",
    "funding",
    "state",
    "launch",
    "risk",
    "plan",
    "website",
  ];

  for (const module of modules) {
    await runWorkspaceModule(project, module, { persist: false });
    const output = project.outputs[module];
    assert.ok(output, `${module} should produce an EngineResult`);
    for (const guardrail of GLOBAL_GUARDRAILS) {
      assert.ok(
        output.warnings.includes(guardrail),
        `${module} should include global guardrail: ${guardrail}`,
      );
    }
  }
});

test("mock sources create a visible mock-data warning", () => {
  const sample = firstSample();
  const concept = BusinessConceptEngine.generate(sample.intake);

  assert.ok(concept.sources.some((source) => source.sourceType === "mock"));
  assert.ok(concept.warnings.includes(MOCK_DATA_WARNING));
});

test("funding output states that final eligibility belongs to the lender or program", () => {
  const sample = firstSample();
  const result = FundingEngine.match({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
  });

  assert.match(result.data.verificationReminder, /final eligibility is determined/i);
  assert.ok(result.warnings.includes(NO_FUNDING_GUARANTEE));
});

test("funding output labels mock market-research input", async () => {
  const sample = firstSample();
  const project = getWorkspaceProject(sample.id);
  assert.ok(project);
  await runWorkspaceModule(project, "market", { persist: false });
  await runWorkspaceModule(project, "funding", { persist: false });
  const funding = project.outputs.funding;
  assert.ok(funding);

  assert.ok(
    funding.warnings.some((warning) =>
      /includes mock market research/i.test(warning),
    ),
  );
});

test("state checklist requires official-agency verification on output and each task", () => {
  const sample = firstSample();
  const result = StateProgramEngine.generateChecklist({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
  });

  assert.ok(result.warnings.includes(OFFICIAL_AGENCY_VERIFICATION));
  assert.ok(result.data.checklist.length > 0);
  for (const task of result.data.checklist) {
    assert.match(task.verifyWithAgencyWarning, /verify with the official/i);
    if (task.officialUrl) {
      assert.match(task.officialUrl, /^https:\/\//i);
    } else {
      assert.equal(task.needsVerification, true);
    }
  }
});

test("financial output exposes assumptions and CPA review language", () => {
  const result = FinancialEngine.generate({});

  assert.ok(result.data.editableAssumptions.length > 0);
  assert.ok(
    result.data.editableAssumptions.some((assumption) => assumption.isPlaceholder),
  );
  assert.match(result.data.assumptionsNarrative, /placeholder/i);
  assert.ok(result.warnings.includes(CPA_BOOKKEEPER_REVIEW));
});

test("business plan surfaces missing research instead of hiding it", () => {
  const sample = firstSample();
  const result = BusinessPlanEngine.generate(
    {
      founder: sample.intake.founder,
      idea: sample.intake.idea,
      businessConcept: BusinessConceptEngine.generate(sample.intake).data,
    },
    "traditional_plan",
  );
  const marketSection = result.data.sections.find(
    (section) => section.key === "market_research",
  );

  assert.ok(marketSection);
  assert.match(marketSection.narrative, /market research has not been generated/i);
  assert.ok(marketSection.missingInformation.length > 0);
  assert.ok(
    result.warnings.some((warning) => /market research is missing/i.test(warning)),
  );
});

test("website copy neutralizes unsupported marketing claims", () => {
  const sample = firstSample();
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const result = WebsiteEngine.generate({
    businessName: "Needle & Groove Records",
    brandStyle: "Best in town and officially approved",
    targetCustomer: sample.intake.idea.targetCustomer,
    productsServices: ["Guaranteed results record discovery"],
    differentiators: ["Lowest price", "Proven results"],
    businessConcept,
  });
  const serializedWebsite = JSON.stringify(result.data).toLowerCase();

  assert.doesNotMatch(serializedWebsite, /best in town|officially approved|guaranteed results|lowest price|proven results/);
  assert.ok(
    result.warnings.some((warning) => /language was neutralized/i.test(warning)),
  );
});

test("AI output with unsupported funding certainty fails validation safely", async () => {
  const service = new WebsiteAIService(
    new MockLLMClient({
      data: {
        summary: "You will qualify for funding.",
        recommendations: ["Publish the claim."],
        questionsToResolve: [],
        sourceNotes: [],
      },
      confidence: 80,
      assumptions: [],
      missingInformation: [],
      warnings: [],
      sources: [],
      nextActions: [],
    }),
  );
  const attempt = await service.enhanceSafely({
    websitePackage: { businessName: "Sample Business" },
  });

  assert.equal(attempt.status, "unavailable");
  assert.match(attempt.error, /unsupported/i);
});

test("business-plan export preserves the global guardrails", async () => {
  const sample = firstSample();
  const plan = BusinessPlanEngine.generate(
    {
      founder: sample.intake.founder,
      idea: sample.intake.idea,
      businessConcept: BusinessConceptEngine.generate(sample.intake).data,
    },
    "traditional_plan",
  );
  const [artifact] = await exports.exportBusinessPlan("markdown", plan);
  assert.ok(artifact);
  const markdown = String(artifact.contents);

  for (const warning of [
    NO_BUSINESS_SUCCESS_GUARANTEE,
    NO_FUNDING_GUARANTEE,
    NO_PROFESSIONAL_ADVICE,
    OFFICIAL_AGENCY_VERIFICATION,
    CPA_BOOKKEEPER_REVIEW,
    ATTORNEY_REVIEW,
    ESTIMATED_DATA_LABEL,
  ]) {
    assert.match(markdown, new RegExp(escapeRegex(warning)));
  }
});

function firstSample() {
  const sample = sampleProjects[0];
  assert.ok(sample);
  return sample;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
