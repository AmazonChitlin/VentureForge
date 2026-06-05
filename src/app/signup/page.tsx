import Link from "next/link";
import { redirect } from "next/navigation";

import { signupAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { safeCallbackUrl } from "@/lib/auth/schemas";

const errorMessages: Record<string, string> = {
  "account-exists": "An account already exists for that email. Log in instead.",
  "invalid-input": "Enter your name, a valid email, and a password with at least 8 characters.",
  "too-many-attempts": "Too many signup attempts. Wait a minute, then try again.",
};

export default async function SignupPage({
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
        <p className="vf-section-label">Create account</p>
        <h1>Save your business-building work.</h1>
        <p>Create a local VentureForge account so your projects belong to you and stay available after restart.</p>
        {error ? <p className="vf-workspace-error">{errorMessages[error] ?? "Please check the form and try again."}</p> : null}
        <form action={signupAction} className="vf-workspace-form">
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <label>
            Name
            <small>This is only shown inside your account.</small>
            <input autoComplete="name" name="name" required />
          </label>
          <label>
            Email
            <small>Use an email you can remember for local testing.</small>
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Password
            <small>Use at least 8 characters. Do not reuse an important password for local testing.</small>
            <input autoComplete="new-password" name="password" required type="password" />
          </label>
          <button className="vf-button vf-button-primary" type="submit">Create account</button>
        </form>
        <p>
          Already have an account? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Log in</Link>
        </p>
      </section>
    </main>
  );
}

function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
