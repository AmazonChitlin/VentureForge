import { createHash } from "node:crypto";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

const AuthUserInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().optional().nullable(),
  provider: z.string().trim().min(1).default("credentials"),
  providerAccountId: z.string().trim().optional().nullable(),
});

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function upsertAuthenticatedUser(
  input: z.input<typeof AuthUserInputSchema>,
): Promise<CurrentUser> {
  const parsed = AuthUserInputSchema.parse(input);
  const providerIdentity = authProviderIdentity({
    accountId: parsed.providerAccountId ?? parsed.email,
    provider: parsed.provider,
  });
  return prisma.user.upsert({
    where: { email: parsed.email },
    update: {
      authProvider: providerIdentity.provider,
      authProviderAccountHash: providerIdentity.accountHash,
      name: parsed.name || undefined,
    },
    create: {
      authProvider: providerIdentity.provider,
      authProviderAccountHash: providerIdentity.accountHash,
      email: parsed.email,
      name: parsed.name || null,
    },
    select: {
      email: true,
      id: true,
      name: true,
    },
  });
}

export function credentialsProviderIdentity(email: string) {
  return authProviderIdentity({
    accountId: email.trim().toLowerCase(),
    provider: "credentials",
  });
}

export function authProviderIdentity(input: {
  provider: string;
  accountId: string;
}) {
  const provider = input.provider.trim().toLowerCase();
  const accountId = input.accountId.trim().toLowerCase();
  return {
    accountHash: createHash("sha256")
      .update(`${provider}:${accountId}`)
      .digest("hex"),
    provider,
  };
}

export async function findUserByEmail(email: string): Promise<CurrentUser & { passwordHash: string | null } | null> {
  return prisma.user.findUnique({
    select: {
      email: true,
      id: true,
      name: true,
      passwordHash: true,
    },
    where: { email: email.trim().toLowerCase() },
  });
}
