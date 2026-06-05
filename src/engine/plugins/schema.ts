import { z, type ZodType } from "zod";

import { engineResultSchema } from "@/engine/shared/engine-result";

export const PluginTypeSchema = z.enum([
  "data_provider",
  "state_resource",
  "funding_provider",
  "market_research_method",
  "business_plan_section",
  "financial_model",
  "website_theme",
  "export_provider",
  "strategy_tool",
]);

export const PluginSourceTypeSchema = z.literal("plugin");

export const PluginDataSchema = z.object({
  pluginId: z.string().min(1),
  pluginType: PluginTypeSchema,
  sourceType: PluginSourceTypeSchema,
  payload: z.unknown(),
});

export const PluginResultSchema = engineResultSchema(PluginDataSchema).superRefine(
  (result, context) => {
    if (!result.sources.length) {
      context.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Plugin results must declare at least one plugin source.",
      });
    }
    result.sources.forEach((source, index) => {
      if (source.sourceType !== "plugin") {
        context.addIssue({
          code: "custom",
          path: ["sources", index, "sourceType"],
          message:
            "Plugin results cannot masquerade as official, user, manual, mock, or AI-generated sources.",
        });
      }
    });
  },
);

export const PluginMetadataSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
      "Plugin ids must be lowercase and use letters, numbers, dots, underscores, or hyphens.",
    ),
  name: z.string().trim().min(1),
  version: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Use semantic versioning."),
  type: PluginTypeSchema,
  enabled: z.boolean(),
  sourceType: PluginSourceTypeSchema,
});

export const RegisteredPluginSchema = PluginMetadataSchema.extend({
  config: z.unknown(),
});

export type PluginType = z.infer<typeof PluginTypeSchema>;
export type PluginSourceType = z.infer<typeof PluginSourceTypeSchema>;
export type PluginData = z.infer<typeof PluginDataSchema>;
export type PluginResult = z.infer<typeof PluginResultSchema>;
export type PluginMetadata = z.infer<typeof PluginMetadataSchema>;
export type RegisteredPlugin = z.infer<typeof RegisteredPluginSchema>;

export interface VentureForgePlugin {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  enabled: boolean;
  sourceType: PluginSourceType;
  configSchema: ZodType;
  run(input: unknown): Promise<PluginResult>;
}
