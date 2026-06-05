import assert from "node:assert/strict";
import test from "node:test";

import { FinancialEngine } from "../engine/financials";
import {
  FundingEngine,
  fundingOpportunityTemplates,
  type FundingCategory,
  type FundingEngineInput,
} from "../engine/funding";
import { sampleProjects } from "../../prisma/seed-data";

test("veteran-owned input returns a veteran-related program pathway", () => {
  const result = matchSample(0, {
    ownershipAttributes: { veteranOwned: true },
  });

  assert.ok(hasType(result, "veteran_owned_program"));
  assert.ok(
    result.data.matches
      .find((match) => match.type === "veteran_owned_program")
      ?.whyItMayNotFit.some((reason) => /does not by itself establish/i.test(reason)),
  );
});

test("high-growth software business can show angel and VC research paths", () => {
  const result = matchSample(2, {
    idea: {
      businessIdea:
        "A scalable software platform for mobile service operators with recurring subscriptions.",
      productOrService: "Subscription SaaS scheduling and operations platform",
      industry: "Software as a service",
      businessModel: "subscription",
    },
    scalableHighGrowth: true,
  });

  assert.ok(hasType(result, "angel_investment"));
  assert.ok(hasType(result, "venture_capital"));
});

test("food truck does not prioritize or suggest venture capital", () => {
  const result = matchSample(1);

  assert.equal(hasType(result, "venture_capital"), false);
  assert.ok(
    result.data.priorityMatches.some((match) =>
      [
        "sba_7a",
        "sba_lender_match",
        "cdfi_loan",
        "local_community_bank",
        "equipment_financing",
      ].includes(match.type),
    ),
  );
});

test("missing financials lower the funding-readiness score", () => {
  const withFinancials = matchSample(2);
  const withoutFinancials = matchSample(2, { omitFinancialProjection: true });
  const financialCategory = withoutFinancials.data.fundingReadinessScore.categoryScores.find(
    (category) => category.category === "financial_projection_completeness",
  );

  assert.ok(
    withFinancials.data.fundingReadinessScore.score >
      withoutFinancials.data.fundingReadinessScore.score,
  );
  assert.equal(financialCategory?.score, 0);
  assert.ok(
    withoutFinancials.warnings.some((warning) =>
      /financial projections are missing/i.test(warning),
    ),
  );
});

test("all returned matches include risks, non-fit reasons, and next steps", () => {
  const result = matchSample(4, {
    ownershipAttributes: {
      disabledVeteranOwned: true,
      veteranOwned: true,
      womanOwned: true,
      minorityOwned: true,
      ruralOwned: true,
      tribalOwned: true,
    },
    federalContractingInterest: true,
  });

  assert.ok(result.data.matches.length > 0);
  for (const match of result.data.matches) {
    assert.ok(match.riskNotes.length > 0);
    assert.ok(match.whyItMayNotFit.length > 0);
    assert.ok(match.nextSteps.length > 0);
    assert.equal(match.officialSourceRequired, true);
    assert.equal(match.verificationStatus, "template_requires_verification");
  }
});

test("catalog covers every requested funding category", () => {
  const expectedCategories = [
    "sba_7a",
    "sba_504",
    "sba_microloan",
    "sba_lender_match",
    "cdfi_loan",
    "local_community_bank",
    "credit_union",
    "state_grant",
    "local_economic_development_incentive",
    "grants_gov",
    "sam_gov_contracting_pathway",
    "sbir_sttr",
    "veteran_owned_program",
    "disabled_veteran_owned_program",
    "woman_owned_program",
    "minority_owned_program",
    "rural_program",
    "tribal_program",
    "crowdfunding",
    "equipment_financing",
    "bootstrapping",
    "friends_family",
    "angel_investment",
    "venture_capital",
  ] satisfies FundingCategory[];

  assert.deepEqual(
    new Set(fundingOpportunityTemplates.map((template) => template.type)),
    new Set(expectedCategories),
  );
});

function matchSample(
  sampleIndex: number,
  options: {
    idea?: Partial<FundingEngineInput["idea"]>;
    ownershipAttributes?: Partial<
      FundingEngineInput["founder"]["ownershipAttributes"]
    >;
    scalableHighGrowth?: boolean;
    federalContractingInterest?: boolean;
    omitFinancialProjection?: boolean;
  } = {},
) {
  const sample = sampleProjects[sampleIndex];
  assert.ok(sample);
  const founder = {
    ...sample.intake.founder,
    ownershipAttributes: {
      ...sample.intake.founder.ownershipAttributes,
      ...options.ownershipAttributes,
    },
  };
  const idea = { ...sample.intake.idea, ...options.idea };

  return FundingEngine.match({
    founder,
    idea,
    businessPlanCompleteness: 75,
    collateralReadiness: "partial",
    useOfFundsClarity: "clear",
    legalEntityReadiness: "developing",
    scalableHighGrowth: options.scalableHighGrowth,
    federalContractingInterest: options.federalContractingInterest,
    financialProjection: options.omitFinancialProjection
      ? undefined
      : completeFinancialProjection(
          idea.expectedStartupCosts,
          founder.availableStartupCapital,
        ),
  });
}

function completeFinancialProjection(
  startupCosts: number,
  availableOwnerCapital: number,
) {
  return FinancialEngine.generate({
    startupCosts,
    fixedMonthlyCosts: 2_500,
    variableCosts: 35,
    pricePerUnitService: 100,
    expectedUnitSales: 100,
    grossMarginAssumptions: 0.65,
    payroll: 0,
    rent: 0,
    utilities: 0,
    insurance: 0,
    licenses: 0,
    equipment: 0,
    inventory: 0,
    marketing: 0,
    loanPayments: 0,
    ownerDraw: 0,
    taxEstimatePlaceholder: 0.15,
    availableOwnerCapital,
    openingCash: availableOwnerCapital,
    monthlyGrowthRate: 0,
    annualGrowthRate: 0.05,
  }).data;
}

function hasType(
  result: ReturnType<typeof FundingEngine.match>,
  type: FundingCategory,
) {
  return result.data.matches.some((match) => match.type === type);
}
