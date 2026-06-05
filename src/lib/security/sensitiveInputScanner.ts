export type SensitiveFindingRisk = "block" | "caution";

export type SensitiveFindingType =
  | "ssn"
  | "credit_card"
  | "bank_account_number"
  | "routing_number"
  | "password"
  | "api_key"
  | "ein";

export interface SensitiveInputFinding {
  type: SensitiveFindingType;
  risk: SensitiveFindingRisk;
  label: string;
  message: string;
  path: string;
}

export interface SensitiveInputScanResult {
  findings: SensitiveInputFinding[];
  blockedFindings: SensitiveInputFinding[];
  cautionFindings: SensitiveInputFinding[];
  shouldBlock: boolean;
  summary: string;
}

const SSN_PATTERN = /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g;
const EIN_PATTERN = /\b\d{2}-\d{7}\b/g;
const PASSWORD_CONTEXT_PATTERN =
  /\b(?:password|passcode|login password|account password)\b\s*(?:is|=|:)?\s*\S{6,}/i;
const PASSWORD_PHRASE_PATTERN =
  /\b(?:password|passcode|passphrase|pwd|account password|login password)\b\s*(?:is|=|:)\s*["']?[^"'\n]{8,}/i;
const ROUTING_CONTEXT_PATTERN =
  /\b(?:routing|aba|bank routing)\b[^\d]{0,20}\d(?:[\s-]?\d){8}\b/i;
const ACCOUNT_CONTEXT_PATTERN =
  /\b(?:bank account|account number|checking account|savings account)\b[^\d]{0,24}\d(?:[\s-]?\d){9,19}\b/i;
const LONG_NUMBER_PATTERN = /\b\d(?:[\s-]?\d){9,19}\b/g;
const API_KEY_CONTEXT_PATTERN =
  /\b(?:api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|bearer[_\s-]?token|private[_\s-]?key)\b\s*(?:is|=|:)\s*["']?[A-Za-z0-9._~+/=-]{16,}/i;
const COMMON_API_KEY_PATTERNS = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
] as const;

export function scanSensitiveInput(input: unknown): SensitiveInputScanResult {
  const findings = scanValue(input, "$");
  const blockedFindings = findings.filter((finding) => finding.risk === "block");
  const cautionFindings = findings.filter((finding) => finding.risk === "caution");
  return {
    blockedFindings,
    cautionFindings,
    findings,
    shouldBlock: blockedFindings.length > 0,
    summary: summarizeFindings(blockedFindings, cautionFindings),
  };
}

export function assertNoBlockedSensitiveInput(input: unknown): void {
  const result = scanSensitiveInput(input);
  if (result.shouldBlock) {
    throw new SensitiveInputBlockedError(result);
  }
}

export class SensitiveInputBlockedError extends Error {
  readonly name = "SensitiveInputBlockedError";

  constructor(readonly scan: SensitiveInputScanResult) {
    super(scan.summary);
  }
}

function scanValue(input: unknown, path: string): SensitiveInputFinding[] {
  if (typeof input === "string") return scanText(input, path);
  if (typeof input === "number") return scanNumber(input, path);
  if (typeof input === "boolean" || input == null) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.flatMap((item, index) => scanValue(item, `${path}[${index}]`));
  }
  if (typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) =>
      scanValue(value, `${path}.${key}`),
    );
  }
  return [];
}

function scanNumber(value: number, path: string): SensitiveInputFinding[] {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return [];
  const digits = String(Math.abs(value));
  if (digits.length < 10 || digits.length > 20) return [];
  if (passesLuhn(digits) && digits.length >= 13) {
    return [block("credit_card", "Credit card number", path)];
  }
  return [block("bank_account_number", "Long private account-style number", path)];
}

function scanText(text: string, path: string): SensitiveInputFinding[] {
  if (!text.trim()) return [];
  const findings: SensitiveInputFinding[] = [];
  const normalized = text.replace(/\u00a0/g, " ");

  if (SSN_PATTERN.test(normalized)) {
    findings.push(block("ssn", "Social Security number", path));
  }
  resetPatterns();

  if (PASSWORD_CONTEXT_PATTERN.test(normalized) || PASSWORD_PHRASE_PATTERN.test(normalized)) {
    findings.push(block("password", "Password or private login", path));
  }

  if (
    API_KEY_CONTEXT_PATTERN.test(normalized) ||
    COMMON_API_KEY_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    findings.push(block("api_key", "Private API key or access token", path));
  }

  if (ROUTING_CONTEXT_PATTERN.test(normalized)) {
    findings.push(block("routing_number", "Bank routing number", path));
  }

  if (ACCOUNT_CONTEXT_PATTERN.test(normalized)) {
    findings.push(block("bank_account_number", "Bank account number", path));
  }

  for (const match of normalized.matchAll(EIN_PATTERN)) {
    const matchText = match[0];
    if (!isPartOfSsn(normalized, match.index ?? 0, matchText)) {
      findings.push({
        label: "Employer Identification Number",
        message:
          "This looks like an EIN or tax ID. During private testing, avoid entering tax IDs unless it is truly necessary.",
        path,
        risk: "caution",
        type: "ein",
      });
    }
  }

  for (const match of normalized.matchAll(LONG_NUMBER_PATTERN)) {
    const digits = digitsOnly(match[0]);
    if (digits.length < 10 || digits.length > 20) continue;
    if (looksLikePhoneNumber(normalized, match.index ?? 0, match[0])) continue;
    if (passesLuhn(digits) && digits.length >= 13) {
      findings.push(block("credit_card", "Credit card number", path));
      continue;
    }
    findings.push(block("bank_account_number", "Long private account-style number", path));
  }

  return dedupeFindings(findings);
}

function block(
  type: SensitiveFindingType,
  label: string,
  path: string,
): SensitiveInputFinding {
  return {
    label,
    message: `${label} detected. Please remove it before saving. VentureForge only needs planning estimates for private testing.`,
    path,
    risk: "block",
    type,
  };
}

function summarizeFindings(
  blockedFindings: SensitiveInputFinding[],
  cautionFindings: SensitiveInputFinding[],
) {
  if (blockedFindings.length) {
    const labels = unique(blockedFindings.map((finding) => finding.label)).join(", ");
    return `Please remove sensitive information before saving: ${labels}. Do not enter SSNs, full bank details, credit cards, passwords, private API keys, private account logins, tax records, or credit reports.`;
  }
  if (cautionFindings.length) {
    const labels = unique(cautionFindings.map((finding) => finding.label)).join(", ");
    return `Caution: ${labels} detected. Avoid entering tax IDs during private testing unless absolutely necessary.`;
  }
  return "";
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum > 0 && sum % 10 === 0;
}

function looksLikePhoneNumber(text: string, index: number, value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  const context = text.slice(Math.max(0, index - 16), index).toLowerCase();
  return /\b(phone|call|mobile|cell|tel)\b/.test(context);
}

function isPartOfSsn(text: string, index: number, value: string): boolean {
  const before = text.slice(Math.max(0, index - 4), index);
  const after = text.slice(index + value.length, index + value.length + 5);
  return /\d{3}-$/.test(before) || /^-\d{4}/.test(after);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function dedupeFindings(findings: SensitiveInputFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.type}:${finding.risk}:${finding.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resetPatterns() {
  SSN_PATTERN.lastIndex = 0;
  EIN_PATTERN.lastIndex = 0;
  LONG_NUMBER_PATTERN.lastIndex = 0;
}
