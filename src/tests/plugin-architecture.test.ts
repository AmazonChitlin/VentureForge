import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

import {
  createPrismaPluginConfigPersistenceHooks,
  InMemoryPluginConfigPersistence,
  MarketResearchMethodPlugin,
  MockFundingPlugin,
  MockFundingPluginOutputSchema,
  PluginRegistry,
  WebsiteThemePlugin,
  type VentureForgePlugin,
} from "../engine/plugins";

test("plugin registers and can be listed by type", () => {
  const registry = new PluginRegistry();
  registry.registerPlugin(new WebsiteThemePlugin(), {});
  registry.registerPlugin(new MarketResearchMethodPlugin(), {});

  assert.equal(registry.listPlugins().length, 2);
  assert.equal(registry.getPluginsByType("website_theme").length, 1);
  assert.equal(
    registry.getPlugin("website-theme-plugin")?.sourceType,
    "plugin",
  );
});

test("disabled plugin does not run", async () => {
  let runCount = 0;
  const registry = new PluginRegistry();
  registry.registerPlugin(
    validPlugin({
      id: "disabled-test-plugin",
      enabled: false,
      run: async () => {
        runCount += 1;
        return validPluginResult(
          "disabled-test-plugin",
          "strategy_tool",
        );
      },
    }),
  );

  const outcome = await registry.runPlugin("disabled-test-plugin", {});

  assert.equal(outcome.status, "disabled");
  assert.equal(runCount, 0);
});

test("invalid plugin output fails safely", async () => {
  const registry = new PluginRegistry();
  registry.registerPlugin(
    validPlugin({
      id: "invalid-output-plugin",
      run: async () =>
        ({
          summary: "This bypasses EngineResult and must be rejected.",
        }) as never,
    }),
  );

  const outcome = await registry.runPlugin("invalid-output-plugin", {});

  assert.equal(outcome.status, "rejected");
  assert.match(outcome.error, /failed EngineResult validation/i);
});

test("plugin output cannot masquerade as an official source", async () => {
  const registry = new PluginRegistry();
  registry.registerPlugin(
    validPlugin({
      id: "official-source-masquerade-plugin",
      run: async () => ({
        ...validPluginResult(
          "official-source-masquerade-plugin",
          "strategy_tool",
        ),
        sources: [
          {
            id: "pretend-official-source",
            title: "Pretend official result",
            sourceName: "Plugin-controlled label",
            sourceType: "official",
            url: "https://example.gov/pretend",
          },
        ],
      }),
    }),
  );

  const outcome = await registry.runPlugin(
    "official-source-masquerade-plugin",
    {},
  );

  assert.equal(outcome.status, "rejected");
  assert.match(outcome.error, /failed EngineResult validation/i);
});

test("funding plugin can add a funding-opportunity template", async () => {
  const registry = new PluginRegistry();
  registry.registerPlugin(new MockFundingPlugin(), {});

  const outcome = await registry.runPlugin("mock-funding-plugin", {});
  assert.equal(outcome.status, "success");
  if (outcome.status !== "success") return;
  const payload = MockFundingPluginOutputSchema.parse(
    outcome.result.data.payload,
  );

  assert.equal(outcome.result.data.sourceType, "plugin");
  assert.equal(outcome.result.confidence, 20);
  assert.equal(payload.opportunities.length, 1);
  assert.equal(payload.opportunities[0]?.verificationRequired, true);
  assert.match(
    payload.opportunities[0]?.opportunityName ?? "",
    /community-capital research template/i,
  );
});

test("validated PluginConfig hooks persist enabled state and config", async () => {
  const persistence = new InMemoryPluginConfigPersistence();
  const firstRegistry = new PluginRegistry(persistence);
  firstRegistry.registerPlugin(new WebsiteThemePlugin(), {});
  firstRegistry.setPluginConfig("website-theme-plugin", {
    enabled: false,
    config: { accentColor: "#112233" },
  });
  await firstRegistry.savePluginConfig("website-theme-plugin");

  const secondRegistry = new PluginRegistry(persistence);
  secondRegistry.registerPlugin(new WebsiteThemePlugin(), {});
  const loaded = await secondRegistry.loadPluginConfig("website-theme-plugin");
  const outcome = await secondRegistry.runPlugin("website-theme-plugin", {});

  assert.equal(loaded?.enabled, false);
  assert.deepEqual(loaded?.config, { accentColor: "#112233" });
  assert.equal(outcome.status, "disabled");
});

test("plugin configuration must remain a JSON-safe object", () => {
  const registry = new PluginRegistry();

  assert.throws(
    () =>
      registry.registerPlugin(
        validPlugin({
          id: "invalid-config-plugin",
          configSchema: z.string(),
        }),
        "not-an-object",
      ),
    /JSON-safe object/i,
  );
});

function compilePrismaPersistenceAdapter(client: PrismaClient) {
  return createPrismaPluginConfigPersistenceHooks(client.pluginConfig);
}

void compilePrismaPersistenceAdapter;

function validPlugin(
  overrides: Partial<VentureForgePlugin> & Pick<VentureForgePlugin, "id">,
): VentureForgePlugin {
  return {
    id: overrides.id,
    name: overrides.name ?? "Valid Test Plugin",
    version: overrides.version ?? "1.0.0",
    type: overrides.type ?? "strategy_tool",
    enabled: overrides.enabled ?? true,
    sourceType: "plugin",
    configSchema: overrides.configSchema ?? z.object({}),
    run:
      overrides.run ??
      (async () =>
        validPluginResult(
          overrides.id,
          overrides.type ?? "strategy_tool",
        )),
  };
}

function validPluginResult(
  pluginId: string,
  pluginType: VentureForgePlugin["type"],
) {
  return {
    data: {
      pluginId,
      pluginType,
      sourceType: "plugin" as const,
      payload: { ok: true },
    },
    confidence: 50,
    assumptions: [],
    missingInformation: [],
    warnings: [],
    sources: [
      {
        id: `plugin:${pluginId}`,
        title: "Test plugin result",
        sourceName: "Test plugin",
        sourceType: "plugin" as const,
      },
    ],
    nextActions: [],
  };
}
