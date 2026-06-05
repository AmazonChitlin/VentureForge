import { z } from "zod";

export const methodologyFrameworkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string().min(1),
  inputs: z.array(z.string().min(1)),
  outputs: z.array(z.string().min(1)),
  questionsToAsk: z.array(z.string().min(1)),
  scoringModel: z.array(z.string().min(1)),
  qualityChecks: z.array(z.string().min(1)),
  suggestedDataSources: z.array(z.string().min(1)),
  warnings: z.array(z.string().min(1)),
  pluginExtensionPoints: z.array(z.string().min(1)),
});

export type MethodologyFramework = z.infer<typeof methodologyFrameworkSchema>;
