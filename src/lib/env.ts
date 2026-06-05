import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

export const ProductionEnvSchema = z.object({
  AUTH_SECRET: z
    .string()
    .trim()
    .min(32, "AUTH_SECRET must be at least 32 characters."),
  AUTH_TRUST_HOST: optionalTrimmedString,
  BLS_API_KEY: optionalTrimmedString,
  CENSUS_API_KEY: optionalTrimmedString,
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, "DATABASE_URL is required.")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must point to PostgreSQL.",
    ),
  NEXTAUTH_URL: z
    .string()
    .trim()
    .url("NEXTAUTH_URL must be a full URL, such as https://beta.example.com."),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_APP_URL must be a full URL, such as https://beta.example.com."),
  OPENAI_API_KEY: optionalTrimmedString,
  OPENAI_MODEL: optionalTrimmedString,
  OPENAI_COMPATIBLE_API_KEY: optionalTrimmedString,
  OPENAI_COMPATIBLE_BASE_URL: optionalTrimmedString,
  OPENAI_COMPATIBLE_MODEL: optionalTrimmedString,
});

export type ProductionEnv = z.infer<typeof ProductionEnvSchema>;

export interface EnvValidationResult {
  ok: boolean;
  env?: ProductionEnv;
  errors: string[];
}

export function validateProductionEnv(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): EnvValidationResult {
  const parsed = ProductionEnvSchema.safeParse(environment);
  if (parsed.success) {
    return { env: parsed.data, errors: [], ok: true };
  }

  return {
    errors: parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
    ),
    ok: false,
  };
}

export function assertProductionEnv(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): EnvValidationResult {
  const result = validateProductionEnv(environment);
  if (environment.NODE_ENV !== "production" || result.ok) {
    return result;
  }

  throw new Error(
    [
      "VentureForge production environment is not configured.",
      ...result.errors,
    ].join(" "),
  );
}

export function getDevelopmentEnvWarnings(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string[] {
  if (environment.NODE_ENV === "production") return [];
  const result = validateProductionEnv(environment);
  return result.ok
    ? []
    : result.errors.map((error) => `Private beta env warning: ${error}`);
}

export function getOptionalProviderEnvStatus(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  const configured = (name: string) => Boolean(environment[name]?.trim());
  const hasOpenAIKey = configured("OPENAI_API_KEY") ||
    configured("OPENAI_COMPATIBLE_API_KEY");
  const hasOpenAIModel = configured("OPENAI_MODEL") ||
    configured("OPENAI_COMPATIBLE_MODEL");
  const hasOpenAIBaseUrl = configured("OPENAI_COMPATIBLE_BASE_URL") ||
    configured("OPENAI_API_KEY");
  return {
    bls: configured("BLS_API_KEY"),
    census: configured("CENSUS_API_KEY"),
    llm: hasOpenAIKey && hasOpenAIBaseUrl && hasOpenAIModel,
    openaiApiKey: hasOpenAIKey,
  };
}
