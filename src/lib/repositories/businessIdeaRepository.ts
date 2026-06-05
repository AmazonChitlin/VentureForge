import type { BusinessIdea } from "@prisma/client";

import {
  BusinessIdeaIntakeSchema,
  type BusinessIdeaIntake,
} from "@/engine/intake";
import { prisma } from "@/lib/prisma";
import type { RepositoryClient } from "@/lib/repositories/repositorySupport";
import {
  fromJson,
  toJson,
} from "@/lib/repositories/repositorySupport";

export async function getBusinessIdea(
  projectId: string,
  userId: string,
  db: RepositoryClient = prisma,
): Promise<BusinessIdeaIntake | undefined> {
  const record = await db.businessIdea.findFirst({
    where: { projectId, project: { userId } },
  });
  return record ? toBusinessIdeaIntake(record) : undefined;
}

export async function upsertBusinessIdea(
  projectId: string,
  userId: string,
  ideaInput: BusinessIdeaIntake,
  db: RepositoryClient = prisma,
): Promise<BusinessIdeaIntake | undefined> {
  const project = await db.businessProject.findFirst({
    select: { id: true },
    where: { id: projectId, userId },
  });
  if (!project) return undefined;

  const idea = BusinessIdeaIntakeSchema.parse(ideaInput);
  const data = toBusinessIdeaData(idea);
  const record = await db.businessIdea.upsert({
    where: { projectId },
    update: data,
    create: { projectId, ...data },
  });
  return toBusinessIdeaIntake(record);
}

export async function deleteBusinessIdea(
  projectId: string,
  userId: string,
  db: RepositoryClient = prisma,
): Promise<boolean> {
  const result = await db.businessIdea.deleteMany({
    where: { projectId, project: { userId } },
  });
  return result.count > 0;
}

export function toBusinessIdeaData(ideaInput: BusinessIdeaIntake) {
  const idea = BusinessIdeaIntakeSchema.parse(ideaInput);
  return {
    businessName: idea.businessName,
    businessIdea: idea.businessIdea,
    productOrService: idea.productOrService,
    customerProblem: idea.customerProblem,
    proposedSolution: idea.proposedSolution,
    targetCustomer: idea.targetCustomer,
    businessModels: toJson(idea.businessModel ? [idea.businessModel] : []),
    industry: idea.industry,
    naicsGuess: idea.naicsGuess,
    knownCompetitors: toJson(idea.knownCompetitors),
    pricingIdea: idea.pricingIdea,
    expectedStartupCosts: idea.expectedStartupCosts,
    staffingPlan: idea.staffingPlan,
    requiredEquipment: toJson(idea.requiredEquipment),
    licensingConcerns: toJson(idea.licensingConcerns),
    fundingNeed: idea.fundingNeed,
    websiteNeeds: idea.websiteNeeds,
  };
}

export function toBusinessIdeaIntake(record: BusinessIdea): BusinessIdeaIntake {
  const businessModels = fromJson<string[]>(record.businessModels, []);
  return BusinessIdeaIntakeSchema.parse({
    businessName: record.businessName,
    businessIdea: record.businessIdea,
    productOrService: record.productOrService,
    customerProblem: record.customerProblem,
    proposedSolution: record.proposedSolution,
    targetCustomer: record.targetCustomer,
    businessModel: businessModels[0] ?? "",
    industry: record.industry,
    naicsGuess: record.naicsGuess,
    knownCompetitors: fromJson(record.knownCompetitors, []),
    pricingIdea: record.pricingIdea,
    expectedStartupCosts: Number(record.expectedStartupCosts),
    staffingPlan: record.staffingPlan,
    requiredEquipment: fromJson(record.requiredEquipment, []),
    licensingConcerns: fromJson(record.licensingConcerns, []),
    fundingNeed: record.fundingNeed,
    websiteNeeds: record.websiteNeeds,
  });
}
