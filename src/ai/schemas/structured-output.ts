import { z } from "zod";

import { engineResultSchema } from "@/engine/shared/engine-result";

export const AIEnhancementSchema = z.object({
  summary: z.string().trim().min(1),
  recommendations: z.array(z.string().trim().min(1)),
  questionsToResolve: z.array(z.string().trim().min(1)),
  sourceNotes: z.array(z.string().trim().min(1)),
});

export const AIEnhancementResultSchema =
  engineResultSchema(AIEnhancementSchema);

export const generatedNarrativeSchema = z.object({
  narrative: z.string(),
  qualityChecklist: z.array(z.string()),
});

export const generatedNarrativeResultSchema = engineResultSchema(
  generatedNarrativeSchema,
);

export type AIEnhancement = z.infer<typeof AIEnhancementSchema>;
export type AIEnhancementResult = z.infer<typeof AIEnhancementResultSchema>;
