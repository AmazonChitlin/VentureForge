import { NextResponse } from "next/server";

import {
  noProjectAccessMessage,
  requireProjectAccess,
} from "@/lib/auth/requireProjectAccess";
import {
  deleteWorkspaceProject,
  getWorkspaceProject,
  updateWorkspaceProject,
} from "@/lib/repositories/projectRepository";
import { logError } from "@/lib/logging/safeLogger";
import { scanSensitiveInput } from "@/lib/security/sensitiveInputScanner";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const access = await requireProjectAccess(id);
    if (!access.ok) return accessError(access);
    const project = await getWorkspaceProject(id, access.user.id);
    return project
      ? NextResponse.json({ project })
      : NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const patch = await request.json().catch(() => ({}));
  try {
    const access = await requireProjectAccess(id);
    if (!access.ok) return accessError(access);
    const privacyScan = scanSensitiveInput(patch);
    if (privacyScan.shouldBlock) return sensitiveInputError(privacyScan.summary);
    const project = await updateWorkspaceProject(id, patch, access.user.id);
    return project
      ? NextResponse.json({ project })
      : NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const access = await requireProjectAccess(id);
    if (!access.ok) return accessError(access);
    const deleted = await deleteWorkspaceProject(id, access.user.id);
    return deleted
      ? NextResponse.json({ deleted: true })
      : NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
  } catch (error) {
    return databaseError(error);
  }
}

function accessError(access: { status: 401 | 404; error: string }) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}

function sensitiveInputError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function databaseError(error: unknown) {
  logError("database_error", error, { route: "/api/projects/[id]" });
  return NextResponse.json(
    { error: "Could not reach the VentureForge database. Check DATABASE_URL and run the Prisma migrations." },
    { status: 503 },
  );
}
