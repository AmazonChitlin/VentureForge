import assert from "node:assert/strict";
import test from "node:test";

import { FinancialEngine } from "../engine/financials";

test("break-even calculates correctly", () => {
  const result = FinancialEngine.generate({
    startupCosts: 10_000,
    fixedMonthlyCosts: 1_000,
    variableCosts: 40,
    pricePerUnitService: 100,
    expectedUnitSales: 20,
    availableOwnerCapital: 10_000,
    taxEstimatePlaceholder: 0,
  });

  assert.equal(result.data.breakEvenAnalysis.contributionMarginPerUnit, 60);
  assert.equal(result.data.breakEvenAnalysis.breakEvenUnits, 17);
  assert.equal(result.data.breakEvenAnalysis.breakEvenRevenue, 1_700);
});

test("funding gap calculates correctly", () => {
  const result = FinancialEngine.generate({
    startupCosts: 30_000,
    availableOwnerCapital: 10_000,
  });

  assert.equal(result.data.fundingGap.value, 20_000);
  assert.match(result.data.fundingGap.formula, /startup costs - owner capital/i);
});

test("changing rent changes cash flow", () => {
  const lowRent = forecastWithRent(500);
  const highRent = forecastWithRent(1_500);

  assert.equal(
    lowRent.data.cashFlowForecast[0].endingCash -
      highRent.data.cashFlowForecast[0].endingCash,
    1_000,
  );
  assert.equal(
    lowRent.data.monthlyProfitLoss12Months[0].fixedOperatingCosts,
    500,
  );
  assert.equal(
    highRent.data.monthlyProfitLoss12Months[0].fixedOperatingCosts,
    1_500,
  );
});

test("missing inputs create labeled placeholder assumptions and warnings", () => {
  const result = FinancialEngine.generate({});
  const placeholders = result.data.editableAssumptions.filter(
    (assumption) => assumption.isPlaceholder,
  );

  assert.ok(placeholders.length > 0);
  assert.ok(result.missingInformation.length > 0);
  assert.ok(result.confidence < 50);
  assert.ok(result.warnings.some((warning) => /placeholder assumptions/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /CPA or bookkeeper/i.test(warning)));
  assert.match(result.data.assumptionsNarrative, /marked as placeholders/i);
});

function forecastWithRent(rent: number) {
  return FinancialEngine.generate({
    startupCosts: 5_000,
    variableCosts: 20,
    pricePerUnitService: 100,
    expectedUnitSales: 20,
    rent,
    availableOwnerCapital: 5_000,
    openingCash: 5_000,
    taxEstimatePlaceholder: 0,
  });
}
