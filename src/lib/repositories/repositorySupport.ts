import type { Prisma, PrismaClient } from "@prisma/client";

export type RepositoryClient = PrismaClient | Prisma.TransactionClient;

export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function fromJson<T>(value: Prisma.JsonValue | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : (value as T);
}

