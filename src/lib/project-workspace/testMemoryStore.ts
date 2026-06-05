import { randomUUID } from "node:crypto";

import { sampleProjects } from "../../../prisma/seed-data";
import { FounderBusinessIntakeSchema } from "@/engine/intake";
import type { EngineResult } from "@/engine/shared/engine-result";
import type {
  CreateWorkspaceProjectInput,
  UpdateWorkspaceProjectInput,
  WorkspaceModuleKey,
  WorkspaceProject,
  WorkspaceProjectSummary,
} from "@/lib/project-workspace/types";

const globalForWorkspace = globalThis as unknown as {
  ventureForgeWorkspaceProjects?: Map<string, WorkspaceProject>;
};

const projects =
  globalForWorkspace.ventureForgeWorkspaceProjects ?? createInitialProjects();

if (!globalForWorkspace.ventureForgeWorkspaceProjects) {
  globalForWorkspace.ventureForgeWorkspaceProjects = projects;
}

export function listWorkspaceProjects(): WorkspaceProjectSummary[] {
  return [...projects.values()]
    .filter((project) => project.id !== "demo")
    .map(toSummary)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getWorkspaceProject(id: string): WorkspaceProject | undefined {
  const project = projects.get(id);
  return project ? clone(project) : undefined;
}

export function createWorkspaceProject(
  input: CreateWorkspaceProjectInput = {},
): WorkspaceProject {
  const now = new Date().toISOString();
  const id = `project-${randomUUID()}`;
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
  const project: WorkspaceProject = {
    id,
    name: input.name?.trim() || "Untitled Business",
    createdAt: now,
    updatedAt: now,
    intake,
    financialInput: {},
    proofOfConcept: {},
    websiteTone: "professional",
    outputs: {},
    generationStatuses: {},
  };
  projects.set(id, project);
  return clone(project);
}

export function updateWorkspaceProject(
  id: string,
  patch: UpdateWorkspaceProjectInput,
): WorkspaceProject | undefined {
  const current = projects.get(id);
  if (!current) return undefined;
  const intake = patch.intake
    ? FounderBusinessIntakeSchema.parse({
        founder: { ...current.intake.founder, ...patch.intake.founder },
        idea: { ...current.intake.idea, ...patch.intake.idea },
      })
    : current.intake;
  const next: WorkspaceProject = {
    ...current,
    name:
      patch.name?.trim() ||
      patch.intake?.idea?.businessName?.trim() ||
      current.name,
    intake,
    financialInput: patch.financialInput ?? current.financialInput,
    proofOfConcept: patch.proofOfConcept ?? current.proofOfConcept,
    websiteTone: patch.websiteTone ?? current.websiteTone,
    updatedAt: new Date().toISOString(),
    outputs:
      patch.intake || patch.financialInput || patch.proofOfConcept
        ? {}
        : current.outputs,
    generationStatuses:
      patch.intake || patch.financialInput || patch.proofOfConcept
        ? {}
        : current.generationStatuses,
  };
  projects.set(id, next);
  return clone(next);
}

export function saveWorkspaceOutput(
  id: string,
  key: WorkspaceModuleKey,
  output: EngineResult<unknown>,
): WorkspaceProject | undefined {
  const current = projects.get(id);
  if (!current) return undefined;
  const next = {
    ...current,
    updatedAt: new Date().toISOString(),
    outputs: { ...current.outputs, [key]: output },
    generationStatuses: {
      ...current.generationStatuses,
      [key]: {
        completedAt: new Date().toISOString(),
        errorMessage: null,
        failedAt: null,
        retryAvailable: true,
        sanitizedErrorMessage: null,
        startedAt: new Date().toISOString(),
        status: "completed",
        updatedAt: new Date().toISOString(),
      },
    },
  };
  projects.set(id, next);
  return clone(next);
}

function createInitialProjects(): Map<string, WorkspaceProject> {
  const entries = sampleProjects.map((sample) => {
    const now = new Date().toISOString();
    const project: WorkspaceProject = {
      id: sample.id,
      name: sample.intake.idea.businessName,
      createdAt: now,
      updatedAt: now,
      intake: sample.intake,
      financialInput: {
        startupCosts: sample.intake.idea.expectedStartupCosts,
        availableOwnerCapital: sample.intake.founder.availableStartupCapital,
      },
      proofOfConcept: {},
      websiteTone: "professional",
      outputs: {},
      generationStatuses: {},
    };
    return [project.id, project] as const;
  });
  const first = entries[0];
  return new Map([
    ...entries,
    ...(first ? [["demo", { ...clone(first[1]), id: "demo" }] as const] : []),
  ]);
}

function toSummary(project: WorkspaceProject): WorkspaceProjectSummary {
  const { city, state } = project.intake.idea;
  return {
    id: project.id,
    name: project.name,
    businessIdea: project.intake.idea.businessIdea,
    location: [city, state].filter(Boolean).join(", ") || "Location not set",
    updatedAt: project.updatedAt,
    completedModules: Object.entries(project.generationStatuses)
      .filter(([, status]) => status.status === "completed")
      .map(([key]) => key as WorkspaceModuleKey),
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
