import Link from "next/link";

import { logoutAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function AuthNavigation() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <nav className="vf-auth-nav" aria-label="Account navigation">
        <Link href="/login">Log in</Link>
        <Link className="vf-button vf-button-primary" href="/signup">Create account</Link>
      </nav>
    );
  }
  return (
    <nav className="vf-auth-nav" aria-label="Account navigation">
      <Link href="/dashboard">Dashboard</Link>
      <span>{user.name || user.email}</span>
      <form action={logoutAction}>
        <button type="submit">Log out</button>
      </form>
    </nav>
  );
}
