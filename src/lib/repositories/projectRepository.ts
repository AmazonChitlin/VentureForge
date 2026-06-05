import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { ProofOfConceptEvidenceSchema } from "@/engine/feasibility";
import {
  FinancialEngineInputSchema,
  type FinancialEngineInput,
} from "@/engine/financials";
import {
  GuidedAnswerMapper,
  GuidedBuilderStateSchema,
  type GuidedBuilderState,
} from "@/engine/guided-builder";
import {
  FounderBusinessIntakeSchema,
  FounderIntakeSchema,
  BusinessIdeaIntakeSchema,
  type FounderBusinessIntake,
  type FounderIntake,
  type BusinessIdeaIntake,
} from "@/engine/intake";
import type { EngineResult } from "@/engine/shared/engine-result";
import { WebsiteToneSchema, type WebsiteTone } from "@/engine/website";
import { prisma } from "@/lib/prisma";
import { isGenerationStatus } from "@/lib/project-workspace/generation-status";
import { isWorkspaceModuleKey } from "@/lib/project-workspace/catalog";
import type {
  CreateWorkspaceProjectInput,
  UpdateWorkspaceProjectInput,
  WorkspaceModuleKey,
  WorkspaceProject,
  WorkspaceProjectSummary,
} from "@/lib/project-workspace/types";
import { logInfo, logWarning } from "@/lib/logging/safeLogger";
import {
  toBusinessIdeaData,
  toBusinessIdeaIntake,
} from "@/lib/repositories/businessIdeaRepository";
import { clearPersistedEngineOutputs } from "@/lib/repositories/engineOutputRepository";
import { logProjectAction } from "@/lib/repositories/auditLogRepository";
import {
  toFounderIntake,
  toFounderProfileData,
} from "@/lib/repositories/founderRepository";
import {
  fromJson,
  toJson,
} from "@/lib/repositories/repositorySupport";
import { assertNoBlockedSensitiveInput } from "@/lib/security/sensitiveInputScanner";

const WorkspaceStateSchema = z.object({
  financialInput: FinancialEngineInputSchema.default({
    expectedRevenueStreams: [],
    fundingSources: [],
  }),
  proofOfConcept: ProofOfConceptEvidenceSchema.partial().default({}),
  websiteTone: WebsiteToneSchema.default("professional"),
});

type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;

const workspaceProjectInclude = {
  businessIdea: true,
  engineOutputs: true,
  founderProfile: true,
} satisfies Prisma.BusinessProjectInclude;

type WorkspaceProjectRecord = Prisma.BusinessProjectGetPayload<{
  include: typeof workspaceProjectInclude;
}>;

export async function listWorkspaceProjects(
  userId: string,
): Promise<WorkspaceProjectSummary[]> {
  const projects = await prisma.businessProject.findMany({
    include: workspaceProjectInclude,
    orderBy: { updatedAt: "desc" },
    where: { id: { not: "demo" }, userId },
  });
  return projects.map(toWorkspaceProject).map(toSummary);
}

export async function getWorkspaceProject(
  id: string,
  userId: string,
): Promise<WorkspaceProject | undefined> {
  const project = await prisma.businessProject.findFirst({
    include: workspaceProjectInclude,
    where: { id, userId },
  });
  return project ? toWorkspaceProject(project) : undefined;
}

export async function getWorkspaceProjectAccessRecord(
  id: string,
  userId: string,
): Promise<{ id: string; name: string; userId: string } | undefined> {
  const project = await prisma.businessProject.findFirst({
    select: {
      id: true,
      name: true,
      userId: true,
    },
    where: { id, userId },
  });
  return project ?? undefined;
}

export async function createWorkspaceProject(
  input: CreateWorkspaceProjectInput = {},
  userId: string,
): Promise<WorkspaceProject> {
  assertNoBlockedSensitiveInput(input);
  const intake = FounderBusinessIntakeSchema.parse({
    founder: {},
    idea: {
      businessName: input.name ?? "",
      businessIdea: input.businessIdea ?? "",
      city: input.city ?? "",
      state: input.state ?? "",
      businessModel: input.businessModel ?? "",
    },
  });
  const name = input.name?.trim() || "Untitled Business";
  const workspaceState = defaultWorkspaceState(intake);

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.businessProject.create({
      data: {
        businessIdea: { create: toBusinessIdeaData(intake.idea) },
        city: intake.idea.city,
        county: intake.idea.county,
        founderProfile: { create: toFounderProfileData(intake.founder) },
        name,
        stateCode: intake.idea.state,
        summary: intake.idea.businessIdea,
        userId,
        workspaceState: toJson(workspaceState),
        zipCode: intake.idea.zipCode,
      },
      include: workspaceProjectInclude,
    });
    await logProjectAction(
      {
        action: "project:create",
        projectId: created.id,
        requestMeta: {
          hasBusinessIdea: Boolean(intake.idea.businessIdea.trim()),
          hasLocation: Boolean(intake.idea.city.trim() || intake.idea.state.trim()),
        },
        sourceType: "project",
        userId,
      },
      tx,
    );
    return created;
  });
  return toWorkspaceProject(project);
}

export async function updateWorkspaceProject(
  id: string,
  patch: UpdateWorkspaceProjectInput,
  userId: string,
): Promise<WorkspaceProject | undefined> {
  assertNoBlockedSensitiveInput(patch);
  const current = await getWorkspaceProject(id, userId);
  if (!current) return undefined;
  const intake = patch.intake
    ? FounderBusinessIntakeSchema.parse({
        founder: { ...current.intake.founder, ...patch.intake.founder },
        idea: { ...current.intake.idea, ...patch.intake.idea },
      })
    : current.intake;
  const workspaceState = WorkspaceStateSchema.parse({
    financialInput: patch.financialInput
      ? { ...current.financialInput, ...patch.financialInput }
      : current.financialInput,
    proofOfConcept: patch.proofOfConcept ?? current.proofOfConcept,
    websiteTone: patch.websiteTone ?? current.websiteTone,
  });
  const invalidatesOutputs = Boolean(
    patch.intake || patch.financialInput || patch.proofOfConcept,
  );

  const updated = await prisma.$transaction(async (tx) => {
    const ownsProject = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id, userId },
    });
    if (!ownsProject) return false;

    if (invalidatesOutputs) {
      await clearPersistedEngineOutputs(id, tx);
    }
    await tx.businessProject.update({
      data: {
        city: intake.idea.city,
        county: intake.idea.county,
        name:
          patch.name?.trim() ||
          patch.intake?.idea?.businessName?.trim() ||
          current.name,
        stateCode: intake.idea.state,
        summary: intake.idea.businessIdea,
        workspaceState: toJson(workspaceState),
        zipCode: intake.idea.zipCode,
      },
      where: { id },
    });
    await tx.founderProfile.upsert({
      create: { projectId: id, ...toFounderProfileData(intake.founder) },
      update: toFounderProfileData(intake.founder),
      where: { projectId: id },
    });
    await tx.businessIdea.upsert({
      create: { projectId: id, ...toBusinessIdeaData(intake.idea) },
      update: toBusinessIdeaData(intake.idea),
      where: { projectId: id },
    });
    await logProjectAction(
      {
        action: "project:update",
        projectId: id,
        requestMeta: {
          invalidatedOutputs: invalidatesOutputs,
          updatedFinancialInput: Boolean(patch.financialInput),
          updatedIntake: Boolean(patch.intake),
          updatedName: Boolean(patch.name),
          updatedProofOfConcept: Boolean(patch.proofOfConcept),
          updatedWebsiteTone: Boolean(patch.websiteTone),
        },
        sourceType: "project",
        userId,
      },
      tx,
    );
    return true;
  });
  if (!updated) return undefined;
  return getWorkspaceProject(id, userId);
}

export async function deleteWorkspaceProject(id: string, userId: string): Promise<boolean> {
  const deleted = await prisma.$transaction(async (tx) => {
    const project = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id, userId },
    });
    if (!project) return false;
    await logProjectAction(
      {
        action: "project:delete",
        projectId: id,
        requestMeta: { cascadeDeletesRelatedRecords: true },
        sourceType: "project",
        status: "completed",
        userId,
      },
      tx,
    );
    const result = await tx.businessProject.deleteMany({ where: { id, userId } });
    return result.count > 0;
  });
  if (deleted) {
    logInfo("project_delete_completed", { projectId: id, userId });
  } else {
    logWarning("project_delete_denied_or_missing", { projectId: id, userId });
  }
  return deleted;
}

export async function deleteAllWorkspaceProjectsForUser(userId: string): Promise<number> {
  const deletedCount = await prisma.$transaction(async (tx) => {
    const result = await tx.businessProject.deleteMany({ where: { userId } });
    return result.count;
  });
  logInfo("account_project_data_delete_completed", {
    deletedProjects: deletedCount,
    userId,
  });
  return deletedCount;
}

export async function getGuidedBuilderState(
  id: string,
  userId: string,
): Promise<GuidedBuilderState | undefined> {
  const project = await prisma.businessProject.findFirst({
    select: { guidedBuilderState: true },
    where: { id, userId },
  });
  if (!project?.guidedBuilderState) return undefined;
  return GuidedBuilderStateSchema.parse(project.guidedBuilderState);
}

export async function saveGuidedBuilderState(
  id: string,
  stateInput: GuidedBuilderState,
  userId: string,
): Promise<GuidedBuilderState | undefined> {
  assertNoBlockedSensitiveInput(stateInput);
  const state = GuidedBuilderStateSchema.parse(stateInput);
  if (state.projectId !== id) {
    throw new Error("Guided Builder project ID does not match the requested project.");
  }
  const exists = await prisma.businessProject.findFirst({
    select: { id: true },
    where: { id, userId },
  });
  if (!exists) return undefined;

  const current = await getWorkspaceProject(id, userId);
  if (!current) return undefined;
  const mapped = GuidedAnswerMapper.mapAnswers(state.answers);
  const intake = FounderBusinessIntakeSchema.parse({
    founder: mergeFounderIntake(current.intake.founder, mapped.intake.founder),
    idea: mergeBusinessIdeaIntake(current.intake.idea, mapped.intake.idea),
  });
  const workspaceState = WorkspaceStateSchema.parse({
    financialInput: mergeFinancialInput(
      current.financialInput,
      mapped.financialAssumptions,
    ),
    proofOfConcept: current.proofOfConcept,
    websiteTone:
      (typeof state.answers.websiteTone?.structuredValue === "string" &&
        state.answers.websiteTone.structuredValue) ||
      current.websiteTone,
  });

  const saved = await prisma.$transaction(async (tx) => {
    const ownsProject = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id, userId },
    });
    if (!ownsProject) return false;

    await tx.businessProject.update({
      data: {
        city: intake.idea.city,
        county: intake.idea.county,
        guidedBuilderState: toJson(state),
        name: intake.idea.businessName.trim() || current.name,
        stateCode: intake.idea.state,
        summary: intake.idea.businessIdea,
        workspaceState: toJson(workspaceState),
        zipCode: intake.idea.zipCode,
      },
      where: { id },
    });
    await tx.founderProfile.upsert({
      create: { projectId: id, ...toFounderProfileData(intake.founder) },
      update: toFounderProfileData(intake.founder),
      where: { projectId: id },
    });
    await tx.businessIdea.upsert({
      create: { projectId: id, ...toBusinessIdeaData(intake.idea) },
      update: toBusinessIdeaData(intake.idea),
      where: { projectId: id },
    });
    const fields = Object.keys(state.answers);
    await tx.intakeAnswer.deleteMany({
      where: fields.length ? { projectId: id, field: { notIn: fields } } : { projectId: id },
    });
    for (const answer of Object.values(state.answers)) {
      await tx.intakeAnswer.upsert({
        where: { projectId_field: { field: answer.field, projectId: id } },
        update: { value: toJson(answer) },
        create: {
          field: answer.field,
          projectId: id,
          value: toJson(answer),
        },
      });
    }
    await logProjectAction(
      {
        action: "guided_builder:save",
        projectId: id,
        requestMeta: {
          answerCount: Object.keys(state.answers).length,
          currentStepIndex: state.currentStepIndex,
          mode: state.mode,
        },
        sourceType: "guided_builder",
        userId,
      },
      tx,
    );
    return true;
  });
  if (!saved) return undefined;
  return state;
}

export const listProjectsForUser = listWorkspaceProjects;
export const getProjectForUser = getWorkspaceProject;
export const updateProjectForUser = updateWorkspaceProject;
export const deleteProjectForUser = deleteWorkspaceProject;

export function defaultWorkspaceState(
  intake: FounderBusinessIntake,
): WorkspaceState {
  return WorkspaceStateSchema.parse({
    financialInput: {
      availableOwnerCapital: intake.founder.availableStartupCapital || undefined,
      startupCosts: intake.idea.expectedStartupCosts || undefined,
    },
    proofOfConcept: {},
    websiteTone: "professional",
  });
}

function toWorkspaceProject(project: WorkspaceProjectRecord): WorkspaceProject {
  const baseIntake = FounderBusinessIntakeSchema.parse({
    founder: project.founderProfile
      ? toFounderIntake(project.founderProfile)
      : {},
    idea: {
      ...(project.businessIdea ? toBusinessIdeaIntake(project.businessIdea) : {}),
      city: project.city,
      county: project.county,
      state: project.stateCode,
      zipCode: project.zipCode,
    },
  });
  const guidedState = parseGuidedBuilderState(project.guidedBuilderState);
  const guidedMapping = guidedState
    ? GuidedAnswerMapper.mapAnswers(guidedState.answers)
    : undefined;
  const intake = guidedMapping
    ? FounderBusinessIntakeSchema.parse({
        founder: mergeFounderIntake(
          baseIntake.founder,
          guidedMapping.intake.founder,
        ),
        idea: mergeBusinessIdeaIntake(baseIntake.idea, guidedMapping.intake.idea),
      })
    : baseIntake;
  const workspaceState = parseWorkspaceState(project.workspaceState, intake);
  const financialInput = guidedMapping
    ? mergeFinancialInput(
        workspaceState.financialInput,
        guidedMapping.financialAssumptions,
      )
    : workspaceState.financialInput;
  const outputs = Object.fromEntries(
    project.engineOutputs
      .filter((output) => isWorkspaceModuleKey(output.moduleKey))
      .map((output) => [
        output.moduleKey as WorkspaceModuleKey,
        fromJson<EngineResult<unknown>>(output.result, {
          assumptions: [],
          confidence: 0,
          data: null,
          missingInformation: [],
          nextActions: [],
          sources: [],
          warnings: [],
        }),
      ]),
  );
  const generationStatuses = Object.fromEntries(
    project.engineOutputs
      .filter((output) => isWorkspaceModuleKey(output.moduleKey))
      .map((output) => [
        output.moduleKey as WorkspaceModuleKey,
        {
          completedAt: output.completedAt?.toISOString() ?? null,
          errorMessage: output.sanitizedErrorMessage ?? output.errorMessage,
          failedAt: output.failedAt?.toISOString() ?? null,
          retryAvailable: output.retryAvailable,
          sanitizedErrorMessage: output.sanitizedErrorMessage ?? output.errorMessage,
          startedAt: output.startedAt?.toISOString() ?? null,
          status: isGenerationStatus(output.status) ? output.status : "completed",
          updatedAt: output.updatedAt.toISOString(),
        },
      ]),
  );
  return {
    createdAt: project.createdAt.toISOString(),
    financialInput,
    generationStatuses,
    id: project.id,
    intake,
    name: project.name,
    outputs,
    proofOfConcept: workspaceState.proofOfConcept,
    updatedAt: project.updatedAt.toISOString(),
    websiteTone: workspaceState.websiteTone,
  };
}

function parseGuidedBuilderState(value: Prisma.JsonValue | null): GuidedBuilderState | undefined {
  if (!value) return undefined;
  const parsed = GuidedBuilderStateSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseWorkspaceState(
  value: Prisma.JsonValue,
  intake: FounderBusinessIntake,
): WorkspaceState {
  const parsed = WorkspaceStateSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultWorkspaceState(intake);
}

function toSummary(project: WorkspaceProject): WorkspaceProjectSummary {
  const { city, state } = project.intake.idea;
  return {
    businessIdea: project.intake.idea.businessIdea,
    completedModules: Object.entries(project.generationStatuses)
      .filter(([, status]) => status.status === "completed")
      .map(([key]) => key as WorkspaceModuleKey),
    id: project.id,
    location: [city, state].filter(Boolean).join(", ") || "Location not set",
    name: project.name,
    updatedAt: project.updatedAt,
  };
}

function mergeFounderIntake(
  base: FounderIntake,
  guided: FounderIntake,
): FounderIntake {
  return FounderIntakeSchema.parse({
    ...base,
    founderName: preferText(base.founderName, guided.founderName),
    founderExperience: preferText(
      base.founderExperience,
      guided.founderExperience,
    ),
    skills: preferList(base.skills, guided.skills),
    industryExperience: preferText(
      base.industryExperience,
      guided.industryExperience,
    ),
    availableStartupCapital: preferNumber(
      base.availableStartupCapital,
      guided.availableStartupCapital,
    ),
    desiredFundingAmount: preferNumber(
      base.desiredFundingAmount,
      guided.desiredFundingAmount,
    ),
    creditReadinessSelfAssessment: preferText(
      base.creditReadinessSelfAssessment,
      guided.creditReadinessSelfAssessment,
    ),
    riskTolerance: preferText(base.riskTolerance, guided.riskTolerance),
    weeklyAvailableHours: preferNumber(
      base.weeklyAvailableHours,
      guided.weeklyAvailableHours,
    ),
    launchTimeline: preferText(base.launchTimeline, guided.launchTimeline),
    ownershipAttributes: Object.values(guided.ownershipAttributes).some(Boolean)
      ? guided.ownershipAttributes
      : base.ownershipAttributes,
  });
}

function mergeBusinessIdeaIntake(
  base: BusinessIdeaIntake,
  guided: BusinessIdeaIntake,
): BusinessIdeaIntake {
  return BusinessIdeaIntakeSchema.parse({
    ...base,
    businessName: preferText(base.businessName, guided.businessName),
    businessIdea: preferText(base.businessIdea, guided.businessIdea),
    productOrService: preferText(base.productOrService, guided.productOrService),
    customerProblem: preferText(base.customerProblem, guided.customerProblem),
    proposedSolution: preferText(base.proposedSolution, guided.proposedSolution),
    targetCustomer: preferText(base.targetCustomer, guided.targetCustomer),
    city: preferText(base.city, guided.city),
    county: preferText(base.county, guided.county),
    state: preferText(base.state, guided.state),
    zipCode: preferText(base.zipCode, guided.zipCode),
    businessModel: preferText(base.businessModel, guided.businessModel),
    industry: preferText(base.industry, guided.industry),
    naicsGuess: preferText(base.naicsGuess, guided.naicsGuess),
    knownCompetitors: preferList(base.knownCompetitors, guided.knownCompetitors),
    pricingIdea: preferText(base.pricingIdea, guided.pricingIdea),
    expectedStartupCosts: preferNumber(
      base.expectedStartupCosts,
      guided.expectedStartupCosts,
    ),
    staffingPlan: preferText(base.staffingPlan, guided.staffingPlan),
    requiredEquipment: preferList(base.requiredEquipment, guided.requiredEquipment),
    licensingConcerns: preferList(
      base.licensingConcerns,
      guided.licensingConcerns,
    ),
    fundingNeed: preferText(base.fundingNeed, guided.fundingNeed),
    websiteNeeds: preferText(base.websiteNeeds, guided.websiteNeeds),
  });
}

function mergeFinancialInput(
  base: FinancialEngineInput,
  guided: FinancialEngineInput,
): FinancialEngineInput {
  const merged = { ...FinancialEngineInputSchema.parse(base) };
  const parsedGuided = FinancialEngineInputSchema.parse(guided);
  for (const [key, value] of Object.entries(parsedGuided) as [
    keyof FinancialEngineInput,
    unknown,
  ][]) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        (merged as Record<string, unknown>)[key] = value;
      }
      continue;
    }
    if (typeof value === "number" && value > 0) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return FinancialEngineInputSchema.parse(merged);
}

function preferText(base: string, guided: string): string {
  return guided.trim() || base;
}

function preferNumber(base: number, guided: number): number {
  return guided > 0 ? guided : base;
}

function preferList(base: string[], guided: string[]): string[] {
  return guided.length > 0 ? guided : base;
}
