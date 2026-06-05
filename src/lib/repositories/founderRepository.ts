import type { FounderProfile } from "@prisma/client";

import {
  FounderIntakeSchema,
  type FounderIntake,
} from "@/engine/intake";
import { prisma } from "@/lib/prisma";
import type { RepositoryClient } from "@/lib/repositories/repositorySupport";
import {
  fromJson,
  toJson,
} from "@/lib/repositories/repositorySupport";

export async function getFounderProfile(
  projectId: string,
  userId: string,
  db: RepositoryClient = prisma,
): Promise<FounderIntake | undefined> {
  const record = await db.founderProfile.findFirst({
    where: { projectId, project: { userId } },
  });
  return record ? toFounderIntake(record) : undefined;
}

export async function upsertFounderProfile(
  projectId: string,
  userId: string,
  founderInput: FounderIntake,
  db: RepositoryClient = prisma,
): Promise<FounderIntake | undefined> {
  const project = await db.businessProject.findFirst({
    select: { id: true },
    where: { id: projectId, userId },
  });
  if (!project) return undefined;

  const founder = FounderIntakeSchema.parse(founderInput);
  const data = toFounderProfileData(founder);
  const record = await db.founderProfile.upsert({
    where: { projectId },
    update: data,
    create: { projectId, ...data },
  });
  return toFounderIntake(record);
}

export async function deleteFounderProfile(
  projectId: string,
  userId: string,
  db: RepositoryClient = prisma,
): Promise<boolean> {
  const result = await db.founderProfile.deleteMany({
    where: { projectId, project: { userId } },
  });
  return result.count > 0;
}

export function toFounderProfileData(founderInput: FounderIntake) {
  const founder = FounderIntakeSchema.parse(founderInput);
  return {
    founderName: founder.founderName,
    founderExperience: founder.founderExperience,
    skills: toJson(founder.skills),
    industryExperience: founder.industryExperience,
    startupCapital: founder.availableStartupCapital,
    desiredFunding: founder.desiredFundingAmount,
    creditReadiness: founder.creditReadinessSelfAssessment,
    riskTolerance: founder.riskTolerance,
    weeklyAvailableHours: founder.weeklyAvailableHours,
    launchTimeline: founder.launchTimeline,
    ownershipAttributes: toJson(founder.ownershipAttributes),
  };
}

export function toFounderIntake(record: FounderProfile): FounderIntake {
  return FounderIntakeSchema.parse({
    founderName: record.founderName,
    founderExperience: record.founderExperience,
    skills: fromJson(record.skills, []),
    industryExperience: record.industryExperience,
    availableStartupCapital: Number(record.startupCapital),
    desiredFundingAmount: Number(record.desiredFunding),
    creditReadinessSelfAssessment: record.creditReadiness,
    riskTolerance: record.riskTolerance,
    weeklyAvailableHours: record.weeklyAvailableHours,
    launchTimeline: record.launchTimeline,
    ownershipAttributes: fromJson(record.ownershipAttributes, {}),
  });
}
