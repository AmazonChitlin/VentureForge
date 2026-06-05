import { z } from "zod";
import type { SourceReference } from "@/engine/shared/source-reference";
import { sourceReferenceSchema } from "@/engine/shared/source-reference";

export const providerSourceTypeSchema = z.enum([
  "official_api",
  "public_web",
  "manual",
  "mock",
  "plugin",
]);

export const manualResearchEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().min(1),
  url: z.url().optional(),
});

export const providerInputSchema = z.object({
  projectId: z.string().min(1),
  geography: z
    .object({
      city: z.string().optional(),
      county: z.string().optional(),
      stateCode: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  naicsCode: z.string().optional(),
  industry: z.string().optional(),
  targetCustomer: z.string().optional(),
  query: z.string().optional(),
  manualResearchEntries: z.array(manualResearchEntrySchema).optional(),
});

export const providerStatusSchema = z.enum(["available", "unavailable"]);

export const providerResultSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    status: providerStatusSchema,
    data: dataSchema.nullable(),
    sources: z.array(sourceReferenceSchema),
    confidence: z.number().min(0).max(100),
    warnings: z.array(z.string()),
    fetchedAt: z.coerce.date(),
    isMockData: z.boolean(),
  });

export type ProviderSourceType = z.infer<typeof providerSourceTypeSchema>;
export type ManualResearchEntry = z.infer<typeof manualResearchEntrySchema>;
export type ProviderInput = z.infer<typeof providerInputSchema>;
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export interface ProviderResult<T> {
  status: ProviderStatus;
  data: T | null;
  sources: SourceReference[];
  confidence: number;
  warnings: string[];
  fetchedAt: Date;
  isMockData: boolean;
}

export interface DataProvider<
  TInput extends ProviderInput = ProviderInput,
  TOutput = unknown,
> {
  readonly id: string;
  readonly name: string;
  readonly sourceType: ProviderSourceType;
  fetch(input: TInput): Promise<ProviderResult<TOutput>>;
}
