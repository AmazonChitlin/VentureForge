export interface ExportArtifact {
  filename: string;
  mediaType: string;
  contents: string | Uint8Array;
}

export interface ExportProvider<TInput> {
  readonly id: string;
  readonly name: string;
  createArtifacts(input: TInput): Promise<ExportArtifact[]>;
}

export interface ExportTextFile {
  path: string;
  content: string;
}

export interface ExportCapability {
  id: string;
  name: string;
  available: boolean;
  reason?: string;
}
