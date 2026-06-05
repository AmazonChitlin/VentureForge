import {
  getCurrentUser,
  unauthenticatedMessage,
} from "@/lib/auth/getCurrentUser";
import type { CurrentUser } from "@/lib/auth/userProvisioning";
import { logWarning } from "@/lib/logging/safeLogger";
import { getWorkspaceProjectAccessRecord } from "@/lib/repositories/projectRepository";

export const noProjectAccessMessage =
  "Project not found or you do not have access to it.";

export type ProjectAccessResult =
  | {
      ok: true;
      user: CurrentUser;
      project: {
        id: string;
        name: string;
        userId: string;
      };
    }
  | {
      ok: false;
      status: 401 | 404;
      error: string;
    };

export async function requireProjectAccess(
  projectId: string,
): Promise<ProjectAccessResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: unauthenticatedMessage(),
      ok: false,
      status: 401,
    };
  }

  const project = await getWorkspaceProjectAccessRecord(projectId, user.id);

  if (!project) {
    logWarning("project_access_denied_or_missing", {
      projectId,
      userId: user.id,
    });
    return {
      error: noProjectAccessMessage,
      ok: false,
      status: 404,
    };
  }

  return { ok: true, project, user };
}
