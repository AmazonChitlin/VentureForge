import type { BusinessPlan } from "@/engine/business-plan";
import type { EngineResult } from "@/engine/shared/engine-result";
import { exportWarnings, sourceLabel, unique } from "@/exports/export-guardrails";
import { safeFilename } from "@/exports/filename";
import type { ExportArtifact, ExportProvider } from "@/exports/export-provider";

export type BusinessPlanExportInput = EngineResult<BusinessPlan>;

export class MarkdownExporter
  implements ExportProvider<BusinessPlanExportInput>
{
  readonly id = "business-plan-markdown";
  readonly name = "Markdown business plan";

  async createArtifacts(input: BusinessPlanExportInput): Promise<ExportArtifact[]> {
    return [
      {
        filename: `${safeFilename(input.data.title, "business-plan")}.md`,
        mediaType: "text/markdown; charset=utf-8",
        contents: this.render(input),
      },
    ];
  }

  render(input: BusinessPlanExportInput): string {
    const warnings = planWarnings(input);
    return [
      `# ${input.data.title}`,
      "",
      `**Plan type:** ${input.data.planType.replaceAll("_", " ")}`,
      `**Intended audience:** ${input.data.intendedAudience}`,
      `**Overall confidence:** ${input.data.overallConfidence}/100`,
      "",
      section("Export warnings", warnings),
      section("Missing information", input.missingInformation),
      section("Overall assumptions", input.assumptions),
      section("Overall sources", input.sources.map(sourceLabel)),
      ...input.data.sections.flatMap((planSection) => [
        `## ${planSection.title}`,
        "",
        planSection.editableContent,
        "",
        `**Section confidence:** ${planSection.confidenceScore}/100`,
        "",
        section("Assumptions", planSection.assumptions, 3),
        section(
          "Sources",
          planSection.sourceNotes.map(sourceLabel),
          3,
        ),
        section("Missing information", planSection.missingInformation, 3),
        section("Quality checklist", planSection.qualityChecklist, 3),
      ]),
    ].join("\n");
  }
}

export function planWarnings(input: BusinessPlanExportInput): string[] {
  return exportWarnings(
    input,
    uniqueSectionSources(input.data),
  );
}

function uniqueSectionSources(plan: BusinessPlan) {
  const sources = plan.sections.flatMap((item) => item.sourceNotes);
  return [...new Map(sources.map((source) => [source.id, source])).values()];
}

function section(title: string, items: string[], level = 2): string {
  const heading = `${"#".repeat(level)} ${title}`;
  return items.length
    ? [heading, "", ...items.map((item) => `- ${item}`), ""].join("\n")
    : [heading, "", "- None recorded.", ""].join("\n");
}

