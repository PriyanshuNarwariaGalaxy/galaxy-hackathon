import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client for:
 * - Next.js route handlers (UI + persistence)
 * - Trigger.dev tasks (execution + observability)
 *
 * IMPORTANT: Requires DATABASE_URL in both environments.
 */

declare global {
  // eslint-disable-next-line no-var
  var __prismaShared: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prismaShared ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prismaShared = prisma;

