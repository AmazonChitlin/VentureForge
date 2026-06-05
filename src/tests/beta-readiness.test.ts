import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import { PrivateBetaBanner } from "../components/private-beta-banner";
import PrivacyPage from "../app/privacy/page";
import TermsPage from "../app/terms/page";
import { assertProductionEnv, validateProductionEnv } from "../lib/env";
import { buildHealthCheck } from "../lib/health/healthCheck";
import { logError } from "../lib/logging/safeLogger";
import {
  checkRateLimit,
  resetRateLimitBucket,
} from "../lib/rate-limit/simpleRateLimiter";

test("env validation fails clearly when required vars are missing", () => {
  const result = validateProductionEnv({});

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /DATABASE_URL/i.test(error)));
  assert.ok(result.errors.some((error) => /AUTH_SECRET/i.test(error)));
  assert.ok(result.errors.some((error) => /NEXTAUTH_URL/i.test(error)));
  assert.ok(result.errors.some((error) => /NEXT_PUBLIC_APP_URL/i.test(error)));
});

test("production env assertion fails clearly when required vars are missing", () => {
  assert.throws(
    () => assertProductionEnv({ NODE_ENV: "production" }),
    /production environment is not configured/i,
  );
});

test("health check reports app, database, auth, optional provider, and build status without secrets", async () => {
  const secret = "abcdefghijklmnopqrstuvwxyz1234567890-secret";
  const payload = await buildHealthCheck(async () => undefined, {
    APP_VERSION: "0.1.0-beta-test",
    AUTH_SECRET: secret,
    BLS_API_KEY: "",
    CENSUS_API_KEY: "census-test-key",
    DATABASE_URL: "postgresql://example",
    NODE_ENV: "production",
    NEXTAUTH_URL: "https://beta.ventureforge.test",
    NEXT_PUBLIC_APP_URL: "https://beta.ventureforge.test",
    OPENAI_API_KEY: "sk-proj-private-beta-test-secret",
    OPENAI_MODEL: "test-model",
    SOURCE_VERSION: "abcdef1234567890",
    OPENAI_COMPATIBLE_API_KEY: "",
    OPENAI_COMPATIBLE_BASE_URL: "",
    OPENAI_COMPATIBLE_MODEL: "",
  });

  assert.equal(payload.status, "ok");
  assert.equal(payload.build.version, "0.1.0-beta-test");
  assert.equal(payload.build.commit, "abcdef123456");
  assert.equal(payload.checks.app.status, "ok");
  assert.equal(payload.checks.database.reachable, true);
  assert.equal(payload.checks.auth.configured, true);
  assert.equal(payload.checks.optionalProviders.census, "configured");
  assert.equal(payload.checks.optionalProviders.bls, "missing");
  assert.equal(payload.checks.optionalProviders.openaiApiKey, "configured");
  assert.equal(payload.checks.optionalProviders.llm, "configured");
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, new RegExp(secret));
  assert.doesNotMatch(serialized, /sk-proj-private-beta-test-secret/);
});

test("rate limit blocks excessive generation attempts", () => {
  resetRateLimitBucket();
  const key = "generation:user-1:market";

  assert.equal(checkRateLimit({ key, limit: 2, now: 1, windowMs: 1000 }).allowed, true);
  assert.equal(checkRateLimit({ key, limit: 2, now: 2, windowMs: 1000 }).allowed, true);
  assert.equal(checkRateLimit({ key, limit: 2, now: 3, windowMs: 1000 }).allowed, false);
  assert.equal(checkRateLimit({ key, limit: 2, now: 1002, windowMs: 1000 }).allowed, true);
});

test("rate limit can guard repeated auth-sensitive actions", () => {
  resetRateLimitBucket();
  const key = "auth:login:tester@example.com";

  assert.equal(checkRateLimit({ key, limit: 1, now: 1, windowMs: 1000 }).allowed, true);
  assert.equal(checkRateLimit({ key, limit: 1, now: 2, windowMs: 1000 }).allowed, false);
});

test("private beta banner appears with sensitive-data warning", () => {
  const html = renderToStaticMarkup(createElement(PrivateBetaBanner));

  assert.match(html, /Private beta/i);
  assert.match(html, /Social Security numbers/i);
  assert.match(html, /Use estimates for planning/i);
});

test("terms page exists with no-advice and no-guarantee language", () => {
  const html = renderToStaticMarkup(createElement(TermsPage));

  assert.match(html, /educational planning tool/i);
  assert.match(html, /No legal/i);
  assert.match(html, /No guarantee of business success/i);
  assert.match(html, /Verify state, local, licensing, tax, and filing requirements/i);
});

test("privacy page exists with deletion and private-beta limits", () => {
  const html = renderToStaticMarkup(createElement(PrivacyPage));

  assert.match(html, /What not to enter/i);
  assert.match(html, /Deleting data/i);
  assert.match(html, /Social Security numbers/i);
  assert.match(html, /private beta/i);
});

test("safe logger redacts sensitive-looking values", () => {
  const original = console.error;
  const writes: string[] = [];
  console.error = (message?: unknown) => {
    writes.push(String(message));
  };

  try {
    logError("test_sensitive_log", new Error("SSN 123-45-6789"), {
      accountNumber: "1234567890123",
      notes:
        "Card 4111 1111 1111 1111 should not appear. routing number 021000021 password=OpenSesame123! api_key=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
    });
  } finally {
    console.error = original;
  }

  const output = writes.join("\n");
  assert.doesNotMatch(output, /123-45-6789/);
  assert.doesNotMatch(output, /4111 1111 1111 1111/);
  assert.doesNotMatch(output, /1234567890123/);
  assert.doesNotMatch(output, /021000021/);
  assert.doesNotMatch(output, /OpenSesame123/);
  assert.doesNotMatch(output, /sk-proj-abcdefghijklmnopqrstuvwxyz/);
  assert.match(output, /\[redacted/);
});
