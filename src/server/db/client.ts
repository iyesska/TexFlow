import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/config/env";

import { PrismaClient } from "./generated/client";

const globalForDb = globalThis as typeof globalThis & { texflowDb?: PrismaClient };

/**
 * The database client. Created on first use, so builds and tests that never touch the
 * database need no connection, and kept on globalThis so hot reloads reuse it.
 */
export function db(): PrismaClient {
  if (!globalForDb.texflowDb) {
    if (!env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set: the database is needed for accounts and documents.",
      );
    }
    globalForDb.texflowDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
  }
  return globalForDb.texflowDb;
}

export type { PrismaClient };
export { Prisma, TitleSource } from "./generated/client";
