import { NextResponse } from "next/server";

import {
  createWorkspaceProject,
  listWorkspaceProjects,
} from "@/lib/repositories/projectRepository";
import {
  getCurrentUser,
  unauthenticatedMessage,
} from "@/lib/auth/getCurrentUser";
import { logError } from "@/lib/logging/safeLogger";
import { scanSensitiveInput } from "@/lib/security/sensitiveInputScanner";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return NextResponse.json({ projects: await listWorkspaceProjects(user.id) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const privacyScan = scanSensitiveInput(input);
    if (privacyScan.shouldBlock) return sensitiveInputError(privacyScan.summary);
    return NextResponse.json(
      { project: await createWorkspaceProject(input, user.id) },
      { status: 201 },
    );
  } catch (error) {
    return databaseError(error);
  }
}

function sensitiveInputError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function unauthorized() {
  return NextResponse.json({ error: unauthenticatedMessage() }, { status: 401 });
}

function databaseError(error: unknown) {
  logError("database_error", error, { route: "/api/projects" });
  return NextResponse.json(
    { error: "Could not reach the VentureForge database. Check DATABASE_URL and run the Prisma migrations." },
    { status: 503 },
  );
}
