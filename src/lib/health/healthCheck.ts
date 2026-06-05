import { validateProductionEnv, getOptionalProviderEnvStatus } from "@/lib/env";

export type HealthStatus = "ok" | "degraded" | "error";

export interface HealthCheckPayload {
  status: HealthStatus;
  checkedAt: string;
  build: {
    version: string;
    commit: string | null;
    environment: string;
  };
  checks: {
    app: {
      status: "ok";
      message: string;
    };
    auth: {
      configured: boolean;
      status: "ok" | "missing";
      message: string;
    };
    database: {
      reachable: boolean;
      status: "ok" | "error";
      message: string;
    };
    environment: {
      status: "ok" | "missing";
      errors: string[];
    };
    optionalProviders: {
      bls: "configured" | "missing";
      census: "configured" | "missing";
      openaiApiKey: "configured" | "missing";
      llm: "configured" | "missing";
    };
  };
}

export async function buildHealthCheck(
  databaseCheck: () => Promise<void>,
  environment: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<HealthCheckPayload> {
  const env = validateProductionEnv(environment);
  const optionalProviders = getOptionalProviderEnvStatus(environment);
  let databaseReachable = true;
  let databaseMessage = "Database is reachable.";

  try {
    await databaseCheck();
  } catch {
    databaseReachable = false;
    databaseMessage = "Database is not reachable. Check DATABASE_URL and migrations.";
  }

  const hasAuthSecret = Boolean(environment.AUTH_SECRET?.trim()) &&
    (environment.AUTH_SECRET?.trim().length ?? 0) >= 32;
  const hasAuthUrl = Boolean(environment.NEXTAUTH_URL?.trim());
  const authConfigured = hasAuthSecret && hasAuthUrl;
  const requiredOk = env.ok && databaseReachable && authConfigured;
  const status: HealthStatus = requiredOk
    ? "ok"
    : databaseReachable
      ? "degraded"
      : "error";

  return {
    build: {
      commit: shortCommit(environment.VERCEL_GIT_COMMIT_SHA ?? environment.SOURCE_VERSION),
      environment: environment.NODE_ENV ?? "unknown",
      version:
        environment.NEXT_PUBLIC_APP_VERSION ??
        environment.APP_VERSION ??
        environment.npm_package_version ??
        "0.1.0",
    },
    checkedAt: new Date().toISOString(),
    checks: {
      app: {
        message: "VentureForge application code is running.",
        status: "ok",
      },
      auth: {
        configured: authConfigured,
        message: authConfigured
          ? "Auth secret and canonical URL are configured."
          : "AUTH_SECRET is missing/too short or NEXTAUTH_URL is missing.",
        status: authConfigured ? "ok" : "missing",
      },
      database: {
        message: databaseMessage,
        reachable: databaseReachable,
        status: databaseReachable ? "ok" : "error",
      },
      environment: {
        errors: env.errors,
        status: env.ok ? "ok" : "missing",
      },
      optionalProviders: {
        bls: optionalProviders.bls ? "configured" : "missing",
        census: optionalProviders.census ? "configured" : "missing",
        openaiApiKey: optionalProviders.openaiApiKey ? "configured" : "missing",
        llm: optionalProviders.llm ? "configured" : "missing",
      },
    },
    status,
  };
}

function shortCommit(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 12);
}
