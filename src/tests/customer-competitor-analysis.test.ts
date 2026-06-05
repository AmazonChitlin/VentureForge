import assert from "node:assert/strict";
import test from "node:test";
import { BusinessConceptEngine } from "../engine/concept/business-concept-engine";
import { CompetitorAnalysisEngine } from "../engine/competitor-analysis/competitor-analysis-engine";
import { CustomerAnalysisEngine } from "../engine/customer-analysis/customer-analysis-engine";
import { sampleProjects } from "../../prisma/seed-data";

test("known competitors appear in competitor-analysis output", () => {
  const sample = vinylSample();
  const result = CompetitorAnalysisEngine.analyze(competitorInput(sample));
  const gridNames = result.data.competitiveGrid.map((entry) => entry.competitorName);

  for (const knownCompetitor of sample.intake.idea.knownCompetitors) {
    assert.ok(gridNames.includes(knownCompetitor));
  }
  assert.ok(result.sources.some((source) => source.sourceType === "user"));
});

test("missing competitors create a next action to research alternatives", () => {
  const sample = vinylSample();
  const result = CompetitorAnalysisEngine.analyze({
    ...competitorInput(sample),
    knownCompetitors: [],
  });

  assert.ok(
    result.nextActions.includes(
      "Research and record direct competitors, indirect alternatives, and substitutes.",
    ),
  );
  assert.ok(result.missingInformation.includes("No competitors have been identified."));
});

test("substitute competition is included", () => {
  const sample = vinylSample();
  const result = CompetitorAnalysisEngine.analyze(competitorInput(sample));

  assert.ok(
    result.data.substituteProductsOrServices.includes("Streaming subscriptions"),
  );
  assert.ok(
    result.data.substituteProductsOrServices.includes(
      "Delay, do-it-yourself, in-house, or no-purchase alternatives",
    ),
  );
});

test("customer questions and test artifacts are generated", () => {
  const sample = vinylSample();
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const result = CustomerAnalysisEngine.generate({
    businessConcept,
    idea: sample.intake.idea,
  });

  assert.ok(result.data.customerValidationQuestions.length >= 5);
  assert.ok(result.data.surveyQuestions.length >= 5);
  assert.ok(result.data.interviewQuestions.length >= 5);
  assert.ok(result.data.focusGroupPrompts.length >= 5);
  assert.ok(result.data.observationalChecklist.length >= 5);
  assert.equal(result.data.landingPageTestCopy.evidenceLabel, "estimated");
  assert.ok(result.nextActions.some((action) => action.includes("Interview")));
});

function vinylSample() {
  const sample = sampleProjects[0];
  assert.ok(sample);
  return sample;
}

function competitorInput(sample: ReturnType<typeof vinylSample>) {
  const { idea } = sample.intake;
  return {
    knownCompetitors: idea.knownCompetitors,
    location: {
      city: idea.city,
      county: idea.county,
      stateCode: idea.state,
      zipCode: idea.zipCode,
    },
    industry: idea.industry,
    targetCustomer: idea.targetCustomer,
    pricingIdea: idea.pricingIdea,
    manualCompetitorRecords: [],
  };
}
