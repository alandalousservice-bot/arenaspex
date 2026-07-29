/**
 * SPEX - Prisma Client Singleton
 * عميل واحد لقاعدة البيانات لتفادي استنزاف الاتصالات أثناء إعادة تحميل التطوير (HMR)
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
