"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { safeCallbackUrl, SignInSchema, SignUpSchema } from "@/lib/auth/schemas";
import {
  credentialsProviderIdentity,
  findUserByEmail,
} from "@/lib/auth/userProvisioning";
import { logError, logWarning } from "@/lib/logging/safeLogger";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit/simpleRateLimiter";

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  redirectTo?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    logWarning("auth_invalid_login_input");
    redirect(`/login?error=invalid-input&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const loginLimit = checkRateLimit({
    key: `auth:login:${parsed.data.email.toLowerCase()}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!loginLimit.allowed) {
    logWarning("auth_login_rate_limited");
    redirect(`/login?error=too-many-attempts&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      logWarning("auth_invalid_credentials");
      redirect(`/login?error=invalid-credentials&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    logError("auth_login_error", error);
    throw error;
  }
}

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    logWarning("auth_invalid_signup_input");
    return {
      fieldErrors: fieldErrorsFromIssues(parsed.error.issues),
      message: "Enter your name, a valid email, and a password with at least 8 characters.",
      ok: false,
    };
  }
  const signupLimit = checkRateLimit({
    key: `auth:signup:${parsed.data.email.toLowerCase()}`,
    limit: 4,
    windowMs: 60_000,
  });
  if (!signupLimit.allowed) {
    logWarning("auth_signup_rate_limited", signupLogMeta(parsed.data.email));
    return {
      message: "Too many signup attempts. Wait a minute, then try again.",
      ok: false,
    };
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    logWarning("auth_signup_existing_account", signupLogMeta(parsed.data.email));
    return {
      fieldErrors: {
        email: "That email already has an account. Try signing in.",
      },
      message: "That email already has an account. Try signing in.",
      ok: false,
    };
  }

  const providerIdentity = credentialsProviderIdentity(parsed.data.email);
  try {
    await prisma.user.create({
      data: {
        authProvider: providerIdentity.provider,
        authProviderAccountHash: providerIdentity.accountHash,
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      logWarning("auth_signup_existing_account_race", signupLogMeta(parsed.data.email));
      return {
        fieldErrors: {
          email: "That email already has an account. Try signing in.",
        },
        message: "That email already has an account. Try signing in.",
        ok: false,
      };
    }
    logError("auth_signup_create_error", error, signupLogMeta(parsed.data.email));
    return {
      message: "We could not create the account right now. Please try again.",
      ok: false,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return {
      message: "Account created.",
      ok: true,
      redirectTo: callbackUrl,
    };
  } catch (error) {
    const fallbackLoginUrl = `/login?error=created-account&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    if (isNextRedirect(error)) {
      logWarning("auth_signup_unexpected_redirect", signupLogMeta(parsed.data.email));
      return {
        message: "Account created.",
        ok: true,
        redirectTo: callbackUrl,
      };
    }
    if (error instanceof AuthError) {
      logWarning("auth_signup_signin_fallback", signupLogMeta(parsed.data.email));
      return {
        message: "Account created. Please sign in.",
        ok: true,
        redirectTo: fallbackLoginUrl,
      };
    }
    logError("auth_signup_error", error, signupLogMeta(parsed.data.email));
    return {
      message: "Account created. Please sign in.",
      ok: true,
      redirectTo: fallbackLoginUrl,
    };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

function isNextRedirect(error: unknown) {
  return error instanceof Error &&
    (error.message === "NEXT_REDIRECT" ||
      ("digest" in error &&
        typeof (error as { digest?: unknown }).digest === "string" &&
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")));
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002";
}

function fieldErrorsFromIssues(
  issues: Array<{ message: string; path: PropertyKey[] }>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

function signupLogMeta(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? { emailDomain: domain } : undefined;
}
