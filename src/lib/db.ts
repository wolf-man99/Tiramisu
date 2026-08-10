import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient for the process. Next dev reloads modules on every edit, so we
 * stash the instance on globalThis to avoid exhausting SQLite connections during HMR.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
