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

export async function signupAction(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    logWarning("auth_invalid_signup_input");
    redirect(`/signup?error=invalid-input&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const signupLimit = checkRateLimit({
    key: `auth:signup:${parsed.data.email.toLowerCase()}`,
    limit: 4,
    windowMs: 60_000,
  });
  if (!signupLimit.allowed) {
    logWarning("auth_signup_rate_limited");
    redirect(`/signup?error=too-many-attempts&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    logWarning("auth_signup_existing_account");
    redirect(`/signup?error=account-exists&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const providerIdentity = credentialsProviderIdentity(parsed.data.email);
  await prisma.user.create({
    data: {
      authProvider: providerIdentity.provider,
      authProviderAccountHash: providerIdentity.accountHash,
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

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
      logWarning("auth_signup_signin_fallback");
      redirect(`/login?error=created-account&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    logError("auth_signup_error", error);
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

function isNextRedirect(error: unknown) {
  return error instanceof Error && error.message === "NEXT_REDIRECT";
}
