import type { BusinessPlan } from "@/engine/business-plan";
import type { FundingMatchResult } from "@/engine/funding";
import type { LaunchRoadmap } from "@/engine/launch-roadmap";
import type { EngineResult } from "@/engine/shared/engine-result";
import type { WebsitePackage } from "@/engine/website";
import { CsvExporter } from "@/exports/csv-exporter";
import type { ExportArtifact, ExportCapability } from "@/exports/export-provider";
import { HtmlExporter } from "@/exports/html-exporter";
import { MarkdownExporter } from "@/exports/markdown-exporter";
import { DocxExporter, PdfExporter } from "@/exports/scaffold-exporters";
import {
  StaticWebsiteExporter,
  type StaticWebsiteBundle,
} from "@/exports/static-website-exporter";

export type BusinessPlanExportFormat = "markdown" | "html" | "pdf" | "docx";

export class ExportService {
  readonly markdown = new MarkdownExporter();
  readonly html = new HtmlExporter();
  readonly csv = new CsvExporter();
  readonly staticWebsite = new StaticWebsiteExporter();
  readonly pdf = new PdfExporter();
  readonly docx = new DocxExporter();

  exportBusinessPlan(
    format: BusinessPlanExportFormat,
    result: EngineResult<BusinessPlan>,
  ): Promise<ExportArtifact[]> {
    switch (format) {
      case "markdown":
        return this.markdown.createArtifacts(result);
      case "html":
        return this.html.createArtifacts(result);
      case "pdf":
        return this.pdf.createArtifacts(result);
      case "docx":
        return this.docx.createArtifacts(result);
    }
  }

  exportFundingChecklist(
    result: EngineResult<FundingMatchResult>,
  ): Promise<ExportArtifact[]> {
    return this.csv.createArtifacts({ kind: "funding", result });
  }

  exportLaunchRoadmap(
    result: EngineResult<LaunchRoadmap>,
  ): Promise<ExportArtifact[]> {
    return this.csv.createArtifacts({ kind: "launch-roadmap", result });
  }

  exportStaticWebsite(
    result: EngineResult<WebsitePackage>,
  ): Promise<ExportArtifact[]> {
    return this.staticWebsite.createArtifacts(result);
  }

  buildStaticWebsiteBundle(
    result: EngineResult<WebsitePackage>,
  ): StaticWebsiteBundle {
    return this.staticWebsite.buildBundle(result);
  }

  capabilities(): ExportCapability[] {
    return [
      capability(this.markdown),
      capability(this.html),
      capability(this.csv),
      capability(this.staticWebsite),
      this.pdf.capability(),
      this.docx.capability(),
    ];
  }
}

function capability(exporter: { id: string; name: string }): ExportCapability {
  return { id: exporter.id, name: exporter.name, available: true };
}

