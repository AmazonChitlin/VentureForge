import assert from "node:assert/strict";
import test from "node:test";

import {
  GuidedAnswerMapper,
  GuidedProgressService,
  guidedSteps,
} from "@/engine/guided-builder";
import { IntakeEngine } from "@/engine/intake";
import { StateProgramEngine } from "@/engine/state-programs";

function answer(
  field: string,
  stepId: Parameters<typeof GuidedAnswerMapper.createAnswer>[1],
  value: Parameters<typeof GuidedAnswerMapper.createAnswer>[2],
  isUnsure = false,
) {
  return GuidedAnswerMapper.createAnswer(field, stepId, value, {
    isUnsure,
    updatedAt: "2026-06-01T12:00:00.000Z",
  });
}

test("plain-language idea is preserved and mapped into useful hints", () => {
  const mapping = GuidedAnswerMapper.mapAnswers({
    businessIdea: answer(
      "businessIdea",
      "idea_basics",
      "I want a punk record store near ASU that sells shirts and local art.",
    ),
  });

  assert.equal(
    mapping.intake.idea.businessIdea,
    "I want a punk record store near ASU that sells shirts and local art.",
  );
  assert.equal(mapping.intake.idea.industry, "Retail record store");
  assert.equal(mapping.intake.idea.city, "Tempe");
  assert.equal(mapping.intake.idea.state, "AZ");
  assert.ok(mapping.inferredHints.possibleRevenueStreams.includes("records"));
  assert.ok(mapping.fieldMappings.businessIdea.includes("idea.businessIdea"));
});

test("guided text answers preserve spaces while a user is typing", () => {
  const typed = answer(
    "businessIdea",
    "idea_basics",
    "A punk record store ",
  );
  assert.equal(typed.structuredValue, "A punk record store ");

  const mapping = GuidedAnswerMapper.mapAnswers({ businessIdea: typed });
  assert.equal(mapping.intake.idea.businessIdea, "A punk record store");
});

test("partial ZIP code drafts do not crash live answer mapping", () => {
  for (const zipCode of ["", "8", "85", "8538"]) {
    const mapping = GuidedAnswerMapper.mapAnswers({
      businessModel: answer("businessModel", "location_model", "physical_location"),
      state: answer("state", "location_model", "AZ"),
      zipCode: answer("zipCode", "location_model", zipCode),
    });

    assert.equal(mapping.intake.idea.zipCode, "");
  }
});

test("complete ZIP code maps into strict intake data", () => {
  const mapping = GuidedAnswerMapper.mapAnswers({
    businessModel: answer("businessModel", "location_model", "physical_location"),
    state: answer("state", "location_model", "AZ"),
    zipCode: answer("zipCode", "location_model", "85381"),
  });

  assert.equal(mapping.intake.idea.zipCode, "85381");
});

test("invalid draft answer records are ignored instead of throwing during render mapping", () => {
  const mapping = GuidedAnswerMapper.mapAnswers({
    zipCode: {
      field: "",
      rawValue: "8",
      structuredValue: "8",
      isUnsure: false,
      updatedAt: "",
    },
  } as any);

  assert.equal(mapping.intake.idea.zipCode, "");
});

test("unsure answer stays unknown and creates missing information", () => {
  const targetCustomer = answer(
    "targetCustomer",
    "customer_basics",
    null,
    true,
  );
  const mapping = GuidedAnswerMapper.mapAnswers({ targetCustomer });
  const evaluation = IntakeEngine.evaluate(mapping.intake);

  assert.equal(targetCustomer.structuredValue, null);
  assert.equal(targetCustomer.isUnsure, true);
  assert.ok(evaluation.missingInformation.includes("idea.targetCustomer"));
});

test("guided startup checklist maps to editable financial assumptions", () => {
  const mapping = GuidedAnswerMapper.mapAnswers({
    equipmentCost: answer("equipmentCost", "startup_costs", 5000),
    inventoryCost: answer("inventoryCost", "startup_costs", 3000),
    startupSpaceCost: answer("startupSpaceCost", "startup_costs", 2000),
    otherStartupCost: answer("otherStartupCost", "startup_costs", 500),
    monthlyRent: answer("monthlyRent", "startup_costs", 1200),
    pricePerSale: answer("pricePerSale", "money_funding", 25),
    weeklySales: answer("weeklySales", "money_funding", 20),
  });

  assert.equal(mapping.financialAssumptions.startupCosts, 10500);
  assert.equal(mapping.financialAssumptions.equipment, 5000);
  assert.equal(mapping.financialAssumptions.inventory, 3000);
  assert.equal(mapping.financialAssumptions.rent, 1200);
  assert.equal(mapping.financialAssumptions.pricePerUnitService, 25);
  assert.equal(mapping.financialAssumptions.expectedUnitSales, 80);
});

test("food, physical-location, and employee flags change the state checklist", () => {
  const mapping = GuidedAnswerMapper.mapAnswers({
    businessIdea: answer("businessIdea", "idea_basics", "A food truck"),
    businessModel: answer("businessModel", "location_model", "physical_location"),
    city: answer("city", "location_model", "Phoenix"),
    county: answer("county", "location_model", "Maricopa"),
    state: answer("state", "location_model", "AZ"),
    zipCode: answer("zipCode", "location_model", "85004"),
    regulatedActivities: answer("regulatedActivities", "state_legal", ["food"]),
    hasEmployees: answer("hasEmployees", "state_legal", true),
  });
  const checklist = StateProgramEngine.generateChecklist(
    mapping.stateProgramInput,
  ).data;
  const categories = checklist.checklist.map((item) => item.category);

  assert.ok(categories.includes("health_department"));
  assert.ok(categories.includes("zoning"));
  assert.ok(categories.includes("workers_compensation"));
});

test("guided progress accepts an explicit unsure answer without inventing data", () => {
  const initial = GuidedProgressService.createInitialState("test-project");
  const state = {
    ...initial,
    currentStepIndex: guidedSteps.findIndex(
      (step) => step.id === "startup_costs",
    ),
    answers: {
      startupCosts: answer("startupCosts", "startup_costs", null, true),
    },
  };

  assert.equal(GuidedProgressService.getProgress(state).canContinue, true);
});
