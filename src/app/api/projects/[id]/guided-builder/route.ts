import { NextResponse } from "next/server";

import { GuidedBuilderStateSchema } from "@/engine/guided-builder";
import {
  noProjectAccessMessage,
  requireProjectAccess,
} from "@/lib/auth/requireProjectAccess";
import {
  getGuidedBuilderState,
  saveGuidedBuilderState,
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
    return NextResponse.json({ state: await getGuidedBuilderState(id, access.user.id) ?? null });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const access = await requireProjectAccess(id);
    if (!access.ok) return accessError(access);
    const state = GuidedBuilderStateSchema.parse(await request.json());
    const privacyScan = scanSensitiveInput(state);
    if (privacyScan.shouldBlock) {
      return NextResponse.json({ error: privacyScan.summary }, { status: 400 });
    }
    const saved = await saveGuidedBuilderState(id, state, access.user.id);
    return saved
      ? NextResponse.json({ state: saved })
      : NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
  } catch (error) {
    return databaseError(error);
  }
}

function accessError(access: { status: 401 | 404; error: string }) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}

function databaseError(error: unknown) {
  logError("database_error", error, { route: "/api/projects/[id]/guided-builder" });
  return NextResponse.json(
    { error: "Could not save the Guided Builder draft. Check the database connection and try again." },
    { status: 503 },
  );
}
