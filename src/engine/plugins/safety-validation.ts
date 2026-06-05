import type { SourceReference } from "@/engine/shared/source-reference";

import { PluginConfigJsonObjectSchema } from "./persistence";
import {
  PluginMetadataSchema,
  PluginResultSchema,
  type PluginResult,
  type VentureForgePlugin,
} from "./schema";

export class PluginValidationError extends Error {
  readonly name = "PluginValidationError";

  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}

export function validatePluginDefinition(
  plugin: VentureForgePlugin,
): VentureForgePlugin {
  PluginMetadataSchema.parse(plugin);
  if (
    !plugin.configSchema ||
    typeof plugin.configSchema.safeParse !== "function"
  ) {
    throw new PluginValidationError(
      `Plugin ${plugin.id} must declare a Zod config schema.`,
    );
  }
  if (typeof plugin.run !== "function") {
    throw new PluginValidationError(
      `Plugin ${plugin.id} must declare an asynchronous run function.`,
    );
  }
  return plugin;
}

export function validatePluginConfig(
  plugin: VentureForgePlugin,
  configDraft: unknown,
): unknown {
  const parsed = plugin.configSchema.safeParse(configDraft);
  if (!parsed.success) {
    throw new PluginValidationError(
      `Plugin ${plugin.id} configuration failed validation.`,
      parsed.error,
    );
  }
  const jsonConfig = PluginConfigJsonObjectSchema.safeParse(parsed.data);
  if (!jsonConfig.success) {
    throw new PluginValidationError(
      `Plugin ${plugin.id} configuration must be a JSON-safe object for PluginConfig persistence.`,
      jsonConfig.error,
    );
  }
  return jsonConfig.data;
}

export function validatePluginResult(
  plugin: VentureForgePlugin,
  resultDraft: unknown,
): PluginResult {
  const parsed = PluginResultSchema.safeParse(resultDraft);
  if (!parsed.success) {
    throw new PluginValidationError(
      `Plugin ${plugin.id} output failed EngineResult validation.`,
      parsed.error,
    );
  }
  if (parsed.data.data.pluginId !== plugin.id) {
    throw new PluginValidationError(
      `Plugin ${plugin.id} returned output for ${parsed.data.data.pluginId}.`,
    );
  }
  if (parsed.data.data.pluginType !== plugin.type) {
    throw new PluginValidationError(
      `Plugin ${plugin.id} returned the wrong plugin type.`,
    );
  }
  return parsed.data;
}

export function createPluginResult(
  plugin: VentureForgePlugin,
  payload: unknown,
  options: {
    confidence: number;
    assumptions?: string[];
    missingInformation?: string[];
    warnings?: string[];
    sources?: SourceReference[];
    nextActions?: string[];
  },
): PluginResult {
  return validatePluginResult(plugin, {
    data: {
      pluginId: plugin.id,
      pluginType: plugin.type,
      sourceType: plugin.sourceType,
      payload,
    },
    confidence: options.confidence,
    assumptions: options.assumptions ?? [],
    missingInformation: options.missingInformation ?? [],
    warnings: options.warnings ?? [],
    sources:
      options.sources?.length
        ? options.sources
        : [
            {
              id: `plugin:${plugin.id}`,
              title: plugin.name,
              sourceName: plugin.name,
              sourceType: "plugin",
              notes:
                "Plugin-provided planning output. Verify any external facts against their original sources.",
            },
          ],
    nextActions: options.nextActions ?? [],
  });
}
