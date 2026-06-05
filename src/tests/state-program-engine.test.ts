import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StateChecklistTable } from "@/components/project-shell/state-checklist-table";
import {
  getStateProgramResources,
  getSupportedStateCodes,
  listResourcesNeedingVerification,
  listResourcesOlderThan,
  listStatesWithMissingUrls,
  loadAllStateResourceFiles,
  StateProgramEngine,
  toStateProgramPersistenceRecord,
  type StateLaunchChecklist,
} from "../engine/state-programs";
import { sampleProjects } from "../../prisma/seed-data";

test("Arizona project includes Arizona-specific tax and business resources", () => {
  const result = checklistForSample(0, { hasEmployees: false });
  const tpt = findTask(result.data, "sales_tax_or_tpt");

  assert.equal(result.data.stateCode, "AZ");
  assert.equal(result.data.stateName, "Arizona");
  assert.match(tpt.task, /Arizona TPT/i);
  assert.match(tpt.officialUrl ?? "", /azdor\.gov/);
  assert.equal(result.data.entityFormationAgency?.agencyName, "Arizona Corporation Commission");
  assert.equal(result.data.needsVerification, true);
  assert.ok(
    result.data.checklist.some(
      (task) => task.category === "state_tax_registration",
    ),
  );
});

test("Pennsylvania output differs from Arizona", () => {
  const arizona = checklistForSample(0, { hasEmployees: false });
  const pennsylvania = checklistForSample(2, {
    hasEmployees: false,
    sellsTaxableGoodsOrServices: true,
  });
  const pennsylvaniaTax = findTask(pennsylvania.data, "sales_tax_or_tpt");

  assert.equal(pennsylvania.data.stateCode, "PA");
  assert.equal(pennsylvania.data.stateName, "Pennsylvania");
  assert.match(pennsylvaniaTax.task, /Pennsylvania sales-tax/i);
  assert.match(pennsylvaniaTax.officialUrl ?? "", /pa\.gov/);
  assert.notDeepEqual(
    pennsylvania.data.checklist.map((task) => task.id),
    arizona.data.checklist.map((task) => task.id),
  );
});

test("food truck triggers health-department checks", () => {
  const result = checklistForSample(1, { hasEmployees: false });
  const health = findTask(result.data, "health_department");

  assert.match(health.task, /health|food-safety/i);
  assert.match(health.description, /food/i);
  assert.match(health.verifyWithAgencyWarning, /verify with the official/i);
  assert.equal(health.needsVerification, false);
  assert.match(health.lastVerifiedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test("online-only business has fewer zoning and location tasks", () => {
  const sample = sampleProjects[0];
  assert.ok(sample);
  const physical = checklistForSample(0, { hasEmployees: false });
  const online = StateProgramEngine.generateChecklist({
    idea: {
      ...sample.intake.idea,
      businessModel: "online",
      businessIdea: "An online consulting service sold through a website.",
      productOrService: "Remote consulting sessions",
      industry: "Consulting",
    },
    hasEmployees: false,
    sellsTaxableGoodsOrServices: false,
  });

  assert.ok(locationTasks(physical.data).length > locationTasks(online.data).length);
  assert.equal(
    online.data.checklist.some((task) => task.category === "zoning"),
    false,
  );
});

test("staffing plan triggers employer-related tasks", () => {
  const sample = sampleProjects[2];
  assert.ok(sample);
  const result = StateProgramEngine.generateChecklist({
    idea: {
      ...sample.intake.idea,
      staffingPlan: "Hire two employees for launch and run payroll biweekly.",
    },
  });
  const categories = new Set(result.data.checklist.map((task) => task.category));

  assert.equal(result.data.applicabilitySummary.hasEmployees, true);
  assert.ok(categories.has("employer_registration"));
  assert.ok(categories.has("workers_compensation"));
  assert.ok(categories.has("unemployment_insurance"));
});

test("validated resource files support future state expansion", () => {
  assert.deepEqual(getSupportedStateCodes(), ["AZ", "CA", "PA"]);
  assert.equal(loadAllStateResourceFiles().length, 3);

  const firstFile = loadAllStateResourceFiles()[0];
  assert.ok(firstFile);
  assert.equal(firstFile.entityFormationAgency.sourceReliability, "official_curated");
  const firstProgram = getStateProgramResources(firstFile)[0];
  assert.ok(firstProgram);
  const persistenceRecord = toStateProgramPersistenceRecord(firstProgram);
  assert.equal(persistenceRecord.stateCode, firstProgram.stateCode);
  assert.ok(persistenceRecord.lastVerifiedAt instanceof Date);
});

test("AZ, PA, and CA load from structured knowledge JSON files", () => {
  const states = loadAllStateResourceFiles();

  assert.deepEqual(states.map((state) => state.stateCode).sort(), ["AZ", "CA", "PA"]);
  for (const state of states) {
    assert.ok(state.commonBusinessSetupTasks.length > 0);
    assert.ok(state.industrySpecificFlags.length > 0);
    assert.match(state.verifyWarning, /verify/i);
    assert.equal(state.sourceReliability, "official_curated");
  }
});

test("missing URL does not crash checklist and needs-verification badge appears", () => {
  const result = checklistForSample(0, { hasEmployees: false });
  const placeholder = result.data.checklist.find((task) => !task.officialUrl);

  assert.ok(placeholder);
  assert.equal(placeholder.needsVerification, true);
  const markup = renderToStaticMarkup(
    createElement(StateChecklistTable, { tasks: [placeholder] }),
  );
  assert.match(markup, /Needs verification/);
  assert.match(markup, /No single official URL/);
});

test("state resource audit utilities list missing and stale resources", () => {
  const missingUrls = listStatesWithMissingUrls();
  const needingVerification = listResourcesNeedingVerification();
  const staleResources = listResourcesOlderThan(
    180,
    new Date("2026-12-31T00:00:00.000Z"),
  );

  assert.ok(missingUrls.some((item) => item.resourceId.includes("local-requirements-placeholder")));
  assert.ok(needingVerification.some((item) => item.sourceReliability === "placeholder"));
  assert.ok(staleResources.length > 0);
});

function checklistForSample(
  sampleIndex: number,
  options: {
    hasEmployees?: boolean;
    sellsTaxableGoodsOrServices?: boolean;
  } = {},
) {
  const sample = sampleProjects[sampleIndex];
  assert.ok(sample);
  return StateProgramEngine.generateChecklist({
    founder: sample.intake.founder,
    idea: sample.intake.idea,
    ...options,
  });
}

function findTask(
  checklist: StateLaunchChecklist,
  category: StateLaunchChecklist["checklist"][number]["category"],
) {
  const task = checklist.checklist.find((item) => item.category === category);
  assert.ok(task);
  return task;
}

function locationTasks(checklist: StateLaunchChecklist) {
  return checklist.checklist.filter((task) =>
    ["local_business_license", "zoning"].includes(task.category),
  );
}
