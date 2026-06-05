import type { BusinessPlan } from "@/engine/business-plan";
import type { EngineResult } from "@/engine/shared/engine-result";
import { sourceLabel } from "@/exports/export-guardrails";
import { safeFilename } from "@/exports/filename";
import type { ExportArtifact, ExportProvider } from "@/exports/export-provider";
import { planWarnings } from "@/exports/markdown-exporter";

export class HtmlExporter implements ExportProvider<EngineResult<BusinessPlan>> {
  readonly id = "business-plan-html";
  readonly name = "HTML business plan";

  async createArtifacts(input: EngineResult<BusinessPlan>): Promise<ExportArtifact[]> {
    return [
      {
        filename: `${safeFilename(input.data.title, "business-plan")}.html`,
        mediaType: "text/html; charset=utf-8",
        contents: this.render(input),
      },
    ];
  }

  render(input: EngineResult<BusinessPlan>): string {
    const warnings = planWarnings(input);
    return [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapeHtml(input.data.title)}</title>`,
      `<style>${styles}</style>`,
      "</head>",
      "<body>",
      "<main>",
      `<header><p class="eyebrow">VentureForge business plan export</p><h1>${escapeHtml(input.data.title)}</h1><p>${escapeHtml(input.data.intendedAudience)}</p><p><strong>Overall confidence:</strong> ${input.data.overallConfidence}/100</p></header>`,
      renderList("Export warnings", warnings, "warning"),
      renderList("Missing information", input.missingInformation),
      renderList("Overall assumptions", input.assumptions),
      renderList("Overall sources", input.sources.map(sourceLabel)),
      ...input.data.sections.map(
        (section) =>
          `<section><h2>${escapeHtml(section.title)}</h2><p>${paragraphs(section.editableContent)}</p><p><strong>Section confidence:</strong> ${section.confidenceScore}/100</p>${renderList("Assumptions", section.assumptions)}${renderList("Sources", section.sourceNotes.map(sourceLabel))}${renderList("Missing information", section.missingInformation)}${renderList("Quality checklist", section.qualityChecklist)}</section>`,
      ),
      "</main>",
      "</body>",
      "</html>",
    ].join("\n");
  }
}

function renderList(title: string, items: string[], className = ""): string {
  const contents = items.length ? items : ["None recorded."];
  return `<aside class="${escapeHtml(className)}"><h3>${escapeHtml(title)}</h3><ul>${contents.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></aside>`;
}

function paragraphs(value: string): string {
  return escapeHtml(value).replaceAll(/\n{2,}/g, "</p><p>").replaceAll("\n", "<br>");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const styles = `
body { background: #f7f9fb; color: #10213d; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; }
main { background: #fff; margin: 0 auto; max-width: 900px; padding: 48px; }
header, section { border-bottom: 1px solid #d8e0e9; padding: 0 0 24px; }
section { padding-top: 20px; }
h1 { font-size: 42px; line-height: 1; }
h2 { color: #0c552d; }
h3 { font-size: 14px; margin-bottom: 4px; }
aside { background: #f7f9fb; border-radius: 6px; margin-top: 12px; padding: 10px 14px; }
aside.warning { background: #fff9ec; border: 1px solid #efca84; color: #7c4b00; }
.eyebrow { color: #146b3a; font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
`;

