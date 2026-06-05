# Plugin Architecture

VentureForge plugins extend engine capabilities without bypassing the shared
result contract. The registry supports:

- `data_provider`
- `state_resource`
- `funding_provider`
- `market_research_method`
- `business_plan_section`
- `financial_model`
- `website_theme`
- `export_provider`
- `strategy_tool`

## Safety boundary

Every plugin must declare lowercase id metadata, semantic version, plugin type,
enabled state, `sourceType: "plugin"`, a Zod configuration schema, and an
asynchronous `run()` method.

`PluginRegistry.runPlugin()` validates all output before returning success.
Plugin output must use the shared `EngineResult` fields, declare confidence,
identify the originating plugin, and include at least one `plugin` source.
Plugin sources cannot masquerade as official, user, mock, manual, or
AI-generated sources. Disabled plugins do not execute. Invalid output and
runtime failures return a rejected outcome instead of escaping into an engine.

## Configuration persistence

The registry stores validated runtime configuration separately from plugin
objects. `PluginConfigPersistenceHooks` maps cleanly onto Prisma's existing
`PluginConfig` model:

- `load(pluginId)`
- `save(record)`
- `remove(pluginId)`

Use `createPrismaPluginConfigPersistenceHooks(prisma.pluginConfig)` at the
server boundary. The engine remains independent from Prisma so native, test,
and future connector hosts can supply their own persistence implementation.

## Examples

The example plugins are deliberately modest:

- `MockFundingPlugin`: development-only funding template
- `MockStateResourcePlugin`: agency-verification research path
- `WebsiteThemePlugin`: fixed website theme tokens
- `MarketResearchMethodPlugin`: founder-led interview sprint

Mock plugin output must never be presented as live official data.
