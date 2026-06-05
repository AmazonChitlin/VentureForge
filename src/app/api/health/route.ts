import { NextResponse } from "next/server";

import { buildHealthCheck } from "@/lib/health/healthCheck";
import { logError } from "@/lib/logging/safeLogger";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await buildHealthCheck(async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    return NextResponse.json(payload, {
      status: payload.status === "error" ? 503 : 200,
    });
  } catch (error) {
    logError("health_check_error", error);
    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        checks: {
          app: {
            message: "Health check route is running, but a check failed unexpectedly.",
            status: "ok",
          },
        },
        status: "error",
      },
      { status: 503 },
    );
  }
}
