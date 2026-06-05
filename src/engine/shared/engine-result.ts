import { z } from "zod";
import {
  sourceReferenceSchema,
  type SourceReference,
} from "@/engine/shared/source-reference";
import { withGlobalGuardrails } from "@/engine/shared/guardrails";

export interface EngineResult<T> {
  data: T;
  confidence: number;
  assumptions: string[];
  missingInformation: string[];
  warnings: string[];
  sources: SourceReference[];
  nextActions: string[];
}

export const engineResultSchema = <T extends z.ZodType>(
  dataSchema: T,
) =>
  z.object({
    data: dataSchema,
    confidence: z.number().min(0).max(100),
    assumptions: z.array(z.string()),
    missingInformation: z.array(z.string()),
    warnings: z.array(z.string()),
    sources: z.array(sourceReferenceSchema),
    nextActions: z.array(z.string()),
  }).transform(
    (result): EngineResult<z.output<T>> =>
      withGlobalGuardrails(result as EngineResult<z.output<T>>),
  );
