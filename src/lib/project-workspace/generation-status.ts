import type { EngineResult } from "@/engine/shared/engine-result";

export const generationStatusValues = ["pending", "completed", "failed"] as const;

export type GenerationStatus = (typeof generationStatusValues)[number];

export interface GenerationStatusInfo {
  status: GenerationStatus;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  sanitizedErrorMessage: string | null;
  retryAvailable: boolean;
  updatedAt: string;
}

const TECHNICAL_FAILURE_PATTERNS = [
  /unique constraint/i,
  /foreign key constraint/i,
  /prisma/i,
  /\bsql\b/i,
  /\bdatabase\b/i,
  /transaction/i,
];

export function isGenerationStatus(value: string): value is GenerationStatus {
  return generationStatusValues.includes(value as GenerationStatus);
}

export function sanitizeGenerationError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "The engine could not finish this generation.";
  const redacted = raw
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[database-url]")
    .replace(/DATABASE_URL\s*=\s*\S+/gi, "DATABASE_URL=[hidden]")
    .replace(/password\s*[:=]\s*\S+/gi, "password=[hidden]")
    .replace(/secret\s*[:=]\s*\S+/gi, "secret=[hidden]")
    .replace(/\b[A-Za-z0-9_=-]{48,}\b/g, "[hidden]");
  const cleaned = redacted.split(/\r?\n/)[0]?.trim() || "The engine could not finish this generation.";

  if (TECHNICAL_FAILURE_PATTERNS.some((pattern) => pattern.test(cleaned))) {
    return "VentureForge could not safely save every related record, so it rolled this generation back. You can retry after checking the inputs.";
  }

  return cleaned.length > 240 ? `${cleaned.slice(0, 237)}...` : cleaned;
}

export function failedGenerationMessage(error: unknown): string {
  const message = sanitizeGenerationError(error);
  return message.startsWith("VentureForge")
    ? message
    : `VentureForge could not finish this draft. ${message}`;
}

export function placeholderEngineResult(
  moduleKey: string,
  status: Exclude<GenerationStatus, "completed">,
  message?: string,
): EngineResult<unknown> {
  const statusLabel = status === "pending" ? "Generation is pending." : "Generation failed.";
  return {
    assumptions: [],
    confidence: 0,
    data: null,
    missingInformation: [],
    nextActions: status === "failed" ? ["Retry this generation after reviewing the warning."] : [],
    sources: [],
    warnings: [message ?? statusLabel],
  };
}
