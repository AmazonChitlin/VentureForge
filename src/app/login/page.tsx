import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { safeCallbackUrl } from "@/lib/auth/schemas";

const errorMessages: Record<string, string> = {
  "created-account": "Your account was created. Log in to continue.",
  "invalid-credentials": "That email and password did not match. Try again or create an account.",
  "invalid-input": "Enter a valid email and a password with at least 8 characters.",
  "too-many-attempts": "Too many login attempts. Wait a minute, then try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(singleValue(params.callbackUrl));
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(callbackUrl);
  const error = singleValue(params.error);

  return (
    <main className="vf-auth-page">
      <section>
        <Link className="vf-wordmark" href="/">VentureForge</Link>
        <p className="vf-section-label">Log in</p>
        <h1>Open your saved business projects.</h1>
        <p>Your projects are private to your account. Log in to keep building where you left off.</p>
        {error ? <p className="vf-workspace-error">{errorMessages[error] ?? "Please log in to continue."}</p> : null}
        <form action={loginAction} className="vf-workspace-form">
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <label>
            Email
            <small>Use the email you used when you created your VentureForge account.</small>
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Password
            <small>Use at least 8 characters.</small>
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          <button className="vf-button vf-button-primary" type="submit">Log in</button>
        </form>
        <p>
          New here? <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Create an account</Link>
        </p>
      </section>
    </main>
  );
}

function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
