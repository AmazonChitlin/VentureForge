import { NextResponse } from "next/server";

import {
  noProjectAccessMessage,
  requireProjectAccess,
} from "@/lib/auth/requireProjectAccess";
import { logError } from "@/lib/logging/safeLogger";
import { getWorkspaceProject } from "@/lib/repositories/projectRepository";
import { buildTraceabilityReport } from "@/lib/project-workspace/traceability";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const access = await requireProjectAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const project = await getWorkspaceProject(id, access.user.id);
    return project
      ? NextResponse.json({ traceability: buildTraceabilityReport(project) })
      : NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
  } catch (error) {
    logError("database_error", error, { route: "/api/projects/[id]/traceability" });
    return NextResponse.json(
      { error: "Could not reach the VentureForge database. Check DATABASE_URL and run the Prisma migrations." },
      { status: 503 },
    );
  }
}
