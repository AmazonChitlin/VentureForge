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
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/api/")) return "/dashboard";
  return value;
}
