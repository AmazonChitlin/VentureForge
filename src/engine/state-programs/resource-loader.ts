import arizona from "@/knowledge/state-programs/AZ.json";
import california from "@/knowledge/state-programs/CA.json";
import pennsylvania from "@/knowledge/state-programs/PA.json";

import {
  StateResourceFileSchema,
  type SourceReliability,
  type StateProgramResource,
  type StateResourceFile,
} from "@/engine/state-programs/schema";

const stateResources = new Map<string, StateResourceFile>(
  [arizona, pennsylvania, california].map((resourceFile) => {
    const validated = validateResourceFile(resourceFile);
    return [validated.stateCode, validated];
  }),
);

export interface StateResourceAuditItem {
  stateCode: string;
  stateName: string;
  resourceId: string;
  title: string;
  category: string;
  agency: string;
  url?: string;
  lastVerifiedAt: Date;
  sourceReliability: SourceReliability;
  needsVerification: boolean;
}

export interface StateProgramPersistenceRecord {
  id: string;
  stateCode: string;
  title: string;
  category: string;
  agency: string;
  url: string;
  description: string;
  eligibilityTags: string[];
  industries: string[];
  lastVerifiedAt: Date;
  sourceType: string;
}

export function loadStateResourceFile(
  stateCode: string,
): StateResourceFile | undefined {
  return stateResources.get(stateCode.trim().toUpperCase());
}

export function loadCommonStateProgramResources(): StateProgramResource[] {
  return [];
}

export function loadAllStateResourceFiles(): StateResourceFile[] {
  return [...stateResources.values()];
}

export function getSupportedStateCodes(): string[] {
  return [...stateResources.keys()].sort();
}

export function getStateProgramResources(
  resourceFile: StateResourceFile,
): StateProgramResource[] {
  return [
    ...resourceFile.commonBusinessSetupTasks,
    ...resourceFile.industrySpecificFlags.flatMap((flag) => flag.tasks),
  ];
}

export function listStatesWithMissingUrls(): StateResourceAuditItem[] {
  return allAuditItems().filter((item) => !item.url);
}

export function listResourcesNeedingVerification(): StateResourceAuditItem[] {
  return allAuditItems().filter((item) => item.needsVerification);
}

export function listResourcesOlderThan(
  days: number,
  referenceDate: Date = new Date(),
): StateResourceAuditItem[] {
  const thresholdMs = days * 24 * 60 * 60 * 1000;
  return allAuditItems().filter(
    (item) => referenceDate.getTime() - item.lastVerifiedAt.getTime() > thresholdMs,
  );
}

export function toStateProgramPersistenceRecord(
  resource: StateProgramResource,
): StateProgramPersistenceRecord {
  return {
    id: resource.id,
    stateCode: resource.stateCode,
    title: resource.title,
    category: resource.category,
    agency: resource.agency,
    url: resource.url ?? "",
    description: resource.description,
    eligibilityTags: resource.eligibilityTags,
    industries: resource.industries,
    lastVerifiedAt: new Date(`${resource.lastVerifiedAt}T00:00:00.000Z`),
    sourceType: resource.sourceType,
  };
}

function validateResourceFile(resourceFile: unknown): StateResourceFile {
  const validated = StateResourceFileSchema.parse(resourceFile);
  const mismatchedProgram = getStateProgramResources(validated).find(
    (program) => program.stateCode !== validated.stateCode,
  );

  if (mismatchedProgram) {
    throw new Error(
      `State resource ${mismatchedProgram.id} does not match file state ${validated.stateCode}.`,
    );
  }

  return validated;
}

function allAuditItems(): StateResourceAuditItem[] {
  return loadAllStateResourceFiles().flatMap((stateFile) =>
    getStateProgramResources(stateFile).map((resource) => ({
      agency: resource.agency,
      category: resource.category,
      lastVerifiedAt: new Date(`${resource.lastVerifiedAt}T00:00:00.000Z`),
      needsVerification: resource.needsVerification,
      resourceId: resource.id,
      sourceReliability: resource.sourceReliability,
      stateCode: stateFile.stateCode,
      stateName: stateFile.stateName,
      title: resource.title,
      url: resource.url,
    })),
  );
}
