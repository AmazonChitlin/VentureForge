import { prisma } from "@/lib/prisma";
import { logProjectAction } from "@/lib/repositories/auditLogRepository";
import type { RepositoryClient } from "@/lib/repositories/repositorySupport";

export interface CreateExportRecordInput {
  projectId: string;
  userId: string;
  type: string;
  path?: string | null;
  sourceType?: string;
}

export async function createExportRecord(
  input: CreateExportRecordInput,
): Promise<{ id: string; projectId: string; type: string; path: string | null } | undefined> {
  return prisma.$transaction(async (tx) => {
    const project = await tx.businessProject.findFirst({
      select: { id: true },
      where: { id: input.projectId, userId: input.userId },
    });
    if (!project) return undefined;

    const record = await tx.exportRecord.create({
      data: {
        path: input.path ?? null,
        projectId: input.projectId,
        type: input.type,
      },
      select: {
        id: true,
        path: true,
        projectId: true,
        type: true,
      },
    });

    await logProjectAction(
      {
        action: `export:${input.type}`,
        projectId: input.projectId,
        providerId: "ventureforge-export-service",
        requestMeta: {
          exportRecordId: record.id,
          path: record.path,
          type: record.type,
        },
        sourceType: input.sourceType ?? "export",
        userId: input.userId,
      },
      tx,
    );

    return record;
  });
}

export async function listExportRecords(
  projectId: string,
  userId: string,
  db: RepositoryClient = prisma,
) {
  const project = await db.businessProject.findFirst({
    select: { id: true },
    where: { id: projectId, userId },
  });
  if (!project) return [];

  return db.exportRecord.findMany({
    orderBy: { createdAt: "desc" },
    where: { projectId },
  });
}
