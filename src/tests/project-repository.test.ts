import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BusinessConceptEngine } from "../engine/concept";
import { FeasibilityEngine } from "../engine/feasibility";
import { GuidedAnswerMapper, GuidedProgressService } from "../engine/guided-builder";
import { prisma } from "../lib/prisma";
import { saveEngineOutput } from "../lib/repositories/engineOutputRepository";
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  getGuidedBuilderState,
  getWorkspaceProject,
  saveGuidedBuilderState,
  updateWorkspaceProject,
} from "../lib/repositories/projectRepository";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test(
  "PostgreSQL repository persists projects, guided answers, concepts, and feasibility reports",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run PostgreSQL repository integration coverage." },
  async () => {
    const owner = await prisma.user.create({
      data: {
        email: `repository-owner-${Date.now()}@ventureforge.test`,
        name: "Repository Owner",
      },
    });
    const otherOwner = await prisma.user.create({
      data: {
        email: `repository-other-${Date.now()}@ventureforge.test`,
        name: "Other Owner",
      },
    });
    const project = await createWorkspaceProject({
      businessIdea: "A mobile bookkeeping service for independent restaurants.",
      city: "Pittsburgh",
      name: "Durable Test Studio",
      state: "PA",
      businessModel: "service",
    }, owner.id);

    try {
      const updated = await updateWorkspaceProject(project.id, {
        intake: {
          idea: {
            customerProblem: "Restaurant owners need clearer books without hiring a full-time employee.",
            targetCustomer: "Independent restaurant owners",
          },
        },
      }, owner.id);
      assert.equal(updated?.intake.idea.targetCustomer, "Independent restaurant owners");
      assert.equal(await getWorkspaceProject(project.id, otherOwner.id), undefined);

      const guidedState = GuidedProgressService.createInitialState(project.id);
      guidedState.answers.targetCustomer = GuidedAnswerMapper.createAnswer(
        "targetCustomer",
        "customer_basics",
        "Independent restaurant owners",
      );
      guidedState.answers.productOrService = GuidedAnswerMapper.createAnswer(
        "productOrService",
        "products_services",
        "Monthly bookkeeping, dashboard setup, and cleanup projects.",
      );
      guidedState.answers.pricePerSale = GuidedAnswerMapper.createAnswer(
        "pricePerSale",
        "money_funding",
        450,
      );
      guidedState.updatedAt = new Date().toISOString();
      await saveGuidedBuilderState(project.id, guidedState, owner.id);
      assert.equal(await getGuidedBuilderState(project.id, otherOwner.id), undefined);

      const persistedGuidedState = await getGuidedBuilderState(project.id, owner.id);
      assert.equal(
        persistedGuidedState?.answers.targetCustomer?.structuredValue,
        "Independent restaurant owners",
      );
      assert.equal(
        await prisma.intakeAnswer.count({ where: { projectId: project.id } }),
        3,
      );

      const reloaded = await getWorkspaceProject(project.id, owner.id);
      assert.ok(reloaded);
      assert.equal(reloaded.intake.idea.city, "Pittsburgh");
      assert.equal(reloaded.intake.idea.state, "PA");
      assert.equal(
        reloaded.intake.idea.productOrService,
        "Monthly bookkeeping, dashboard setup, and cleanup projects.",
      );
      assert.equal(reloaded.intake.idea.pricingIdea, "$450 per normal sale");
      assert.equal(reloaded.financialInput.pricePerUnitService, 450);
      const structuredIdea = await prisma.businessIdea.findUnique({
        where: { projectId: project.id },
      });
      assert.equal(
        structuredIdea?.productOrService,
        "Monthly bookkeeping, dashboard setup, and cleanup projects.",
      );
      const concept = BusinessConceptEngine.generate(reloaded.intake);
      assert.equal(await saveEngineOutput(project.id, "concept", concept, owner.id), true);
      assert.equal(await saveEngineOutput(project.id, "concept", concept, otherOwner.id), false);
      const feasibility = FeasibilityEngine.evaluate({
        businessConcept: concept.data,
        founder: reloaded.intake.founder,
        idea: reloaded.intake.idea,
      });
      assert.equal(
        await saveEngineOutput(project.id, "feasibility", feasibility, owner.id),
        true,
      );

      const afterRestartEquivalentReload = await getWorkspaceProject(project.id, owner.id);
      assert.ok(afterRestartEquivalentReload?.outputs.concept);
      assert.ok(afterRestartEquivalentReload?.outputs.feasibility);
      assert.ok(
        await prisma.businessConcept.findUnique({ where: { projectId: project.id } }),
      );
      assert.ok(
        await prisma.feasibilityReport.findUnique({ where: { projectId: project.id } }),
      );
    } finally {
      await deleteWorkspaceProject(project.id, owner.id);
      await prisma.user.deleteMany({
        where: { id: { in: [owner.id, otherOwner.id] } },
      });
      await prisma.$disconnect();
    }
  },
);

test("production routes and orchestration do not import the test memory store", async () => {
  const productionFiles = [
    "src/app/api/projects/route.ts",
    "src/app/api/projects/[id]/route.ts",
    "src/app/api/projects/[id]/run/route.ts",
    "src/app/api/projects/[id]/traceability/route.ts",
    "src/app/api/projects/[id]/guided-builder/route.ts",
    "src/app/api/account/data/route.ts",
    "src/lib/auth/requireProjectAccess.ts",
    "src/lib/project-workspace/orchestrator.ts",
  ];
  for (const file of productionFiles) {
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(contents, /project-workspace\/(?:store|testMemoryStore)/);
    assert.doesNotMatch(contents, /workspaceSession|getWorkspaceUserId/);
  }
});
