import assert from "node:assert/strict";
import test from "node:test";
import { BusinessConceptEngine } from "../engine/concept/business-concept-engine";
import { CompetitorAnalysisEngine } from "../engine/competitor-analysis/competitor-analysis-engine";
import { CustomerAnalysisEngine } from "../engine/customer-analysis/customer-analysis-engine";
import { MarketResearchEngine } from "../engine/market-research/market-research-engine";
import { StrategicAnalysisEngine } from "../engine/strategy/strategic-analysis-engine";
import { sampleProjects } from "../../prisma/seed-data";

test("strategy changes when competitor saturation is high", () => {
  const base = pipelineBase();
  const lowSaturation = StrategicAnalysisEngine.generate({
    ...base,
    competitorAnalysis: competitorAnalysisWithThreats("low"),
  });
  const highSaturation = StrategicAnalysisEngine.generate({
    ...base,
    competitorAnalysis: competitorAnalysisWithThreats("high"),
  });

  assert.notEqual(
    lowSaturation.data.strategicRecommendations.positioningStrategy.recommendation,
    highSaturation.data.strategicRecommendations.positioningStrategy.recommendation,
  );
  assert.match(
    highSaturation.data.strategicRecommendations.positioningStrategy.reasoning,
    /saturation appears high/i,
  );
  assert.ok(
    highSaturation.warnings.some((warning) =>
      warning.includes("High competitor saturation detected."),
    ),
  );
});

test("missing market research lowers confidence", async () => {
  const base = pipelineBase();
  const marketResearchReport = (
    await MarketResearchEngine.generate({
      projectId: base.sample.id,
      businessConcept: base.businessConcept,
      idea: base.sample.intake.idea,
      manualResearchEntries: [],
    })
  ).data;
  const withoutMarket = StrategicAnalysisEngine.generate(base);
  const withMarket = StrategicAnalysisEngine.generate({
    ...base,
    marketResearchReport,
  });

  assert.ok(withMarket.confidence > withoutMarket.confidence);
  assert.ok(
    withoutMarket.warnings.some((warning) =>
      warning.includes("Market research is missing."),
    ),
  );
});

test("SWOT includes action items", () => {
  const result = StrategicAnalysisEngine.generate(pipelineBase());

  assert.ok(result.data.swot.actionsToUseStrengths.length > 0);
  assert.ok(result.data.swot.actionsToFixWeaknesses.length > 0);
  assert.ok(result.data.swot.actionsToCaptureOpportunities.length > 0);
  assert.ok(result.data.swot.actionsToReduceThreats.length > 0);
});

test("marketing mix includes service 7Ps where appropriate", () => {
  const sample = detailingSample();
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const customerAnalysis = CustomerAnalysisEngine.generate({
    businessConcept,
    idea: sample.intake.idea,
  }).data;
  const result = StrategicAnalysisEngine.generate({
    businessConcept,
    customerAnalysis,
    founder: sample.intake.founder,
  });

  assert.ok(result.data.marketingMix.people.length > 0);
  assert.ok(result.data.marketingMix.process.length > 0);
  assert.ok(result.data.marketingMix.physicalEvidence.length > 0);
  assert.ok(
    result.data.marketingMix.process.some((item) =>
      item.includes("service flow"),
    ),
  );
});

function pipelineBase() {
  const sample = vinylSample();
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const customerAnalysis = CustomerAnalysisEngine.generate({
    businessConcept,
    idea: sample.intake.idea,
  }).data;
  const competitorAnalysis = CompetitorAnalysisEngine.analyze({
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
  return {
    sample,
    businessConcept,
    customerAnalysis,
    competitorAnalysis,
    founder: sample.intake.founder,
  };
}

function competitorAnalysisWithThreats(threatLevel: "low" | "high") {
  const analysis = pipelineBase().competitorAnalysis;
  return {
    ...analysis,
    competitiveGrid: analysis.competitiveGrid.map((record, index) => ({
      ...record,
      threatLevel: index === 0 ? threatLevel : "unknown" as const,
    })),
  };
}

function vinylSample() {
  const sample = sampleProjects[0];
  assert.ok(sample);
  return sample;
}

function detailingSample() {
  const sample = sampleProjects[2];
  assert.ok(sample);
  return sample;
}
