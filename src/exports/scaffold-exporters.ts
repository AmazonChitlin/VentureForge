import type { ExportArtifact, ExportCapability, ExportProvider } from "@/exports/export-provider";

export class ExportUnavailableError extends Error {
  constructor(
    readonly exporterId: string,
    message: string,
  ) {
    super(message);
    this.name = "ExportUnavailableError";
  }
}

abstract class UnavailableExporter implements ExportProvider<unknown> {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly reason: string;

  capability(): ExportCapability {
    return {
      id: this.id,
      name: this.name,
      available: false,
      reason: this.reason,
    };
  }

  async createArtifacts(_input?: unknown): Promise<ExportArtifact[]> {
    throw new ExportUnavailableError(this.id, this.reason);
  }
}

export class PdfExporter extends UnavailableExporter {
  readonly id = "business-plan-pdf";
  readonly name = "PDF business plan";
  readonly reason =
    "PDF export is scaffolded but unavailable until a reviewed server-side PDF renderer is installed.";
}

export class DocxExporter extends UnavailableExporter {
  readonly id = "business-plan-docx";
  readonly name = "DOCX business plan";
  readonly reason =
    "DOCX export is scaffolded but unavailable until a reviewed DOCX generation dependency is installed.";
}
