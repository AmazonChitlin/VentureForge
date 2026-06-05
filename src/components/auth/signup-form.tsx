"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { signupAction, type AuthActionResult } from "@/lib/auth/actions";

interface SignupFormProps {
  callbackUrl: string;
}

const emptyResult: AuthActionResult = {
  ok: false,
};

export function SignupForm({ callbackUrl }: SignupFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<AuthActionResult>(emptyResult);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const nextResult = await signupAction(formData);
      setResult(nextResult);
      if (nextResult.ok && nextResult.redirectTo) {
        router.replace(nextResult.redirectTo);
      }
    });
  }

  const messageClassName = result.ok ? "vf-workspace-success" : "vf-workspace-error";

  return (
    <form className="vf-workspace-form" onSubmit={handleSubmit}>
      <input name="callbackUrl" type="hidden" value={callbackUrl} />
      {result.message ? (
        <p aria-live="polite" className={messageClassName}>
          {result.message}
        </p>
      ) : null}
      <label>
        Name
        <small>This is only shown inside your account.</small>
        <input
          aria-describedby={result.fieldErrors?.name ? "signup-name-error" : undefined}
          autoComplete="name"
          name="name"
          required
        />
        {result.fieldErrors?.name ? (
          <small className="vf-field-error" id="signup-name-error">{result.fieldErrors.name}</small>
        ) : null}
      </label>
      <label>
        Email
        <small>Use an email you can remember for local testing.</small>
        <input
          aria-describedby={result.fieldErrors?.email ? "signup-email-error" : undefined}
          autoComplete="email"
          name="email"
          required
          type="email"
        />
        {result.fieldErrors?.email ? (
          <small className="vf-field-error" id="signup-email-error">{result.fieldErrors.email}</small>
        ) : null}
      </label>
      <label>
        Password
        <small>Use at least 8 characters. Do not reuse an important password for local testing.</small>
        <input
          aria-describedby={result.fieldErrors?.password ? "signup-password-error" : undefined}
          autoComplete="new-password"
          name="password"
          required
          type="password"
        />
        {result.fieldErrors?.password ? (
          <small className="vf-field-error" id="signup-password-error">{result.fieldErrors.password}</small>
        ) : null}
      </label>
      <button className="vf-button vf-button-primary" disabled={isPending} type="submit">
        {isPending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
