import { NextResponse } from "next/server";
import { z } from "zod";

import type { BusinessPlan } from "@/engine/business-plan";
import type { FundingMatchResult } from "@/engine/funding";
import type { LaunchRoadmap } from "@/engine/launch-roadmap";
import type { EngineResult } from "@/engine/shared/engine-result";
import type { WebsitePackage } from "@/engine/website";
import { ExportService } from "@/exports";
import {
  noProjectAccessMessage,
  requireProjectAccess,
} from "@/lib/auth/requireProjectAccess";
import { logError } from "@/lib/logging/safeLogger";
import { checkRateLimit } from "@/lib/rate-limit/simpleRateLimiter";
import { getWorkspaceProject } from "@/lib/repositories/projectRepository";
import { createExportRecord } from "@/lib/repositories/exportRepository";

const ExportRequestSchema = z.object({
  type: z.enum([
    "business_plan_markdown",
    "business_plan_html",
    "funding_csv",
    "launch_csv",
    "static_website_zip",
  ]),
});

const exportService = new ExportService();

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

    const body = ExportRequestSchema.parse(await request.json().catch(() => ({})));
    const limit = checkRateLimit({
      key: `export:${access.user.id}:${body.type}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            "You have made several export requests in a short time. Wait a moment, then try again.",
          retryAfter: limit.resetAt.toISOString(),
        },
        { status: 429 },
      );
    }
    const project = await getWorkspaceProject(id, access.user.id);
    if (!project) {
      return NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
    }

    const artifacts = await createArtifacts(project.outputs, body.type);
    const record = await createExportRecord({
      path: artifacts[0]?.filename,
      projectId: id,
      sourceType: "export",
      type: body.type,
      userId: access.user.id,
    });
    if (!record) {
      return NextResponse.json({ error: noProjectAccessMessage }, { status: 404 });
    }

    return NextResponse.json({
      artifacts: artifacts.map((artifact) => ({
        contents:
          artifact.contents instanceof Uint8Array
            ? Buffer.from(artifact.contents).toString("base64")
            : artifact.contents,
        encoding: artifact.contents instanceof Uint8Array ? "base64" : "utf8",
        filename: artifact.filename,
        mediaType: artifact.mediaType,
      })),
      exportRecord: record,
    });
  } catch (error) {
    logError("export_failure", error, { route: "/api/projects/[id]/exports" });
    const message =
      error instanceof z.ZodError
        ? "Choose a valid export type."
        : error instanceof Error
          ? error.message
          : "Export failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function createArtifacts(
  outputs: Record<string, EngineResult<unknown> | undefined>,
  type: z.infer<typeof ExportRequestSchema>["type"],
) {
  switch (type) {
    case "business_plan_markdown":
      return exportService.exportBusinessPlan(
        "markdown",
        requireOutput<BusinessPlan>(outputs.plan, "Generate a business plan before exporting it."),
      );
    case "business_plan_html":
      return exportService.exportBusinessPlan(
        "html",
        requireOutput<BusinessPlan>(outputs.plan, "Generate a business plan before exporting it."),
      );
    case "funding_csv":
      return exportService.exportFundingChecklist(
        requireOutput<FundingMatchResult>(outputs.funding, "Generate funding matches before exporting them."),
      );
    case "launch_csv":
      return exportService.exportLaunchRoadmap(
        requireOutput<LaunchRoadmap>(outputs.launch, "Generate a launch roadmap before exporting it."),
      );
    case "static_website_zip":
      return exportService.exportStaticWebsite(
        requireOutput<WebsitePackage>(outputs.website, "Generate a website package before exporting it."),
      );
  }
}

function requireOutput<T>(
  output: EngineResult<unknown> | undefined,
  message: string,
): EngineResult<T> {
  if (!output) throw new Error(message);
  return output as EngineResult<T>;
}
