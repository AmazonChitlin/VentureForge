import assert from "node:assert/strict";
import test from "node:test";

import { FinancialEngine } from "../engine/financials";
import { RiskEngine, type RiskCategory } from "../engine/risk";
import { sampleProjects } from "../../prisma/seed-data";

test("high funding gap elevates funding and cash-flow risks", () => {
  const sample = sampleProjects[4];
  assert.ok(sample);
  const financialProjection = FinancialEngine.generate({
    startupCosts: 260_000,
    fixedMonthlyCosts: 12_000,
    variableCosts: 45,
    pricePerUnitService: 100,
    expectedUnitSales: 80,
    availableOwnerCapital: 25_000,
    openingCash: 25_000,
  }).data;
  const result = RiskEngine.generate({
    founder: {
      ...sample.intake.founder,
      availableStartupCapital: 25_000,
    },
    idea: sample.intake.idea,
    financialProjection,
  });

  assert.equal(findRisk(result, "funding_risk").likelihood, "high");
  assert.equal(findRisk(result, "cash_flow_risk").likelihood, "high");
  assert.ok(
    result.warnings.some((warning) => /funding gap.*startup costs/i.test(warning)),
  );
});

test("food truck elevates regulatory and supplier risks", () => {
  const result = riskForSample(1);

  assert.equal(findRisk(result, "regulatory_risk").likelihood, "high");
  assert.equal(findRisk(result, "supplier_risk").likelihood, "high");
  assert.ok(
    findRisk(result, "regulatory_risk").evidence.some((item) =>
      /food-service activity detected/i.test(item),
    ),
  );
});

test("low weekly hours creates founder capacity warning", () => {
  const sample = sampleProjects[2];
  assert.ok(sample);
  const result = RiskEngine.generate({
    founder: {
      ...sample.intake.founder,
      weeklyAvailableHours: 8,
    },
    idea: sample.intake.idea,
  });
  const founderRisk = findRisk(result, "founder_burnout_risk");

  assert.equal(founderRisk.likelihood, "high");
  assert.match(founderRisk.description, /only 8 available hours/i);
  assert.ok(
    result.warnings.some((warning) => /capacity is constrained at 8/i.test(warning)),
  );
});

test("physical business creates location and lease exposure", () => {
  const result = riskForSample(0);
  const locationRisk = findRisk(result, "location_risk");

  assert.equal(locationRisk.impact, "high");
  assert.match(locationRisk.description, /physical site|lease/i);
  assert.ok(
    result.warnings.some((warning) => /do not sign a lease/i.test(warning)),
  );
});

test("each risk includes mitigation and contingency plan", () => {
  const result = riskForSample(3);

  assert.equal(result.data.risks.length, 14);
  assert.equal(result.data.contingencyScenarios.length, 8);
  for (const risk of result.data.risks) {
    assert.ok(risk.warningSigns.length > 0);
    assert.ok(risk.mitigation.length > 0);
    assert.ok(risk.contingencyPlan.length > 0);
    assert.ok(risk.owner.length > 0);
    assert.ok(risk.reviewCadence.length > 0);
  }
});

function riskForSample(sampleIndex: number) {
  const sample = sampleProjects[sampleIndex];
  assert.ok(sample);
  return RiskEngine.generate({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
  });
}

function findRisk(
  result: ReturnType<typeof RiskEngine.generate>,
  category: RiskCategory,
) {
  const risk = result.data.risks.find((item) => item.category === category);
  assert.ok(risk);
  return risk;
}
