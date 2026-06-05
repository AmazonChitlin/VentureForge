const SECRET_KEY_PATTERN = /(password|secret|token|api[_-]?key|authorization|credential|bank|account|routing)/i;
const SSN_PATTERN = /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b\d(?:[\s-]?\d){12,18}\b/g;
const BANK_ACCOUNT_CONTEXT_PATTERN =
  /\b(bank\s+account|account\s+number|acct|routing\s+number|routing|aba)\b\s*[:#=]?\s*\d[\d\s-]{7,20}\b/gi;
const EIN_PATTERN = /\b\d{2}-\d{7}\b/g;
const PASSWORD_ASSIGNMENT_PATTERN =
  /\b(password|passcode|passphrase|pwd)\b\s*[:=]\s*[^,\s"}]+/gi;
const API_KEY_CONTEXT_PATTERN =
  /\b(api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|bearer[_\s-]?token|private[_\s-]?key)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}/gi;
const COMMON_API_KEY_PATTERNS = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
] as const;

export type LogLevel = "info" | "warn" | "error";

export interface SafeLogEntry {
  event: string;
  level: LogLevel;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export function logInfo(event: string, meta?: Record<string, unknown>) {
  writeSafeLog("info", event, meta);
}

export function logWarning(event: string, meta?: Record<string, unknown>) {
  writeSafeLog("warn", event, meta);
}

export function logError(
  event: string,
  error?: unknown,
  meta?: Record<string, unknown>,
) {
  writeSafeLog("error", event, {
    ...meta,
    error: summarizeError(error),
  });
}

export function writeSafeLog(
  level: LogLevel,
  event: string,
  meta?: Record<string, unknown>,
) {
  const entry: SafeLogEntry = {
    event,
    level,
    meta: sanitizeForLog(meta ?? {}) as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }
  if (level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }
  console.info(JSON.stringify(entry));
}

export function sanitizeForLog(value: unknown): unknown {
  if (typeof value === "string") return redactSensitiveText(value);
  if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeForLog(item),
      ]),
    );
  }
  return "[unloggable]";
}

export function redactSensitiveText(value: string): string {
  return COMMON_API_KEY_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[redacted-api-key]"),
    value,
  )
    .replace(BANK_ACCOUNT_CONTEXT_PATTERN, "$1 [redacted-number]")
    .replace(SSN_PATTERN, "[redacted-ssn]")
    .replace(CREDIT_CARD_PATTERN, "[redacted-number]")
    .replace(EIN_PATTERN, "[redacted-tax-id]")
    .replace(PASSWORD_ASSIGNMENT_PATTERN, "$1=[redacted-password]")
    .replace(API_KEY_CONTEXT_PATTERN, "$1=[redacted-api-key]");
}

function summarizeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      message: redactSensitiveText(error.message).slice(0, 240),
      name: error.name,
    };
  }
  return {
    message: redactSensitiveText(String(error)).slice(0, 240),
    name: "UnknownError",
  };
}
