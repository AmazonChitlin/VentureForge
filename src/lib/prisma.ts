import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  const client = prismaClient ?? globalForPrisma.prisma ?? new PrismaClient({
    // Raw Prisma error logs can include database internals. VentureForge logs
    // sanitized failures through safeLogger, so noisy Prisma logs are opt-in.
    log: process.env.PRISMA_CLIENT_LOGS === "true" ? ["warn", "error"] : [],
  });
  prismaClient = client;
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = client[property as keyof PrismaClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
