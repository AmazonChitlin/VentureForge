import { prisma } from "@/lib/prisma";
import type { RepositoryClient } from "@/lib/repositories/repositorySupport";
import { toJson } from "@/lib/repositories/repositorySupport";

export interface ProjectAuditInput {
  userId: string;
  projectId: string;
  action: string;
  sourceType: string;
  providerId?: string;
  status?: string;
  requestMeta?: Record<string, unknown>;
}

export async function logProjectAction(
  input: ProjectAuditInput,
  db: RepositoryClient = prisma,
): Promise<boolean> {
  const project = await db.businessProject.findFirst({
    select: { id: true },
    where: { id: input.projectId, userId: input.userId },
  });
  if (!project) return false;

  await db.dataSourceLog.create({
    data: {
      action: input.action,
      projectId: input.projectId,
      providerId: input.providerId ?? "ventureforge",
      requestMeta: toJson(input.requestMeta ?? {}),
      sourceType: input.sourceType,
      status: input.status ?? "completed",
      userId: input.userId,
    },
  });
  return true;
}

export async function listProjectAuditLogs(
  projectId: string,
  userId: string,
  db: RepositoryClient = prisma,
) {
  const project = await db.businessProject.findFirst({
    select: { id: true },
    where: { id: projectId, userId },
  });
  if (!project) return [];

  return db.dataSourceLog.findMany({
    orderBy: { createdAt: "desc" },
    where: { projectId, userId },
  });
}
