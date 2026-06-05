import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { GuidedAnswerMapper, GuidedProgressService } from "../engine/guided-builder";
import { prisma } from "../lib/prisma";
import { runWorkspaceModule } from "../lib/project-workspace/orchestrator";
import { buildTraceabilityReport } from "../lib/project-workspace/traceability";
import { createExportRecord } from "../lib/repositories/exportRepository";
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  getGuidedBuilderState,
  getWorkspaceProject,
  listWorkspaceProjects,
  saveGuidedBuilderState,
  updateWorkspaceProject,
} from "../lib/repositories/projectRepository";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test(
  "project data, generation, exports, and traceability are isolated by user",
  {
    skip: databaseAvailable
      ? false
      : "Set DATABASE_URL to run cross-user authorization coverage.",
  },
  async () => {
    const stamp = Date.now();
    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: {
          email: `authz-a-${stamp}@ventureforge.test`,
          name: "Authz User A",
        },
      }),
      prisma.user.create({
        data: {
          email: `authz-b-${stamp}@ventureforge.test`,
          name: "Authz User B",
        },
      }),
    ]);

    const [projectA, projectB] = await Promise.all([
      createWorkspaceProject(
        {
          businessIdea: "A local record shop for college students.",
          businessModel: "physical_location",
          city: "Tempe",
          name: "User A Records",
          state: "AZ",
        },
        userA.id,
      ),
      createWorkspaceProject(
        {
          businessIdea: "A mobile detailing service.",
          businessModel: "mobile",
          city: "Pittsburgh",
          name: "User B Detail",
          state: "PA",
        },
        userB.id,
      ),
    ]);

    try {
      const dashboardA = await listWorkspaceProjects(userA.id);
      assert.deepEqual(
        dashboardA.map((project) => project.id),
        [projectA.id],
      );
      assert.ok(
        await prisma.dataSourceLog.findFirst({
          where: { action: "project:create", projectId: projectA.id, userId: userA.id },
        }),
      );

      assert.ok(await getWorkspaceProject(projectA.id, userA.id));
      assert.equal(await getWorkspaceProject(projectB.id, userA.id), undefined);
      assert.ok(
        await updateWorkspaceProject(
          projectA.id,
          { name: "User A Records Updated" },
          userA.id,
        ),
      );
      assert.ok(
        await prisma.dataSourceLog.findFirst({
          where: { action: "project:update", projectId: projectA.id, userId: userA.id },
        }),
      );

      assert.equal(
        await updateWorkspaceProject(
          projectB.id,
          { name: "User A should not rename this" },
          userA.id,
        ),
        undefined,
      );
      assert.equal((await getWorkspaceProject(projectB.id, userB.id))?.name, "User B Detail");
      assert.equal(await deleteWorkspaceProject(projectB.id, userA.id), false);
      assert.ok(await getWorkspaceProject(projectB.id, userB.id));

      const leakedGuidedState = GuidedProgressService.createInitialState(projectB.id);
      assert.equal(
        await saveGuidedBuilderState(projectB.id, leakedGuidedState, userA.id),
        undefined,
      );
      assert.equal(await getGuidedBuilderState(projectB.id, userA.id), undefined);

      const guidedStateA = GuidedProgressService.createInitialState(projectA.id);
      guidedStateA.answers.businessIdea = GuidedAnswerMapper.createAnswer(
        "businessIdea",
        "idea_basics",
        "A user-owned record shop draft.",
      );
      await saveGuidedBuilderState(projectA.id, guidedStateA, userA.id);
      assert.ok(
        await prisma.dataSourceLog.findFirst({
          where: { action: "guided_builder:save", projectId: projectA.id, userId: userA.id },
        }),
      );

      const leakedProjectB = await getWorkspaceProject(projectB.id, userB.id);
      assert.ok(leakedProjectB);
      await assert.rejects(
        () => runWorkspaceModule(leakedProjectB, "concept", { userId: userA.id }),
        /Project no longer exists/,
      );

      assert.equal(
        await createExportRecord({
          projectId: projectB.id,
          type: "business_plan_markdown",
          userId: userA.id,
        }),
        undefined,
      );

      const projectBForA = await getWorkspaceProject(projectB.id, userA.id);
      assert.equal(projectBForA, undefined);

      const generatedProjectA = await runWorkspaceModule(projectA, "concept", {
        userId: userA.id,
      });
      const traceabilityA = buildTraceabilityReport(generatedProjectA);
      assert.equal(traceabilityA.projectId, projectA.id);
      assert.ok(traceabilityA.stages.some((stage) => stage.key === "concept" && stage.generated));

      const auditLog = await prisma.dataSourceLog.findFirst({
        where: {
          action: "generate:concept",
          projectId: projectA.id,
          userId: userA.id,
        },
      });
      assert.ok(auditLog);
    } finally {
      await prisma.user.deleteMany({
        where: { id: { in: [userA.id, userB.id] } },
      });
      await prisma.$disconnect();
    }
  },
);

test("project-facing API routes use the shared project access guard", async () => {
  const guardedRoutes = [
    "src/app/api/projects/[id]/route.ts",
    "src/app/api/projects/[id]/guided-builder/route.ts",
    "src/app/api/projects/[id]/run/route.ts",
    "src/app/api/projects/[id]/traceability/route.ts",
    "src/app/api/projects/[id]/exports/route.ts",
    "src/app/project/[id]/layout.tsx",
  ];

  for (const file of guardedRoutes) {
    const contents = await readFile(file, "utf8");
    assert.match(contents, /requireProjectAccess/);
  }
});
