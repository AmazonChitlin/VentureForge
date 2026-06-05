import type { Prisma } from "@prisma/client";

import type { EngineResult } from "@/engine/shared/engine-result";
import { prisma } from "@/lib/prisma";
import {
  placeholderEngineResult,
  sanitizeGenerationError,
} from "@/lib/project-workspace/generation-status";
import type { WorkspaceModuleKey } from "@/lib/project-workspace/types";
import { logProjectAction } from "@/lib/repositories/auditLogRepository";
import type { RepositoryClient } from "@/lib/repositories/repositorySupport";
import { fromJson, toJson } from "@/lib/repositories/repositorySupport";
import { assertNoBlockedSensitiveInput } from "@/lib/security/sensitiveInputScanner";

interface ReplaceBusinessPlanSectionsOptions {
  db?: RepositoryClient;
  planType?: string;
  title?: string;
  userId?: string;
}

interface ReplaceLaunchTasksOptions {
  db?: RepositoryClient;
  scope?: "all" | "launch_roadmap" | "state_checklist";
  userId?: string;
}

interface ReplaceWebsitePagesOptions {
  db?: RepositoryClient;
  userId?: string;
  websiteContent?: unknown;
}

export async function getEngineOutput<T = unknown>(
  projectId: string,
  moduleKey: WorkspaceModuleKey,
  userId: string,
  db: RepositoryClient = prisma,
): Promise<EngineResult<T> | undefined> {
  const output = await db.engineOutput.findFirst({
    where: { moduleKey, projectId, project: { userId } },
  });
  return output ? fromJson<EngineResult<T>>(output.result, undefined as never) : undefined;
}

export async function listEngineOutputs(
  projectId: string,
  userId: string,
  db: RepositoryClient = prisma,
): Promise<Partial<Record<WorkspaceModuleKey, EngineResult<unknown>>>> {
  const outputs = await db.engineOutput.findMany({
    where: { projectId, project: { userId } },
  });
  return Object.fromEntries(
    outputs.map((output) => [
      output.moduleKey,
      fromJson<EngineResult<unknown>>(output.result, undefined as never),
    ]),
  );
}

export async function saveEngineOutput(
  projectId: string,
  moduleKey: WorkspaceModuleKey,
  output: EngineResult<unknown>,
  userId: string,
): Promise<boolean> {
  const completedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const exists = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id: projectId, userId },
    });
    if (!exists) return false;

    await tx.engineOutput.upsert({
      where: { projectId_moduleKey: { moduleKey, projectId } },
      update: {
        completedAt,
        errorMessage: null,
        failedAt: null,
        result: toJson(output),
        retryAvailable: true,
        sanitizedErrorMessage: null,
        status: "completed",
      },
      create: {
        completedAt,
        moduleKey,
        projectId,
        result: toJson(output),
        retryAvailable: true,
        sanitizedErrorMessage: null,
        startedAt: completedAt,
        status: "completed",
      },
    });
    await persistNormalizedEngineOutput(projectId, moduleKey, output, tx);
    await tx.businessProject.update({
      data: { status: "in_progress" },
      where: { id: projectId },
    });
    await logProjectAction(
      {
        action: `generate:${moduleKey}`,
        projectId,
        providerId: "ventureforge-engine",
        requestMeta: {
          confidence: output.confidence,
          moduleKey,
          sourceCount: output.sources.length,
          warningCount: output.warnings.length,
        },
        sourceType: "engine",
        userId,
      },
      tx,
    );
    return true;
  });
}

export async function markEngineOutputPending(
  projectId: string,
  moduleKey: WorkspaceModuleKey,
  userId: string,
): Promise<boolean> {
  const startedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const exists = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id: projectId, userId },
    });
    if (!exists) return false;

    await tx.engineOutput.upsert({
      where: { projectId_moduleKey: { moduleKey, projectId } },
      update: {
        completedAt: null,
        errorMessage: null,
        failedAt: null,
        retryAvailable: true,
        sanitizedErrorMessage: null,
        startedAt,
        status: "pending",
      },
      create: {
        completedAt: null,
        moduleKey,
        projectId,
        result: toJson(placeholderEngineResult(moduleKey, "pending")),
        retryAvailable: true,
        sanitizedErrorMessage: null,
        startedAt,
        status: "pending",
      },
    });
    await logProjectAction(
      {
        action: `generate_pending:${moduleKey}`,
        projectId,
        providerId: "ventureforge-engine",
        requestMeta: { moduleKey },
        sourceType: "engine",
        status: "pending",
        userId,
      },
      tx,
    );
    return true;
  });
}

export async function markEngineOutputFailed(
  projectId: string,
  moduleKey: WorkspaceModuleKey,
  userId: string,
  error: unknown,
): Promise<boolean> {
  const errorMessage = sanitizeGenerationError(error);
  const failedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const exists = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id: projectId, userId },
    });
    if (!exists) return false;

    await tx.engineOutput.upsert({
      where: { projectId_moduleKey: { moduleKey, projectId } },
      update: {
        completedAt: null,
        errorMessage,
        failedAt,
        retryAvailable: true,
        sanitizedErrorMessage: errorMessage,
        status: "failed",
      },
      create: {
        completedAt: null,
        errorMessage,
        failedAt,
        moduleKey,
        projectId,
        result: toJson(placeholderEngineResult(moduleKey, "failed", errorMessage)),
        retryAvailable: true,
        sanitizedErrorMessage: errorMessage,
        startedAt: failedAt,
        status: "failed",
      },
    });
    await logProjectAction(
      {
        action: `generate_failed:${moduleKey}`,
        projectId,
        providerId: "ventureforge-engine",
        requestMeta: { errorMessage, moduleKey },
        sourceType: "engine",
        status: "failed",
        userId,
      },
      tx,
    );
    return true;
  });
}

export async function deleteEngineOutput(
  projectId: string,
  moduleKey: WorkspaceModuleKey,
  userId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const exists = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id: projectId, userId },
    });
    if (!exists) return false;
    await tx.engineOutput.deleteMany({ where: { moduleKey, projectId } });
    await deleteNormalizedEngineOutput(projectId, moduleKey, tx);
    await logProjectAction(
      {
        action: `delete_output:${moduleKey}`,
        projectId,
        providerId: "ventureforge-engine",
        requestMeta: { moduleKey },
        sourceType: "engine",
        userId,
      },
      tx,
    );
    return true;
  });
}

export async function clearPersistedEngineOutputs(
  projectId: string,
  db: RepositoryClient = prisma,
): Promise<void> {
  await withWriteTransaction(db, async (tx) => {
    await tx.engineOutput.deleteMany({ where: { projectId } });
    await tx.businessConcept.deleteMany({ where: { projectId } });
    await tx.feasibilityReport.deleteMany({ where: { projectId } });
    await tx.marketResearchReport.deleteMany({ where: { projectId } });
    await tx.customerPersona.deleteMany({ where: { projectId } });
    await tx.competitor.deleteMany({ where: { projectId } });
    await tx.strategicAnalysis.deleteMany({ where: { projectId } });
    await tx.strategyExecutionPlan.deleteMany({ where: { projectId } });
    await tx.businessPlan.deleteMany({ where: { projectId } });
    await tx.financialProjection.deleteMany({ where: { projectId } });
    await tx.financialAssumption.deleteMany({ where: { projectId } });
    await tx.fundingMatch.deleteMany({ where: { projectId } });
    await tx.launchTask.deleteMany({ where: { projectId } });
    await tx.riskItem.deleteMany({ where: { projectId } });
    await tx.websiteProject.deleteMany({ where: { projectId } });
  });
}

async function persistNormalizedEngineOutput(
  projectId: string,
  moduleKey: WorkspaceModuleKey,
  output: EngineResult<unknown>,
  db: RepositoryClient = prisma,
): Promise<void> {
  if (hasTransaction(db)) {
    await withWriteTransaction(db, (tx) =>
      persistNormalizedEngineOutput(projectId, moduleKey, output, tx),
    );
    return;
  }

  const data = asRecord(output.data);
  switch (moduleKey) {
    case "concept":
      await db.businessConcept.upsert({
        where: { projectId },
        update: conceptData(data, output),
        create: { projectId, ...conceptData(data, output) },
      });
      return;
    case "feasibility":
      await db.feasibilityReport.upsert({
        where: { projectId },
        update: feasibilityData(data),
        create: { projectId, ...feasibilityData(data) },
      });
      return;
    case "market":
      await db.marketResearchReport.deleteMany({ where: { projectId } });
      await db.marketResearchReport.create({
        data: {
          confidence: numberAt(asRecord(data.confidenceLevel), "score"),
          content: toJson(data),
          projectId,
          sources: {
            create: output.sources.map((source) => ({
              notes: source.notes,
              retrievedAt: source.lastVerifiedAt
                ? new Date(source.lastVerifiedAt)
                : undefined,
              sourceName: source.sourceName,
              sourceType: source.sourceType,
              title: source.title,
              url: source.url,
            })),
          },
        },
      });
      return;
    case "customers":
      await persistCustomerPersonas(projectId, data, db);
      return;
    case "competitors":
      await persistCompetitors(projectId, data, db);
      return;
    case "strategy":
      await db.strategicAnalysis.upsert({
        where: { projectId },
        update: {
          content: toJson(data),
          pestle: { upsert: { create: { content: toJson(data.pestle) }, update: { content: toJson(data.pestle) } } },
          swot: { upsert: { create: { content: toJson(data.swot) }, update: { content: toJson(data.swot) } } },
        },
        create: {
          content: toJson(data),
          pestle: { create: { content: toJson(data.pestle) } },
          projectId,
          swot: { create: { content: toJson(data.swot) } },
        },
      });
      return;
    case "execution":
      await replaceExecutionPlan(projectId, data, db);
      return;
    case "plan":
      await replaceBusinessPlanSections(projectId, data, { db });
      return;
    case "financials":
      await replaceFinancialProjection(projectId, data, db);
      return;
    case "funding":
      await replaceFundingMatches(projectId, data, { db });
      return;
    case "state":
      await replaceLaunchTasks(projectId, arrayAt(data, "checklist"), {
        db,
        scope: "state_checklist",
      });
      return;
    case "launch":
      await replaceLaunchTasks(projectId, data, { db, scope: "launch_roadmap" });
      return;
    case "risk":
      await persistRisks(projectId, data, db);
      return;
    case "website":
      await replaceWebsitePages(projectId, data, { db, websiteContent: data });
      return;
    case "intake":
      return;
  }
}

async function deleteNormalizedEngineOutput(
  projectId: string,
  moduleKey: WorkspaceModuleKey,
  db: RepositoryClient,
): Promise<void> {
  switch (moduleKey) {
    case "concept": await db.businessConcept.deleteMany({ where: { projectId } }); return;
    case "feasibility": await db.feasibilityReport.deleteMany({ where: { projectId } }); return;
    case "market": await db.marketResearchReport.deleteMany({ where: { projectId } }); return;
    case "customers": await db.customerPersona.deleteMany({ where: { projectId } }); return;
    case "competitors": await db.competitor.deleteMany({ where: { projectId } }); return;
    case "strategy": await db.strategicAnalysis.deleteMany({ where: { projectId } }); return;
    case "execution": await db.strategyExecutionPlan.deleteMany({ where: { projectId } }); return;
    case "plan": await db.businessPlan.deleteMany({ where: { projectId } }); return;
    case "financials":
      await db.financialProjection.deleteMany({ where: { projectId } });
      await db.financialAssumption.deleteMany({ where: { projectId } });
      return;
    case "funding": await db.fundingMatch.deleteMany({ where: { projectId } }); return;
    case "state": await db.launchTask.deleteMany({ where: { horizon: "state_checklist", projectId } }); return;
    case "launch": await db.launchTask.deleteMany({ where: { horizon: { not: "state_checklist" }, projectId } }); return;
    case "risk": await db.riskItem.deleteMany({ where: { projectId } }); return;
    case "website": await db.websiteProject.deleteMany({ where: { projectId } }); return;
    case "intake": return;
  }
}

function conceptData(data: Record<string, unknown>, output: EngineResult<unknown>) {
  return {
    assumptions: toJson(output.assumptions),
    confidence: output.confidence,
    content: toJson(data),
    missingInfo: toJson(output.missingInformation),
    statement: textAt(data, "businessConceptStatement"),
    warnings: toJson(output.warnings),
  };
}

function feasibilityData(data: Record<string, unknown>) {
  return {
    content: toJson(data),
    recommendation: textAt(data, "recommendation"),
    totalScore: numberAt(data, "totalFeasibilityScore"),
  };
}

function customerPersonaRecords(input: unknown): Record<string, unknown>[] {
  const data = asRecord(input);
  const personas = Array.isArray(input)
    ? input
    : [data.primaryCustomerPersona, ...arrayAt(data, "secondaryCustomerPersonas")];
  return dedupeBy(
    personas.map(asRecord).filter((persona) => textAt(persona, "name")),
    (persona) => stableKey(textAt(persona, "name")),
  );
}

async function persistCustomerPersonas(
  projectId: string,
  input: unknown,
  db: RepositoryClient,
) {
  const personas = customerPersonaRecords(input);
  await db.customerPersona.deleteMany({ where: { projectId } });
  if (personas.length) {
    await db.customerPersona.createMany({
      data: personas.map((persona) => ({
        content: toJson(persona),
        name: textAt(persona, "name"),
        projectId,
      })),
    });
  }
}

export async function replaceCustomerPersonas(
  projectId: string,
  userId: string,
  personasInput: unknown,
  options: { db?: RepositoryClient } = {},
): Promise<void> {
  assertNoBlockedSensitiveInput(personasInput);
  const db = options.db ?? prisma;
  await withWriteTransaction(db, async (tx) => {
    await assertProjectWriteAccess(tx, projectId, userId);
    await persistCustomerPersonas(projectId, personasInput, tx);
  });
}

function competitorRecords(input: unknown): Record<string, unknown>[] {
  const data = asRecord(input);
  const competitors = Array.isArray(input)
    ? input
    : [...arrayAt(data, "directCompetitors"), ...arrayAt(data, "indirectCompetitors")];
  return dedupeBy(
    competitors.map(asRecord).filter((competitor) => textAt(competitor, "name")),
    (competitor) => `${stableKey(textAt(competitor, "name"))}:${optionalTextAt(competitor, "url") ?? "manual"}`,
  );
}

async function persistCompetitors(
  projectId: string,
  input: unknown,
  db: RepositoryClient,
) {
  const competitors = competitorRecords(input);
  await db.competitor.deleteMany({ where: { projectId } });
  if (competitors.length) {
    await db.competitor.createMany({
      data: competitors.map((competitor) => ({
        content: toJson(competitor),
        name: textAt(competitor, "name"),
        projectId,
        url: optionalTextAt(competitor, "url"),
      })),
    });
  }
}

export async function replaceCompetitors(
  projectId: string,
  userId: string,
  competitorsInput: unknown,
  options: { db?: RepositoryClient } = {},
): Promise<void> {
  assertNoBlockedSensitiveInput(competitorsInput);
  const db = options.db ?? prisma;
  await withWriteTransaction(db, async (tx) => {
    await assertProjectWriteAccess(tx, projectId, userId);
    await persistCompetitors(projectId, competitorsInput, tx);
  });
}

async function replaceExecutionPlan(
  projectId: string,
  data: Record<string, unknown>,
  db: RepositoryClient,
) {
  await db.strategyExecutionPlan.deleteMany({ where: { projectId } });
  await db.strategyExecutionPlan.create({
    data: {
      content: toJson(data),
      initiatives: {
        create: dedupeBy(arrayAt(data, "initiatives").map(asRecord), (item) =>
          stableKey(textAt(item, "title")),
        ).map((initiative) => ({
          content: toJson(initiative),
          priority: textAt(initiative, "priority"),
          status: textAt(initiative, "status"),
          title: textAt(initiative, "title"),
        })),
      },
      projectId,
    },
  });
}

export async function replaceBusinessPlanSections(
  projectId: string,
  userId: string,
  sectionsInput: unknown,
  options?: Omit<ReplaceBusinessPlanSectionsOptions, "userId">,
): Promise<void>;
export async function replaceBusinessPlanSections(
  projectId: string,
  sectionsInput: unknown,
  options?: ReplaceBusinessPlanSectionsOptions,
): Promise<void>;
export async function replaceBusinessPlanSections(
  projectId: string,
  first: unknown,
  second?: unknown,
  third?: Omit<ReplaceBusinessPlanSectionsOptions, "userId">,
): Promise<void> {
  const { input: sectionsInput, options } = resolveReplacementArgs<ReplaceBusinessPlanSectionsOptions>(first, second, third);
  assertNoBlockedSensitiveInput(sectionsInput);
  const db = options.db ?? prisma;
  const shouldVerifyOwnership = hasTransaction(db);
  const plan = asRecord(sectionsInput);
  const sections = Array.isArray(sectionsInput)
    ? sectionsInput
    : arrayAt(plan, "sections");

  await withWriteTransaction(db, async (tx) => {
    if (shouldVerifyOwnership) {
      await assertProjectWriteAccess(tx, projectId, options.userId);
    }
    const lockedSections = await tx.businessPlanSection.findMany({
      where: { isLocked: true, plan: { projectId } },
    });
    const lockedByKey = new Map(lockedSections.map((section) => [section.sectionKey, section]));
    const consumedLockedKeys = new Set<string>();
    const sectionCreates = sections.map((item) => {
      const nextSection = businessPlanSectionCreateData(item);
      const lockedSection = lockedByKey.get(nextSection.sectionKey);
      if (lockedSection) {
        consumedLockedKeys.add(nextSection.sectionKey);
        return lockedBusinessPlanSectionCreateData(lockedSection);
      }
      return nextSection;
    });
    sectionCreates.push(
      ...lockedSections
        .filter((section) => !consumedLockedKeys.has(section.sectionKey))
        .map(lockedBusinessPlanSectionCreateData),
    );

    await tx.businessPlan.deleteMany({ where: { projectId } });
    await tx.businessPlan.create({
      data: {
        planType: options.planType ?? (textAt(plan, "planType") || "generated_plan"),
        projectId,
        sections: { create: sectionCreates },
        title: options.title ?? (textAt(plan, "title") || "Generated Business Plan"),
      },
    });
  });
}

function businessPlanSectionCreateData(item: unknown) {
  const section = asRecord(item);
  return {
    content: toJson(section),
    isLocked: section.locked === true || section.isLocked === true,
    narrative:
      textAt(section, "narrative") ||
      textAt(section, "editableContent") ||
      textAt(section, "content"),
    sectionKey:
      textAt(section, "key") ||
      textAt(section, "sectionKey") ||
      stableKey(textAt(section, "title")),
    title: textAt(section, "title") || "Untitled Section",
  };
}

function lockedBusinessPlanSectionCreateData(section: {
  content: Prisma.JsonValue;
  isLocked: boolean;
  narrative: string;
  sectionKey: string;
  title: string;
}) {
  return {
    content: toJson(section.content),
    isLocked: section.isLocked,
    narrative: section.narrative,
    sectionKey: section.sectionKey,
    title: section.title,
  };
}

async function replaceFinancialProjection(
  projectId: string,
  data: Record<string, unknown>,
  db: RepositoryClient,
) {
  await db.financialProjection.deleteMany({ where: { projectId } });
  await db.financialProjection.create({
    data: { content: toJson(data), projectId, scenario: "complete_projection" },
  });
  await db.financialAssumption.deleteMany({ where: { projectId } });
  const assumptions = arrayAt(data, "editableAssumptions").map(asRecord);
  if (assumptions.length) {
    await db.financialAssumption.createMany({
      data: assumptions.map((assumption) => ({
        key: textAt(assumption, "key"),
        notes: optionalTextAt(assumption, "notes"),
        projectId,
        value: numberAt(assumption, "value"),
      })),
    });
  }
}

export async function replaceFundingMatches(
  projectId: string,
  userId: string,
  matchesInput: unknown,
  options?: { db?: RepositoryClient },
): Promise<void>;
export async function replaceFundingMatches(
  projectId: string,
  matchesInput: unknown,
  options?: { db?: RepositoryClient; userId?: string },
): Promise<void>;
export async function replaceFundingMatches(
  projectId: string,
  first: unknown,
  second?: unknown,
  third?: { db?: RepositoryClient },
): Promise<void> {
  const { input: matchesInput, options } = resolveReplacementArgs<{ db?: RepositoryClient; userId?: string }>(first, second, third);
  assertNoBlockedSensitiveInput(matchesInput);
  const db = options.db ?? prisma;
  const shouldVerifyOwnership = hasTransaction(db);
  const data = asRecord(matchesInput);
  const matches = dedupeBy(
    (Array.isArray(matchesInput) ? matchesInput : arrayAt(data, "matches")).map(asRecord),
    (match) => textAt(match, "id") || stableKey(textAt(match, "opportunityName")),
  );

  await withWriteTransaction(db, async (tx) => {
    if (shouldVerifyOwnership) {
      await assertProjectWriteAccess(tx, projectId, options.userId);
    }
    await tx.fundingMatch.deleteMany({ where: { projectId } });
    for (const match of matches) {
      const id = textAt(match, "id") || stableKey(textAt(match, "opportunityName"));
      await tx.fundingOpportunity.upsert({
        where: { id },
        update: fundingOpportunityData(match),
        create: { id, ...fundingOpportunityData(match) },
      });
      await tx.fundingMatch.create({
        data: {
          content: toJson(match),
          matchScore: numberAt(match, "matchScore"),
          opportunityId: id,
          projectId,
        },
      });
    }
  });
}

function fundingOpportunityData(match: Record<string, unknown>) {
  return {
    content: toJson(match),
    name: textAt(match, "opportunityName"),
    source: textAt(match, "source"),
    type: textAt(match, "type"),
    url: textAt(match, "url"),
  };
}

export async function replaceLaunchTasks(
  projectId: string,
  userId: string,
  tasksInput: unknown,
  options?: Omit<ReplaceLaunchTasksOptions, "userId">,
): Promise<void>;
export async function replaceLaunchTasks(
  projectId: string,
  tasksInput: unknown,
  options?: ReplaceLaunchTasksOptions,
): Promise<void>;
export async function replaceLaunchTasks(
  projectId: string,
  first: unknown,
  second?: unknown,
  third?: Omit<ReplaceLaunchTasksOptions, "userId">,
): Promise<void> {
  const { input: tasksInput, options } = resolveReplacementArgs<ReplaceLaunchTasksOptions>(first, second, third);
  assertNoBlockedSensitiveInput(tasksInput);
  const db = options.db ?? prisma;
  const shouldVerifyOwnership = hasTransaction(db);
  const scope = options.scope ?? "all";
  const data = asRecord(tasksInput);
  const tasks = dedupeBy(
    Array.isArray(tasksInput)
      ? tasksInput.map((task) => ({
          horizon:
            scope === "state_checklist"
              ? "state_checklist"
              : textAt(asRecord(task), "bucket") || "today",
          task: asRecord(task),
        }))
      : launchTasksFromRoadmap(data),
    ({ horizon, task }) => `${horizon}:${stableKey(textAt(task, "title") || textAt(task, "task"))}`,
  );
  const deleteWhere: Prisma.LaunchTaskWhereInput =
    scope === "state_checklist"
      ? { horizon: "state_checklist", projectId }
      : scope === "launch_roadmap"
        ? { horizon: { not: "state_checklist" }, projectId }
        : { projectId };

  await withWriteTransaction(db, async (tx) => {
    if (shouldVerifyOwnership) {
      await assertProjectWriteAccess(tx, projectId, options.userId);
    }
    await tx.launchTask.deleteMany({ where: deleteWhere });
    if (tasks.length) {
      await tx.launchTask.createMany({
        data: tasks.map(({ horizon, task }) => ({
          content: toJson(task),
          horizon,
          projectId,
          status: textAt(task, "status") || "not_started",
          title: textAt(task, "title") || textAt(task, "task") || "Untitled Task",
        })),
      });
    }
  });
}

function riskRecords(input: unknown): Record<string, unknown>[] {
  const data = asRecord(input);
  const risks = Array.isArray(input) ? input : arrayAt(data, "risks");
  return dedupeBy(
    risks.map(asRecord).filter((risk) => textAt(risk, "category") || textAt(risk, "description")),
    (risk) => `${stableKey(textAt(risk, "category"))}:${stableKey(textAt(risk, "description"))}`,
  );
}

async function persistRisks(
  projectId: string,
  input: unknown,
  db: RepositoryClient,
) {
  await db.riskItem.deleteMany({ where: { projectId } });
  const risks = riskRecords(input);
  if (risks.length) {
    await db.riskItem.createMany({
      data: risks.map((risk) => ({
        category: textAt(risk, "category") || "general",
        content: toJson(risk),
        projectId,
      })),
    });
  }
}

export async function replaceRiskItems(
  projectId: string,
  userId: string,
  risksInput: unknown,
  options: { db?: RepositoryClient } = {},
): Promise<void> {
  assertNoBlockedSensitiveInput(risksInput);
  const db = options.db ?? prisma;
  await withWriteTransaction(db, async (tx) => {
    await assertProjectWriteAccess(tx, projectId, userId);
    await persistRisks(projectId, risksInput, tx);
  });
}

export async function replaceWebsitePages(
  projectId: string,
  userId: string,
  pagesInput: unknown,
  options?: Omit<ReplaceWebsitePagesOptions, "userId">,
): Promise<void>;
export async function replaceWebsitePages(
  projectId: string,
  pagesInput: unknown,
  options?: ReplaceWebsitePagesOptions,
): Promise<void>;
export async function replaceWebsitePages(
  projectId: string,
  first: unknown,
  second?: unknown,
  third?: Omit<ReplaceWebsitePagesOptions, "userId">,
): Promise<void> {
  const { input: pagesInput, options } = resolveReplacementArgs<ReplaceWebsitePagesOptions>(first, second, third);
  assertNoBlockedSensitiveInput({
    pages: pagesInput,
    websiteContent: options.websiteContent,
  });
  const db = options.db ?? prisma;
  const shouldVerifyOwnership = hasTransaction(db);
  const data = asRecord(pagesInput);
  const pages = Array.isArray(pagesInput)
    ? pagesInput
    : ["homepage", "aboutPage", "productsServicesPage", "contactPage", "faqPage"].map(
        (key) => data[key],
      );

  await withWriteTransaction(db, async (tx) => {
    if (shouldVerifyOwnership) {
      await assertProjectWriteAccess(tx, projectId, options.userId);
    }
    await tx.websiteProject.deleteMany({ where: { projectId } });
    await tx.websiteProject.create({
      data: {
        content: toJson(options.websiteContent ?? data),
        pages: {
          create: pages.map((item) => {
            const page = asRecord(item);
            return {
              content: toJson(page),
              slug: textAt(page, "slug"),
              title: textAt(page, "title") || "Untitled Page",
            };
          }),
        },
        projectId,
      },
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayAt(record: Record<string, unknown>, key: string): unknown[] {
  return Array.isArray(record[key]) ? record[key] : [];
}

function launchTasksFromRoadmap(
  data: Record<string, unknown>,
): { horizon: string; task: Record<string, unknown> }[] {
  const buckets = [
    ["today", "today"],
    ["thisWeek", "this_week"],
    ["thirtyDays", "30_days"],
    ["sixtyDays", "60_days"],
    ["ninetyDays", "90_days"],
    ["sixMonths", "6_months"],
    ["twelveMonths", "12_months"],
  ] as const;
  return buckets.flatMap(([key, horizon]) =>
    arrayAt(data, key).map((task) => ({ horizon, task: asRecord(task) })),
  );
}

function resolveReplacementArgs<TOptions extends { userId?: string }>(
  first: unknown,
  second?: unknown,
  third?: Omit<TOptions, "userId">,
): { input: unknown; options: TOptions } {
  if (typeof first === "string" && second !== undefined) {
    return {
      input: second,
      options: { ...((third ?? {}) as Record<string, unknown>), userId: first } as TOptions,
    };
  }
  return { input: first, options: (second ?? {}) as TOptions };
}

function dedupeBy<T>(items: T[], keyForItem: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyForItem(item) || String(result.length);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function textAt(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key] : "";
}

function optionalTextAt(record: Record<string, unknown>, key: string): string | undefined {
  return textAt(record, key) || undefined;
}

function numberAt(record: Record<string, unknown>, key: string): number {
  return typeof record[key] === "number" && Number.isFinite(record[key])
    ? record[key]
    : 0;
}

function stableKey(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "generated"
  );
}

async function assertProjectWriteAccess(
  db: RepositoryClient,
  projectId: string,
  userId: string | undefined,
): Promise<void> {
  if (!userId) {
    throw new Error("Authenticated project ownership is required to write project output.");
  }

  const project = await db.businessProject.findFirst({
    select: { id: true },
    where: { id: projectId, userId },
  });
  if (!project) {
    throw new Error("Project not found or you do not have access to it.");
  }
}

async function withWriteTransaction<T>(
  db: RepositoryClient,
  operation: (tx: RepositoryClient) => Promise<T>,
): Promise<T> {
  if (hasTransaction(db)) {
    return (db as unknown as {
      $transaction: <R>(operation: (tx: Prisma.TransactionClient) => Promise<R>) => Promise<R>;
    }).$transaction((tx) => operation(tx));
  }
  return operation(db);
}

function hasTransaction(
  db: RepositoryClient,
): db is RepositoryClient & {
  $transaction: <R>(operation: (tx: Prisma.TransactionClient) => Promise<R>) => Promise<R>;
} {
  return typeof (db as { $transaction?: unknown }).$transaction === "function";
}
