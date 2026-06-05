import { NextResponse } from "next/server";

import {
  getCurrentUser,
  unauthenticatedMessage,
} from "@/lib/auth/getCurrentUser";
import { logError } from "@/lib/logging/safeLogger";
import { deleteAllWorkspaceProjectsForUser } from "@/lib/repositories/projectRepository";

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: unauthenticatedMessage() }, { status: 401 });
    }

    const deletedProjects = await deleteAllWorkspaceProjectsForUser(user.id);

    return NextResponse.json({
      deletedProjects,
      message:
        "Deleted your VentureForge projects and related planning records. Your sign-in record remains so you can keep using the private test app.",
    });
  } catch (error) {
    logError("database_error", error, { route: "/api/account/data" });
    return NextResponse.json(
      { error: "Could not delete account project data. Check the database connection and try again." },
      { status: 503 },
    );
  }
}
