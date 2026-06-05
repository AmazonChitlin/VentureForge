import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { SignInSchema } from "@/lib/auth/schemas";
import {
  findUserByEmail,
  upsertAuthenticatedUser,
} from "@/lib/auth/userProvisioning";
import { verifyPassword } from "@/lib/auth/password";
import { logError, logWarning } from "@/lib/logging/safeLogger";

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = SignInSchema.safeParse(credentials);
        if (!parsed.success) {
          logWarning("auth_credentials_parse_failed");
          return null;
        }
        const user = await findUserByEmail(parsed.data.email);
        if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
          logWarning("auth_credentials_rejected");
          return null;
        }
        return {
          email: user.email,
          id: user.id,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (!user.email) {
        logWarning("auth_missing_email");
        return false;
      }
      const provider = account?.provider ?? "credentials";
      try {
        await upsertAuthenticatedUser({
          email: user.email,
          name: user.name,
          provider,
          providerAccountId:
            provider === "credentials"
              ? user.email
              : account?.providerAccountId ?? user.id ?? user.email,
        });
      } catch (error) {
        logError("auth_user_upsert_failed", error);
        return false;
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
