import { z } from "zod";
import type { Prisma } from "@prisma/client";

export type PluginConfigJsonValue =
  | string
  | number
  | boolean
  | null
  | PluginConfigJsonValue[]
  | { [key: string]: PluginConfigJsonValue };

export const PluginConfigJsonValueSchema: z.ZodType<PluginConfigJsonValue> =
  z.lazy(() =>
    z.union([
      z.string(),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(PluginConfigJsonValueSchema),
      z.record(z.string(), PluginConfigJsonValueSchema),
    ]),
  );

export const PluginConfigJsonObjectSchema = z.record(
  z.string(),
  PluginConfigJsonValueSchema,
);

export const PluginConfigPersistenceRecordSchema = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean(),
  config: PluginConfigJsonObjectSchema,
  updatedAt: z.coerce.date().optional(),
});

export type PluginConfigPersistenceRecord = z.infer<
  typeof PluginConfigPersistenceRecordSchema
>;

export interface PluginConfigPersistenceHooks {
  load(pluginId: string): Promise<PluginConfigPersistenceRecord | null>;
  save(record: PluginConfigPersistenceRecord): Promise<void>;
  remove(pluginId: string): Promise<void>;
}

export class InMemoryPluginConfigPersistence
  implements PluginConfigPersistenceHooks
{
  readonly #records = new Map<string, PluginConfigPersistenceRecord>();

  async load(pluginId: string): Promise<PluginConfigPersistenceRecord | null> {
    return this.#records.get(pluginId) ?? null;
  }

  async save(recordDraft: PluginConfigPersistenceRecord): Promise<void> {
    const record = PluginConfigPersistenceRecordSchema.parse(recordDraft);
    this.#records.set(record.pluginId, {
      ...record,
      updatedAt: record.updatedAt ?? new Date(),
    });
  }

  async remove(pluginId: string): Promise<void> {
    this.#records.delete(pluginId);
  }
}

export interface PrismaPluginConfigDelegate {
  findUnique(
    args: Prisma.PluginConfigFindUniqueArgs,
  ): Promise<{
    pluginId: string;
    enabled: boolean;
    config: Prisma.JsonValue;
    updatedAt: Date;
  } | null>;
  upsert(args: Prisma.PluginConfigUpsertArgs): Promise<unknown>;
  deleteMany(args: Prisma.PluginConfigDeleteManyArgs): Promise<unknown>;
}

export function createPrismaPluginConfigPersistenceHooks(
  pluginConfig: PrismaPluginConfigDelegate,
): PluginConfigPersistenceHooks {
  return {
    async load(pluginId) {
      const record = await pluginConfig.findUnique({ where: { pluginId } });
      return record
        ? PluginConfigPersistenceRecordSchema.parse(record)
        : null;
    },
    async save(recordDraft) {
      const record = PluginConfigPersistenceRecordSchema.parse(recordDraft);
      await pluginConfig.upsert({
        where: { pluginId: record.pluginId },
        create: {
          pluginId: record.pluginId,
          enabled: record.enabled,
          config: record.config as Prisma.InputJsonObject,
        },
        update: {
          enabled: record.enabled,
          config: record.config as Prisma.InputJsonObject,
        },
      });
    },
    async remove(pluginId) {
      await pluginConfig.deleteMany({ where: { pluginId } });
    },
  };
}
