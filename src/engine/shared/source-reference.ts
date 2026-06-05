import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "official",
  "user",
  "ai_generated",
  "mock",
  "manual",
  "plugin",
]);

export const sourceReferenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceName: z.string().min(1),
  sourceType: sourceTypeSchema,
  url: z.url().optional(),
  lastVerifiedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
