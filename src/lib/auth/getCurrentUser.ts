import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  type CurrentUser,
  upsertAuthenticatedUser,
} from "@/lib/auth/userProvisioning";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return upsertAuthenticatedUser({
    email: session.user.email,
    name: session.user.name,
  });
}

export async function requireCurrentUser(callbackUrl = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return user;
}

export function unauthenticatedMessage() {
  return "Please log in to continue. Your VentureForge projects are saved to your account.";
}
