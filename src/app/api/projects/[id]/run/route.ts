import { NextResponse } from "next/server";

import {
  noProjectAccessMessage,
  requireProjectAccess,
} from "@/lib/auth/requireProjectAccess";
import { isWorkspaceModuleKey } from "@/lib/project-workspace/catalog";
import { failedGenerationMessage } from "@/lib/project-workspace/generation-status";
import { runWorkspaceModule } from "@/lib/project-workspace/orchestrator";
import { logError } from "@/lib/logging/safeLogger";
import { checkRateLimit } from "@/lib/rate-limit/simpleRateLimiter";
import { getWorkspaceProject } from "@/lib/repositories/projectRepository";
import { scanSensitiveInput } from "@/lib/security/sensitiveInputScanner";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const access = await requireProjectAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const project = await getWorkspaceProject(id, access.user.id);
    if (!project) {
      return NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
    }
    const privacyScan = scanSensitiveInput({
      financialInput: project.financialInput,
      intake: project.intake,
      proofOfConcept: project.proofOfConcept,
      websiteTone: project.websiteTone,
    });
    if (privacyScan.shouldBlock) {
      return NextResponse.json({ error: privacyScan.summary }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    if (typeof body.module !== "string" || !isWorkspaceModuleKey(body.module)) {
      return NextResponse.json(
        { error: "Choose a valid engine module." },
        { status: 400 },
      );
    }
    const limit = checkRateLimit({
      key: `generation:${access.user.id}:${body.module}`,
      limit: body.module === "market" ? 6 : 12,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            "You have made several generation requests in a short time. Wait a moment, then try again.",
          retryAfter: limit.resetAt.toISOString(),
        },
        { status: 429 },
      );
    }
    return NextResponse.json({
      project: await runWorkspaceModule(project, body.module, { userId: access.user.id }),
    });
  } catch (error) {
    logError("generation_failure", error, { route: "/api/projects/[id]/run" });
    return NextResponse.json(
      { error: failedGenerationMessage(error), retryAvailable: true },
      { status: 503 },
    );
  }
}
