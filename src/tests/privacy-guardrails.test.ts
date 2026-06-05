import assert from "node:assert/strict";
import test from "node:test";

import {
  BusinessConceptAIService,
  MockLLMClient,
} from "../ai";
import { GuidedAnswerMapper, GuidedProgressService } from "../engine/guided-builder";
import { BusinessConceptEngine } from "../engine/concept";
import { prisma } from "../lib/prisma";
import {
  replaceBusinessPlanSections,
  saveEngineOutput,
} from "../lib/repositories/engineOutputRepository";
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  getGuidedBuilderState,
  getWorkspaceProject,
  saveGuidedBuilderState,
  updateWorkspaceProject,
} from "../lib/repositories/projectRepository";
import {
  scanSensitiveInput,
  SensitiveInputBlockedError,
} from "../lib/security/sensitiveInputScanner";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test("SSN-like input is blocked", () => {
  const result = scanSensitiveInput({
    businessIdea: "My SSN is 123-45-6789 and I want a shop.",
  });

  assert.equal(result.shouldBlock, true);
  assert.ok(result.blockedFindings.some((finding) => finding.type === "ssn"));
});

test("credit-card-like input is blocked", () => {
  const result = scanSensitiveInput({
    notes: "Use card 4111 1111 1111 1111 for testing.",
  });

  assert.equal(result.shouldBlock, true);
  assert.ok(
    result.blockedFindings.some((finding) => finding.type === "credit_card"),
  );
});

test("bank-account-like long number is blocked", () => {
  const result = scanSensitiveInput({
    notes: "The checking account number is 123456789012345.",
  });

  assert.equal(result.shouldBlock, true);
  assert.ok(
    result.blockedFindings.some((finding) => finding.type === "bank_account_number"),
  );
});

test("password-looking pasted text is blocked", () => {
  const result = scanSensitiveInput({
    notes: "Temporary password: correct horse battery staple 9!",
  });

  assert.equal(result.shouldBlock, true);
  assert.ok(result.blockedFindings.some((finding) => finding.type === "password"));
});

test("private API-key-looking input is blocked", () => {
  const result = scanSensitiveInput({
    notes: "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
  });

  assert.equal(result.shouldBlock, true);
  assert.ok(result.blockedFindings.some((finding) => finding.type === "api_key"));
});

test("EIN-like input shows caution without a hard block", () => {
  const result = scanSensitiveInput({
    notes: "Possible EIN: 12-3456789.",
  });

  assert.equal(result.shouldBlock, false);
  assert.ok(result.cautionFindings.some((finding) => finding.type === "ein"));
  assert.match(result.summary, /Caution/i);
});

test(
  "blocked sensitive guided-builder text is not persisted",
  {
    skip: databaseAvailable
      ? false
      : "Set DATABASE_URL to run privacy persistence coverage.",
  },
  async () => {
    const user = await prisma.user.create({
      data: {
        email: `privacy-${Date.now()}@ventureforge.test`,
        name: "Privacy Tester",
      },
    });
    const project = await createWorkspaceProject(
      {
        businessIdea: "A safe planning project.",
        businessModel: "service",
        city: "Tempe",
        name: "Privacy Test",
        state: "AZ",
      },
      user.id,
    );

    try {
      const state = GuidedProgressService.createInitialState(project.id);
      state.answers.businessIdea = GuidedAnswerMapper.createAnswer(
        "businessIdea",
        "idea_basics",
        "I pasted 123-45-6789 by mistake.",
      );

      await assert.rejects(
        () => saveGuidedBuilderState(project.id, state, user.id),
        SensitiveInputBlockedError,
      );
      assert.equal(await getGuidedBuilderState(project.id, user.id), undefined);
      assert.equal(
        await prisma.intakeAnswer.count({ where: { projectId: project.id } }),
        0,
      );

      state.answers.businessIdea = GuidedAnswerMapper.createAnswer(
        "businessIdea",
        "idea_basics",
        "A safe neighborhood music shop idea.",
      );
      await saveGuidedBuilderState(project.id, state, user.id);

      const saved = await getGuidedBuilderState(project.id, user.id);
      assert.equal(saved?.answers.businessIdea?.rawValue, "A safe neighborhood music shop idea.");
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);

test(
  "blocked sensitive project and financial text is not persisted",
  {
    skip: databaseAvailable
      ? false
      : "Set DATABASE_URL to run privacy persistence coverage.",
  },
  async () => {
    const user = await prisma.user.create({
      data: {
        email: `privacy-update-${Date.now()}@ventureforge.test`,
        name: "Privacy Update Tester",
      },
    });
    const project = await createWorkspaceProject(
      {
        businessIdea: "A safe planning project.",
        businessModel: "service",
        city: "Tempe",
        name: "Privacy Update Test",
        state: "AZ",
      },
      user.id,
    );

    try {
      await assert.rejects(
        () =>
          updateWorkspaceProject(
            project.id,
            {
              intake: {
                idea: {
                  businessIdea: "Use card 4111 1111 1111 1111 for the startup purchase.",
                },
              },
            },
            user.id,
          ),
        SensitiveInputBlockedError,
      );
      await assert.rejects(
        () =>
          updateWorkspaceProject(
            project.id,
            {
              financialInput: {
                startupCosts: 4111111111111111,
              },
            },
            user.id,
          ),
        SensitiveInputBlockedError,
      );

      const reloaded = await getWorkspaceProject(project.id, user.id);
      assert.equal(reloaded?.intake.idea.businessIdea, "A safe planning project.");
      assert.notEqual(reloaded?.financialInput.startupCosts, 4111111111111111);
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);

test(
  "blocked sensitive business-plan section text is not persisted",
  {
    skip: databaseAvailable
      ? false
      : "Set DATABASE_URL to run privacy persistence coverage.",
  },
  async () => {
    const user = await prisma.user.create({
      data: {
        email: `privacy-plan-${Date.now()}@ventureforge.test`,
        name: "Privacy Plan Tester",
      },
    });
    const project = await createWorkspaceProject(
      {
        businessIdea: "A safe planning project.",
        businessModel: "service",
        city: "Tempe",
        name: "Privacy Plan Test",
        state: "AZ",
      },
      user.id,
    );

    try {
      await assert.rejects(
        () =>
          replaceBusinessPlanSections(
            project.id,
            [
              {
                key: "executive_summary",
                narrative: "Founder accidentally pasted password: correct horse battery staple 9!",
                title: "Executive Summary",
              },
            ],
            { userId: user.id },
          ),
        SensitiveInputBlockedError,
      );
      assert.equal(await prisma.businessPlan.count({ where: { projectId: project.id } }), 0);
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);

test("blocked sensitive text is not sent to an AI service", async () => {
  let called = false;
  const service = new BusinessConceptAIService(
    new MockLLMClient(() => {
      called = true;
      return {};
    }),
  );

  const attempt = await service.enhanceSafely({
    businessIdea:
      "The founder pasted SSN 123-45-6789 and api_key=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890.",
  });

  assert.equal(attempt.status, "unavailable");
  assert.equal(called, false);
  assert.match(attempt.error, /sensitive information/i);
});

test(
  "Delete project removes related engine and audit records",
  {
    skip: databaseAvailable
      ? false
      : "Set DATABASE_URL to run delete-project privacy coverage.",
  },
  async () => {
    const user = await prisma.user.create({
      data: {
        email: `privacy-delete-${Date.now()}@ventureforge.test`,
        name: "Privacy Delete Tester",
      },
    });
    const project = await createWorkspaceProject(
      {
        businessIdea: "A safe concept project.",
        businessModel: "service",
        city: "Phoenix",
        name: "Delete Cascade Test",
        state: "AZ",
      },
      user.id,
    );

    try {
      const concept = BusinessConceptEngine.generate(project.intake);
      assert.equal(await saveEngineOutput(project.id, "concept", concept, user.id), true);
      assert.equal(
        await prisma.businessConcept.count({ where: { projectId: project.id } }),
        1,
      );
      assert.ok(
        await prisma.dataSourceLog.findFirst({
          where: { action: "generate:concept", projectId: project.id, userId: user.id },
        }),
      );

      assert.equal(await deleteWorkspaceProject(project.id, user.id), true);
      assert.equal(
        await prisma.businessProject.count({ where: { id: project.id } }),
        0,
      );
      assert.equal(
        await prisma.businessConcept.count({ where: { projectId: project.id } }),
        0,
      );
      assert.equal(
        await prisma.dataSourceLog.count({ where: { projectId: project.id } }),
        0,
      );
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);
