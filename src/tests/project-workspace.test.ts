import assert from "node:assert/strict";
import test from "node:test";

import { runWorkspaceModule } from "../lib/project-workspace/orchestrator";
import {
  createWorkspaceProject,
  getWorkspaceProject,
  updateWorkspaceProject,
} from "../lib/project-workspace/testMemoryStore";
import type { WorkspaceModuleKey } from "../lib/project-workspace/types";

test("workspace project can be created and updated through the persistence boundary", () => {
  const created = createWorkspaceProject({
    name: "Test Consulting Studio",
    businessIdea: "A small consulting studio for neighborhood retailers.",
    city: "Tempe",
    state: "AZ",
    businessModel: "service",
  });
  const updated = updateWorkspaceProject(created.id, {
    intake: {
      idea: {
        targetCustomer: "Independent neighborhood retailers",
        customerProblem: "Owners need help making practical operating decisions.",
      },
    },
  });

  assert.equal(updated?.intake.idea.targetCustomer, "Independent neighborhood retailers");
  assert.deepEqual(updated?.outputs, {});
});

test("workspace orchestrator connects every requested deterministic output", async () => {
  const project = getWorkspaceProject("sample-tempe-vinyl");
  assert.ok(project);
  const modules: WorkspaceModuleKey[] = [
    "intake",
    "concept",
    "market",
    "customers",
    "competitors",
    "feasibility",
    "strategy",
    "execution",
    "financials",
    "funding",
    "state",
    "launch",
    "risk",
    "plan",
    "website",
  ];

  for (const module of modules) {
    await runWorkspaceModule(project, module, { persist: false });
  }

  for (const module of modules) {
    assert.ok(project.outputs[module], `${module} output should be generated`);
  }
  assert.equal((project.outputs.market?.data as any).containsMockData, true);
  assert.ok((project.outputs.plan?.data as any).sections.length >= 1);
  assert.match((project.outputs.website?.data as any).staticExport.html, /^<!doctype html>/i);
});
