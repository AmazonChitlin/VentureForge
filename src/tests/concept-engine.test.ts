import assert from "node:assert/strict";
import test from "node:test";
import { BusinessConceptEngine } from "../engine/concept/business-concept-engine";
import type { FounderBusinessIntake } from "../engine/intake/schema";

test("vinyl record store input returns retail and music-related suggestions", () => {
  const result = BusinessConceptEngine.generate(vinylStoreIntake());

  assert.ok(
    result.data.suggestedNaicsCodes.some(
      (suggestion) =>
        suggestion.code === "449210" &&
        suggestion.rationale.includes("prerecorded audio media"),
    ),
  );
  assert.ok(
    result.data.suggestedNaicsCodes.some(
      (suggestion) =>
        suggestion.code === "459510" &&
        suggestion.title.includes("Used Merchandise"),
    ),
  );
  assert.match(result.data.businessConceptStatement, /Vinyl records/i);
  assert.match(result.data.businessConceptStatement, /Before major spending/i);
});

test("food truck input returns a mobile food-service suggestion", () => {
  const input = vinylStoreIntake();
  input.idea = {
    ...input.idea,
    businessName: "Desert Bowl Truck",
    businessIdea: "A food truck serving fresh lunch bowls",
    productOrService: "Fresh lunch bowls from a food truck",
    customerProblem: "Office workers need a quick lunch option near work",
    proposedSolution: "Rotating bowls with online pre-order pickup",
    targetCustomer: "Downtown office workers and event attendees",
    city: "Phoenix",
    zipCode: "85004",
    businessModel: "mobile",
    industry: "Mobile food service",
    naicsGuess: "",
  };

  const result = BusinessConceptEngine.generate(input);

  assert.ok(
    result.data.suggestedNaicsCodes.some(
      (suggestion) =>
        suggestion.code === "722330" &&
        suggestion.title === "Mobile Food Services",
    ),
  );
  assert.equal(result.data.suggestedBusinessType, "Mobile food-service business");
});

test("weak input returns missing information and low confidence", () => {
  const result = BusinessConceptEngine.generate({
    idea: {
      businessIdea: "Maybe a local business",
    },
  });

  assert.ok(result.confidence < 50);
  assert.ok(result.missingInformation.length > 5);
  assert.ok(
    result.missingInformation.includes(
      "The customer problem has not been described.",
    ),
  );
  assert.match(result.data.businessConceptStatement, /still needs definition/i);
});

test("output includes assumptions and next actions", () => {
  const result = BusinessConceptEngine.generate(vinylStoreIntake());

  assert.ok(result.assumptions.length > 0);
  assert.deepEqual(result.data.assumptions, result.assumptions);
  assert.ok(
    result.nextActions.includes(
      "Verify the suggested NAICS candidates against the official Census NAICS reference.",
    ),
  );
  assert.ok(result.sources.some((source) => source.sourceType === "mock"));
  assert.ok(result.sources.some((source) => source.sourceType === "official"));
});

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
