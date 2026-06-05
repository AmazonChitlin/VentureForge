import { z } from "zod";

export class StructuredOutputValidationError extends Error {
  readonly name = "StructuredOutputValidationError";

  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}

export function parseStructuredOutput<TSchema extends z.ZodType>(
  rawOutput: unknown,
  schema: TSchema,
): z.output<TSchema> {
  const parsedJson = parseJsonValue(rawOutput);
  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new StructuredOutputValidationError(
      `LLM output failed structured validation: ${z.prettifyError(parsed.error)}`,
      parsed.error,
    );
  }
  return parsed.data;
}

export function safeParseStructuredOutput<TSchema extends z.ZodType>(
  rawOutput: unknown,
  schema: TSchema,
):
  | { success: true; data: z.output<TSchema> }
  | { success: false; error: StructuredOutputValidationError } {
  try {
    return { success: true, data: parseStructuredOutput(rawOutput, schema) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof StructuredOutputValidationError
          ? error
          : new StructuredOutputValidationError(
              "LLM output could not be parsed safely.",
              error,
            ),
    };
  }
}

function parseJsonValue(rawOutput: unknown): unknown {
  if (typeof rawOutput !== "string") return rawOutput;
  const trimmed = rawOutput.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(withoutFence);
  } catch (error) {
    throw new StructuredOutputValidationError(
      "LLM output was not valid JSON.",
      error,
    );
  }
}
