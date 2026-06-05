import { z } from "zod";

export const SignInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use fewer than 128 characters."),
});

export const SignUpSchema = SignInSchema.extend({
  name: z.string().trim().min(1, "Enter your name.").max(120, "Use fewer than 120 characters."),
});

export function safeCallbackUrl(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string" || !value.trim()) return "/dashboard";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";

  try {
    const parsed = new URL(trimmed, "https://ventureforge.local");
    if (parsed.origin !== "https://ventureforge.local") return "/dashboard";
    if (parsed.pathname === "/dashboard" || parsed.pathname === "/project/new") {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    if (/^\/project\/[A-Za-z0-9_-]+\/builder$/.test(parsed.pathname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return "/dashboard";
  }

  return "/dashboard";
}
