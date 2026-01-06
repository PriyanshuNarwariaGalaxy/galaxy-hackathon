import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton for Next.js (dev hot-reload safe).
 * UI-side persistence only (workflows).
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;

