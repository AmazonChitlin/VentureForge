import assert from "node:assert/strict";
import test from "node:test";
import { BusinessConceptEngine } from "../engine/concept/business-concept-engine";
import { FeasibilityEngine } from "../engine/feasibility/feasibility-engine";
import type {
  FeasibilityProjectDraftInput,
  ProofOfConceptEvidence,
} from "../engine/feasibility/schema";
import type { FounderBusinessIntake } from "../engine/intake/schema";

test("idea-only business with no market data returns insufficient data", () => {
  const result = FeasibilityEngine.evaluate(project());

  assert.equal(result.data.recommendation, "insufficient data");
  assert.equal(result.data.categoryScores.length, 15);
  assert.equal(result.data.proofOfConceptScore.stage, "idea_only");
  assert.ok(result.missingInformation.includes("Market research report is missing."));
});

test("repeat sales improve feasibility", () => {
  const ideaOnly = FeasibilityEngine.evaluate(project());
  const withRepeatSales = FeasibilityEngine.evaluate(
    project({
      proofOfConcept: {
        stage: "repeat_sales",
        firstSaleCount: 12,
        repeatCustomerCount: 5,
      },
    }),
  );

  assert.ok(
    withRepeatSales.data.proofOfConceptScore.score >
      ideaOnly.data.proofOfConceptScore.score,
  );
  assert.ok(
    withRepeatSales.data.totalFeasibilityScore >
      ideaOnly.data.totalFeasibilityScore,
  );
});

test("high startup cost and low capital reduce funding feasibility", () => {
  const wellCapitalized = FeasibilityEngine.evaluate(
    project({
      founder: { availableStartupCapital: 80_000, desiredFundingAmount: 0 },
      idea: { expectedStartupCosts: 60_000 },
    }),
  );
  const underCapitalized = FeasibilityEngine.evaluate(
    project({
      founder: { availableStartupCapital: 5_000, desiredFundingAmount: 5_000 },
      idea: { expectedStartupCosts: 180_000 },
    }),
  );

  assert.ok(
    categoryScore(underCapitalized, "funding_feasibility") <
      categoryScore(wellCapitalized, "funding_feasibility"),
  );
  assert.ok(
    underCapitalized.warnings.some((warning) =>
      warning.includes("high relative to available founder capital"),
    ),
  );
});

test("missing market data lowers confidence", () => {
  const withoutMarketData = FeasibilityEngine.evaluate(project());
  const withMarketData = FeasibilityEngine.evaluate(
    project({
      marketResearchReport: {
        demandScore: 70,
        marketSizeScore: 65,
        localOpportunityScore: 72,
        confidence: 68,
        demandSignals: ["Customer interviews indicate recurring interest."],
        missingData: [],
        sources: [
          {
            id: "manual-local-research",
            title: "Local demand notes",
            sourceName: "Founder research",
            sourceType: "manual",
          },
        ],
      },
    }),
  );

  assert.ok(withMarketData.confidence > withoutMarketData.confidence);
});

test("regulatory-heavy business creates a warning", () => {
  const result = FeasibilityEngine.evaluate(
    project({
      idea: {
        industry: "Licensed childcare center",
        productOrService: "Licensed center-based childcare",
        licensingConcerns: ["state childcare license", "zoning", "staff ratios"],
      },
      regulatoryNotes: {
        complexity: "high",
        permits: ["state childcare license"],
        unresolvedItems: ["facility review"],
        highRiskRequirements: ["staff background checks"],
        notes: [],
      },
    }),
  );

  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("High regulatory complexity detected."),
    ),
  );
  assert.ok(categoryScore(result, "legal_regulatory_complexity") < 40);
});

type FeasibilityResult = ReturnType<typeof FeasibilityEngine.evaluate>;

function categoryScore(
  result: FeasibilityResult,
  category: FeasibilityResult["data"]["categoryScores"][number]["category"],
): number {
  const match = result.data.categoryScores.find(
    (item) => item.category === category,
  );
  assert.ok(match);
  return match.score;
}

function project(
  overrides: {
    founder?: Partial<FounderBusinessIntake["founder"]>;
    idea?: Partial<FounderBusinessIntake["idea"]>;
    proofOfConcept?: Partial<ProofOfConceptEvidence>;
    marketResearchReport?: FeasibilityProjectDraftInput["marketResearchReport"];
    regulatoryNotes?: FeasibilityProjectDraftInput["regulatoryNotes"];
  } = {},
): FeasibilityProjectDraftInput {
  const intake = vinylStoreIntake();
  const founder = { ...intake.founder, ...overrides.founder };
  const idea = { ...intake.idea, ...overrides.idea };
  const businessConcept = BusinessConceptEngine.generate({
    founder,
    idea,
  }).data;

  return {
    businessConcept,
    founder,
    idea,
    proofOfConcept: overrides.proofOfConcept ?? {
      stage: "idea_only",
      prototypeNotes: "",
      customerInterviewCount: 0,
      letterOfIntentCount: 0,
      betaCustomerCount: 0,
      firstSaleCount: 0,
      repeatCustomerCount: 0,
      purchaseOrderCount: 0,
      activeMonthlyRevenue: 0,
      notes: [],
    },
    marketResearchReport: overrides.marketResearchReport,
    regulatoryNotes: overrides.regulatoryNotes,
  };
}

function vinylStoreIntake(): FounderBusinessIntake {
  return {
    founder: {
      founderName: "Alex Rivera",
      founderExperience: "Eight years in specialty retail and local events",
      skills: ["retail operations", "customer service", "community partnerships"],
      industryExperience: "Managed inventory and events for a specialty retailer",
      availableStartupCapital: 42_000,
      desiredFundingAmount: 25_000,
      creditReadinessSelfAssessment: "developing",
      riskTolerance: "moderate",
      weeklyAvailableHours: 40,
      launchTimeline: "90 days",
      ownershipAttributes: {
        veteranOwned: false,
        disabledVeteranOwned: false,
        womanOwned: false,
        minorityOwned: false,
        ruralOwned: false,
        tribalOwned: false,
        immigrantOwned: false,
        justiceImpactedFounder: false,
        studentFounder: false,
        seniorFounder: false,
      },
    },
    idea: {
      businessName: "Needle & Groove Records",
      businessIdea: "A neighborhood vinyl record store with curated records and events",
      productOrService: "Vinyl records, accessories, and listening events",
      customerProblem: "Customers want a trusted local place to discover records",
      proposedSolution: "Curated inventory, guidance, and community events",
      targetCustomer: "Collectors, gift shoppers, and younger vinyl listeners",
      city: "Tempe",
      county: "Maricopa County",
      state: "AZ",
      zipCode: "85281",
      businessModel: "physical_location",
      industry: "Specialty retail - prerecorded media",
      naicsGuess: "459210",
      knownCompetitors: ["Local record stores", "Online vinyl marketplaces"],
      pricingIdea: "Used records from $8 to $45",
      expectedStartupCosts: 67_000,
      staffingPlan: "Founder-operated at launch",
      requiredEquipment: ["point-of-sale", "display fixtures"],
      licensingConcerns: ["Arizona tax registration", "local zoning"],
      fundingNeed: "Supplement founder capital for inventory and fixtures",
      websiteNeeds: "Local-search landing page and inventory highlights",
    },
  };
}
