import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";

const e2eDatabaseUrl = withConnectionLimit(
  process.env.DATABASE_URL ?? readDotEnvValue("DATABASE_URL"),
);
const e2eAppUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/._*",
  workers: 1,
  use: {
    baseURL: e2eAppUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "find .next -name '._*' -type f -delete 2>/dev/null || true; node node_modules/next/dist/bin/next start -H 127.0.0.1",
    env: {
      ...process.env,
      ...(e2eDatabaseUrl ? { DATABASE_URL: e2eDatabaseUrl } : {}),
      NEXTAUTH_URL: e2eAppUrl,
      NEXT_PUBLIC_APP_URL: e2eAppUrl,
    },
    url: e2eAppUrl,
    reuseExistingServer: false,
  },
});

function readDotEnvValue(name: string): string | undefined {
  try {
    const contents = readFileSync(".env", "utf8");
    const line = contents
      .split(/\r?\n/)
      .find((candidate) => candidate.trim().startsWith(`${name}=`));
    if (!line) return undefined;
    return line
      .slice(line.indexOf("=") + 1)
      .trim()
      .replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

function withConnectionLimit(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!url.protocol.startsWith("postgres")) return value;
    url.searchParams.set("connection_limit", "1");
    return url.toString();
  } catch {
    return value;
  }
}
