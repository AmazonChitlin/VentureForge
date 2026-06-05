import assert from "node:assert/strict";
import test from "node:test";
import { IntakeEngine } from "../engine/intake/intake-engine";
import type { FounderBusinessIntake } from "../engine/intake/schema";

test("empty intake produces a low score", () => {
  const result = IntakeEngine.evaluate({});

  assert.equal(result.data.completenessScore, 0);
  assert.equal(result.confidence, 0);
  assert.ok(result.data.missingFields.includes("idea.businessIdea"));
  assert.equal(result.sources[0]?.sourceType, "user");
});

test("complete intake produces a high score", () => {
  const result = IntakeEngine.evaluate(completeIntake());

  assert.ok(result.data.completenessScore >= 95);
  assert.equal(result.data.categoryScores.length, 8);
  assert.equal(result.data.missingFields.length, 0);
  assert.ok(
    result.nextActions.includes(
      "Use the reviewed intake as the input to the next engine module.",
    ),
  );
});

test("missing location creates a next-best question", () => {
  const input = completeIntake();
  input.idea.city = "";
  input.idea.county = "";

  const result = IntakeEngine.evaluate(input);

  assert.ok(
    result.data.nextBestQuestions.some((question) =>
      question.includes("Where will the business operate?"),
    ),
  );
  assert.ok(result.data.missingFields.includes("idea.city"));
  assert.ok(result.data.missingFields.includes("idea.county"));
});

test("missing customer problem creates a warning", () => {
  const input = completeIntake();
  input.idea.customerProblem = "";

  const result = IntakeEngine.evaluate(input);

  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("Customer problem is missing."),
    ),
  );
  assert.ok(result.data.missingFields.includes("idea.customerProblem"));
});

function completeIntake(): FounderBusinessIntake {
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
      businessIdea: "A neighborhood vinyl store with curated records and events",
      productOrService: "Vinyl records, accessories, and listening events",
      customerProblem: "Customers want a trusted local place to discover records",
      proposedSolution: "Curated inventory, guidance, and community events",
      targetCustomer: "Collectors, gift shoppers, and younger vinyl listeners",
      city: "Tempe",
      county: "Maricopa County",
      state: "AZ",
      zipCode: "85281",
      businessModel: "physical_location",
      industry: "Retail - prerecorded media",
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
