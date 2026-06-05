import {
  PluginConfigPersistenceRecordSchema,
  type PluginConfigPersistenceHooks,
  type PluginConfigPersistenceRecord,
} from "./persistence";
import {
  PluginTypeSchema,
  type PluginResult,
  type PluginType,
  type RegisteredPlugin,
  type VentureForgePlugin,
} from "./schema";
import {
  PluginValidationError,
  validatePluginConfig,
  validatePluginDefinition,
  validatePluginResult,
} from "./safety-validation";

interface PluginRegistration {
  plugin: VentureForgePlugin;
  enabled: boolean;
  config: unknown;
}

export type PluginRunOutcome =
  | {
      status: "success";
      pluginId: string;
      result: PluginResult;
    }
  | {
      status: "disabled" | "not_found" | "rejected";
      pluginId: string;
      error: string;
    };

export class PluginRegistry {
  readonly #plugins = new Map<string, PluginRegistration>();

  constructor(
    private readonly persistence?: PluginConfigPersistenceHooks,
  ) {}

  registerPlugin(
    pluginDraft: VentureForgePlugin,
    configDraft: unknown = {},
  ): RegisteredPlugin {
    const plugin = validatePluginDefinition(pluginDraft);
    if (this.#plugins.has(plugin.id)) {
      throw new PluginValidationError(`Plugin already registered: ${plugin.id}`);
    }
    const config = validatePluginConfig(plugin, configDraft);
    const registration = { plugin, enabled: plugin.enabled, config };
    this.#plugins.set(plugin.id, registration);
    return toRegisteredPlugin(registration);
  }

  unregisterPlugin(pluginId: string): boolean {
    return this.#plugins.delete(pluginId);
  }

  listPlugins(): RegisteredPlugin[] {
    return [...this.#plugins.values()].map(toRegisteredPlugin);
  }

  getPlugin(pluginId: string): RegisteredPlugin | undefined {
    const registration = this.#plugins.get(pluginId);
    return registration ? toRegisteredPlugin(registration) : undefined;
  }

  getPluginsByType(typeDraft: PluginType): RegisteredPlugin[] {
    const type = PluginTypeSchema.parse(typeDraft);
    return this.listPlugins().filter((plugin) => plugin.type === type);
  }

  setPluginConfig(
    pluginId: string,
    update: { enabled?: boolean; config?: unknown },
  ): RegisteredPlugin {
    const registration = this.requireRegistration(pluginId);
    if (update.config !== undefined) {
      registration.config = validatePluginConfig(
        registration.plugin,
        update.config,
      );
    }
    if (update.enabled !== undefined) {
      registration.enabled = update.enabled;
    }
    return toRegisteredPlugin(registration);
  }

  getPluginConfig(pluginId: string): PluginConfigPersistenceRecord {
    const registration = this.requireRegistration(pluginId);
    return PluginConfigPersistenceRecordSchema.parse({
      pluginId,
      enabled: registration.enabled,
      config: registration.config,
    });
  }

  async runPlugin(
    pluginId: string,
    input: unknown,
  ): Promise<PluginRunOutcome> {
    const registration = this.#plugins.get(pluginId);
    if (!registration) {
      return {
        status: "not_found",
        pluginId,
        error: `Plugin is not registered: ${pluginId}.`,
      };
    }
    if (!registration.enabled) {
      return {
        status: "disabled",
        pluginId,
        error: `Plugin is disabled: ${pluginId}.`,
      };
    }

    try {
      const result = validatePluginResult(
        registration.plugin,
        await registration.plugin.run(input),
      );
      return { status: "success", pluginId, result };
    } catch (error) {
      return {
        status: "rejected",
        pluginId,
        error: safeErrorMessage(error),
      };
    }
  }

  async savePluginConfig(pluginId: string): Promise<void> {
    if (!this.persistence) {
      throw new Error("PluginConfig persistence hooks are not configured.");
    }
    await this.persistence.save(this.getPluginConfig(pluginId));
  }

  async loadPluginConfig(
    pluginId: string,
  ): Promise<RegisteredPlugin | undefined> {
    if (!this.persistence) {
      throw new Error("PluginConfig persistence hooks are not configured.");
    }
    const stored = await this.persistence.load(pluginId);
    if (!stored) return undefined;
    return this.setPluginConfig(pluginId, stored);
  }

  async loadAllPluginConfigs(): Promise<RegisteredPlugin[]> {
    const loaded: RegisteredPlugin[] = [];
    for (const plugin of this.listPlugins()) {
      const stored = await this.loadPluginConfig(plugin.id);
      if (stored) loaded.push(stored);
    }
    return loaded;
  }

  async removePersistedPluginConfig(pluginId: string): Promise<void> {
    if (!this.persistence) {
      throw new Error("PluginConfig persistence hooks are not configured.");
    }
    await this.persistence.remove(pluginId);
  }

  register(
    plugin: VentureForgePlugin,
    config: unknown = {},
  ): RegisteredPlugin {
    return this.registerPlugin(plugin, config);
  }

  unregister(pluginId: string): boolean {
    return this.unregisterPlugin(pluginId);
  }

  list(): RegisteredPlugin[] {
    return this.listPlugins();
  }

  get(pluginId: string): RegisteredPlugin | undefined {
    return this.getPlugin(pluginId);
  }

  private requireRegistration(pluginId: string): PluginRegistration {
    const registration = this.#plugins.get(pluginId);
    if (!registration) {
      throw new Error(`Plugin is not registered: ${pluginId}.`);
    }
    return registration;
  }
}

export const defaultPluginRegistry = new PluginRegistry();

export function registerPlugin(
  plugin: VentureForgePlugin,
  config: unknown = {},
): RegisteredPlugin {
  return defaultPluginRegistry.registerPlugin(plugin, config);
}

export function unregisterPlugin(pluginId: string): boolean {
  return defaultPluginRegistry.unregisterPlugin(pluginId);
}

export function listPlugins(): RegisteredPlugin[] {
  return defaultPluginRegistry.listPlugins();
}

export function getPluginsByType(type: PluginType): RegisteredPlugin[] {
  return defaultPluginRegistry.getPluginsByType(type);
}

export function runPlugin(
  pluginId: string,
  input: unknown,
): Promise<PluginRunOutcome> {
  return defaultPluginRegistry.runPlugin(pluginId, input);
}

function toRegisteredPlugin(
  registration: PluginRegistration,
): RegisteredPlugin {
  return {
    id: registration.plugin.id,
    name: registration.plugin.name,
    version: registration.plugin.version,
    type: registration.plugin.type,
    enabled: registration.enabled,
    sourceType: registration.plugin.sourceType,
    config: registration.config,
  };
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Plugin execution failed validation safely.";
}
