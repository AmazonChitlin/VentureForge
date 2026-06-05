import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../lib/prisma";
import {
  markEngineOutputFailed,
  markEngineOutputPending,
  replaceBusinessPlanSections,
  replaceFundingMatches,
  replaceLaunchTasks,
  replaceRiskItems,
  replaceWebsitePages,
} from "../lib/repositories/engineOutputRepository";
import {
  createWorkspaceProject,
  deleteAllWorkspaceProjectsForUser,
  deleteWorkspaceProject,
  getWorkspaceProject,
} from "../lib/repositories/projectRepository";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test(
  "failed business plan write rolls back all sections",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("plan-rollback");
    try {
      await replaceBusinessPlanSections(project.id, [
        section("executive_summary", "Executive Summary"),
        section("market_research", "Market Research"),
      ], {
        planType: "traditional_plan",
        title: "Original Plan",
        userId: user.id,
      });

      await assert.rejects(() =>
        replaceBusinessPlanSections(project.id, [
          section("executive_summary", "Broken Executive Summary"),
          section("executive_summary", "Duplicate Executive Summary"),
        ], {
          planType: "traditional_plan",
          title: "Broken Plan",
          userId: user.id,
        }),
      );

      const plan = await prisma.businessPlan.findFirst({
        include: { sections: { orderBy: { title: "asc" } } },
        where: { projectId: project.id },
      });
      assert.equal(plan?.title, "Original Plan");
      assert.equal(plan?.sections.length, 2);
      assert.deepEqual(
        plan?.sections.map((storedSection) => storedSection.title).sort(),
        ["Executive Summary", "Market Research"],
      );
    } finally {
      await cleanup(user.id, project.id);
    }
  },
);

test(
  "regenerating a business plan replaces sections instead of duplicating them",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("plan-regenerate");
    try {
      await replaceBusinessPlanSections(project.id, [
        section("executive_summary", "Executive Summary"),
        section("market_research", "Market Research"),
      ], { userId: user.id });
      await replaceBusinessPlanSections(project.id, [
        section("executive_summary", "Updated Executive Summary"),
      ], { userId: user.id });

      assert.equal(await prisma.businessPlan.count({ where: { projectId: project.id } }), 1);
      assert.equal(
        await prisma.businessPlanSection.count({
          where: { plan: { projectId: project.id } },
        }),
        1,
      );
      const storedSection = await prisma.businessPlanSection.findFirst({
        where: { plan: { projectId: project.id } },
      });
      assert.equal(storedSection?.title, "Updated Executive Summary");
    } finally {
      await cleanup(user.id, project.id);
    }
  },
);

test(
  "locked business plan sections are not overwritten by persistence regeneration",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("plan-locked");
    try {
      await replaceBusinessPlanSections(project.id, [
        { ...section("executive_summary", "Executive Summary"), locked: true, narrative: "Original locked narrative." },
        section("market_research", "Market Research"),
      ], { userId: user.id });
      await replaceBusinessPlanSections(project.id, user.id, [
        { ...section("executive_summary", "Regenerated Executive Summary"), narrative: "New generated narrative." },
        section("funding_request", "Funding Request"),
      ]);

      const sections = await prisma.businessPlanSection.findMany({
        orderBy: { sectionKey: "asc" },
        where: { plan: { projectId: project.id } },
      });
      const executiveSummary = sections.find((storedSection) => storedSection.sectionKey === "executive_summary");
      assert.equal(await prisma.businessPlan.count({ where: { projectId: project.id } }), 1);
      assert.equal(executiveSummary?.isLocked, true);
      assert.equal(executiveSummary?.title, "Executive Summary");
      assert.equal(executiveSummary?.narrative, "Original locked narrative.");
      assert.ok(sections.some((storedSection) => storedSection.sectionKey === "funding_request"));
      assert.equal(sections.some((storedSection) => storedSection.sectionKey === "market_research"), false);
    } finally {
      await cleanup(user.id, project.id);
    }
  },
);

test(
  "direct output replacement requires authenticated project ownership",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("plan-ownership");
    const otherUser = await prisma.user.create({
      data: {
        email: `plan-ownership-other-${Date.now()}@ventureforge.test`,
        name: "Wrong Owner",
      },
    });
    try {
      await assert.rejects(() =>
        replaceBusinessPlanSections(project.id, [
          section("executive_summary", "Executive Summary"),
        ]),
      );
      await assert.rejects(() =>
        replaceBusinessPlanSections(project.id, [
          section("executive_summary", "Executive Summary"),
        ], { userId: otherUser.id }),
      );

      await replaceBusinessPlanSections(project.id, [
        section("executive_summary", "Executive Summary"),
      ], { userId: user.id });

      assert.equal(await prisma.businessPlan.count({ where: { projectId: project.id } }), 1);
    } finally {
      await cleanup(user.id, project.id);
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    }
  },
);

test(
  "failed website generation does not create partial website pages",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("website-rollback");
    try {
      await assert.rejects(() =>
        replaceWebsitePages(project.id, [
          websitePage("home", "Home"),
          websitePage("home", "Duplicate Home"),
        ], { userId: user.id }),
      );
      assert.equal(await prisma.websiteProject.count({ where: { projectId: project.id } }), 0);
      assert.equal(
        await prisma.websitePage.count({ where: { website: { projectId: project.id } } }),
        0,
      );

      await replaceWebsitePages(project.id, [
        websitePage("home", "Home"),
        websitePage("about", "About"),
      ], { userId: user.id });
      await assert.rejects(() =>
        replaceWebsitePages(project.id, [
          websitePage("contact", "Contact"),
          websitePage("contact", "Duplicate Contact"),
        ], { userId: user.id }),
      );

      const pages = await prisma.websitePage.findMany({
        orderBy: { slug: "asc" },
        where: { website: { projectId: project.id } },
      });
      assert.deepEqual(
        pages.map((page) => page.slug),
        ["about", "home"],
      );
    } finally {
      await cleanup(user.id, project.id);
    }
  },
);

test(
  "funding regeneration replaces matches consistently",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("funding-replace");
    const firstId = `${project.id}-cdfi`;
    const secondId = `${project.id}-microloan`;
    try {
      await replaceFundingMatches(project.id, [
        fundingMatch(firstId, "CDFI loan template", 82),
        fundingMatch(secondId, "SBA microloan template", 78),
      ], { userId: user.id });
      assert.equal(await prisma.fundingMatch.count({ where: { projectId: project.id } }), 2);

      await replaceFundingMatches(project.id, [
        fundingMatch(secondId, "SBA microloan template", 88),
      ], { userId: user.id });

      const matches = await prisma.fundingMatch.findMany({
        include: { opportunity: true },
        where: { projectId: project.id },
      });
      assert.equal(matches.length, 1);
      assert.equal(matches[0]?.opportunityId, secondId);
      assert.equal(matches[0]?.matchScore, 88);
    } finally {
      await cleanup(user.id, project.id, [firstId, secondId]);
    }
  },
);

test(
  "launch roadmap regeneration does not duplicate tasks",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("launch-replace");
    try {
      await replaceLaunchTasks(project.id, user.id, [
        launchTask("today", "Validate demand"),
        launchTask("today", "Validate demand"),
      ], { scope: "launch_roadmap" });
      assert.equal(await prisma.launchTask.count({ where: { projectId: project.id } }), 1);

      await replaceLaunchTasks(project.id, [
        launchTask("30_days", "Open bookkeeping system"),
      ], { scope: "launch_roadmap", userId: user.id });
      const tasks = await prisma.launchTask.findMany({ where: { projectId: project.id } });
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0]?.title, "Open bookkeeping system");
    } finally {
      await cleanup(user.id, project.id);
    }
  },
);


test(
  "risk regeneration does not duplicate risks",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("risk-replace");
    try {
      await replaceRiskItems(project.id, user.id, [
        riskItem("funding risk", "Funding may be delayed."),
        riskItem("funding risk", "Funding may be delayed."),
      ]);
      assert.equal(await prisma.riskItem.count({ where: { projectId: project.id } }), 1);

      await replaceRiskItems(project.id, user.id, [
        riskItem("cash flow risk", "Monthly cash may run short."),
      ]);
      const risks = await prisma.riskItem.findMany({ where: { projectId: project.id } });
      assert.equal(risks.length, 1);
      assert.equal(risks[0]?.category, "cash flow risk");
    } finally {
      await cleanup(user.id, project.id);
    }
  },
);

test(
  "failed generation stores a safe retryable status message",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("status-failed");
    try {
      assert.equal(await markEngineOutputPending(project.id, "plan", user.id), true);
      assert.equal(
        await markEngineOutputFailed(
          project.id,
          "plan",
          user.id,
          new Error("DATABASE_URL=postgresql://user:open-sesame@localhost/db password=open-sesame Unique constraint failed"),
        ),
        true,
      );

      const reloaded = await getWorkspaceProject(project.id, user.id);
      const status = reloaded?.generationStatuses.plan;
      assert.equal(status?.status, "failed");
      assert.equal(status?.retryAvailable, true);
      assert.ok(status?.startedAt);
      assert.equal(status?.completedAt, null);
      assert.ok(status?.failedAt);
      assert.equal(status?.sanitizedErrorMessage, status?.errorMessage);
      assert.match(status?.errorMessage ?? "", /rolled this generation back|could not safely save/i);
      assert.doesNotMatch(status?.errorMessage ?? "", /postgresql:\/\//i);
      assert.doesNotMatch(status?.errorMessage ?? "", /open-sesame/i);
    } finally {
      await cleanup(user.id, project.id);
    }
  },
);

test(
  "project deletion removes related records in a safe transaction",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const { project, user, cleanup } = await createTransactionTestProject("project-delete");
    const fundingId = `${project.id}-delete-cdfi`;
    try {
      await replaceFundingMatches(project.id, user.id, [fundingMatch(fundingId, "CDFI delete test", 72)]);
      await replaceLaunchTasks(project.id, user.id, [launchTask("today", "Delete path task")]);
      await replaceRiskItems(project.id, user.id, [riskItem("funding risk", "Delete path risk.")]);

      assert.equal(await deleteWorkspaceProject(project.id, user.id), true);
      assert.equal(await prisma.businessProject.count({ where: { id: project.id } }), 0);
      assert.equal(await prisma.fundingMatch.count({ where: { projectId: project.id } }), 0);
      assert.equal(await prisma.launchTask.count({ where: { projectId: project.id } }), 0);
      assert.equal(await prisma.riskItem.count({ where: { projectId: project.id } }), 0);
    } finally {
      await prisma.fundingOpportunity.deleteMany({ where: { id: fundingId } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);


test(
  "account data deletion removes only the current user project data",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run transaction-safe generation tests." },
  async () => {
    const first = await createTransactionTestProject("account-delete-a");
    const second = await createTransactionTestProject("account-delete-b");
    try {
      assert.equal(await deleteAllWorkspaceProjectsForUser(first.user.id), 1);
      assert.equal(await prisma.businessProject.count({ where: { userId: first.user.id } }), 0);
      assert.equal(await prisma.businessProject.count({ where: { userId: second.user.id } }), 1);
    } finally {
      await prisma.user.deleteMany({ where: { id: first.user.id } });
      await deleteWorkspaceProject(second.project.id, second.user.id);
      await prisma.user.deleteMany({ where: { id: second.user.id } });
      await prisma.$disconnect();
    }
  },
);

function section(key: string, title: string) {
  return {
    key,
    title,
    narrative: `${title} narrative.`,
    locked: false,
  };
}

function websitePage(slug: string, title: string) {
  return {
    slug,
    title,
    headline: title,
    introduction: `${title} introduction.`,
    sections: [],
  };
}


function launchTask(bucket: string, title: string) {
  return {
    bucket,
    title,
    status: "not_started",
    KPI: "Evidence collected",
  };
}

function riskItem(category: string, description: string) {
  return {
    category,
    description,
    mitigation: "Review weekly and adjust before spending heavily.",
    contingencyPlan: "Pause nonessential spending and retest the assumption.",
  };
}

function fundingMatch(id: string, opportunityName: string, matchScore: number) {
  return {
    id,
    opportunityName,
    source: "Template requiring official verification",
    type: "cdfi_loan",
    url: "https://example.com/funding-template",
    matchScore,
    nextSteps: ["Verify current eligibility with the official program."],
    riskNotes: ["Final eligibility is determined by the lender or program."],
  };
}

async function createTransactionTestProject(label: string) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      email: `${label}-${stamp}@ventureforge.test`,
      name: "Transaction Test User",
    },
  });
  const project = await createWorkspaceProject({
    businessIdea: "A service business for transaction testing.",
    businessModel: "service",
    city: "Tempe",
    name: `Transaction ${label}`,
    state: "AZ",
  }, user.id);

  return {
    cleanup: async (
      userId: string,
      projectId: string,
      fundingOpportunityIds: string[] = [],
    ) => {
      await deleteWorkspaceProject(projectId, userId);
      await prisma.fundingOpportunity.deleteMany({
        where: { id: { in: fundingOpportunityIds } },
      });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    },
    project,
    user,
  };
}
