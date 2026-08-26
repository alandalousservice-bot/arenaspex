/**
 * SPEX - Prisma Client Singleton with Resilient Retry for Neon E57P01
 * يعالج خطأ PostgreSQL:
 *   FATAL E57P01 "terminating connection due to administrator command"
 * الشائع في Neon عند scale-to-zero / idle timeout / PgBouncer.
 * - يعيد المحاولة تلقائياً مع فصل وإعادة توصيل
 * - يحافظ على عميل واحد (singleton) لتفادي استنزاف الاتصالات أثناء HMR
 */

import { getRuntimeDatabaseUrl } from './runtimeDatabaseUrl.js';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL غير معرّفة. يجب ضبط متغير البيئة DATABASE_URL في بيئة النشر ' +
      '(Render Dashboard → Environment) قبل تشغيل الخادم.'
  );
}

const DATABASE_URL = getRuntimeDatabaseUrl(process.env.DATABASE_URL);
console.log('[DB] Neon pooled runtime connection configured.');

import { PrismaClient } from '@prisma/client';

function isRetryableDbError(err: any): boolean {
  if (!err) return false;
  const msg: string = (err.message || '').toString();
  const code: string = (err.code || '').toString();

  return (
    msg.includes('terminating connection due to administrator command') ||
    msg.includes('E57P01') ||
    msg.includes('57P01') ||
    msg.includes('Closed') ||
    msg.includes("Can't reach database server") ||
    msg.includes('Connection pool timeout') ||
    msg.includes('Timed out fetching a new connection from the connection pool') ||
    msg.includes('Server has closed the connection') ||
    msg.includes('Connection terminated') ||
    code === 'P1001' || // Can't reach database server
    code === 'P1008' || // Operations timed out
    code === 'P1017' || // Server has closed the connection
    code === 'P1000' // Authentication failed against database server - sometimes transient on Neon
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaBase?: PrismaClient;
};

const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    datasources: { db: { url: DATABASE_URL } },
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'],
  });

async function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 400): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (!isRetryableDbError(err) || attempt === retries) {
        throw err;
      }
      console.warn(
        `[DB] ⚠️ Detected retryable DB error (${err.code || 'no-code'}): ${String(err.message).slice(0, 180)} — retrying ${attempt + 1}/${retries}`
      );
      // محاولة فصل وإعادة توصيل لتنظيف الـ pool الفاسد
      try {
        if (typeof prismaBase !== 'undefined' && prismaBase.$disconnect) {
          await prismaBase.$disconnect().catch(() => {
            // Intentionally ignore cleanup failures before retrying the operation.
          });
        }
      } catch {
        // Intentionally ignore cleanup failures before retrying the operation.
      }
      await sleep(baseDelayMs * (attempt + 1) + Math.random() * 250);
      try {
        if (typeof prismaBase !== 'undefined' && prismaBase.$connect) {
          await prismaBase.$connect().catch(() => {
            // Intentionally ignore reconnect failures; the next retry may recover.
          });
        }
      } catch {
        // Intentionally ignore reconnect failures; the next retry may recover.
      }
    }
  }
  throw lastErr;
}

// تمديد يعيد المحاولة لكل عمليات الموديلات ($allModels.$allOperations)
const prismaExtended = (prismaBase as any).$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }: any) {
        return withRetry(() => query(args));
      },
    },
  },
});

// لفّ خاص لـ $queryRaw / $executeRaw / $transaction التي لا تمر عبر $allModels
function wrapRawMethods(client: any, base: any) {
  const methodsToWrap = [
    '$queryRaw',
    '$executeRaw',
    '$queryRawUnsafe',
    '$executeRawUnsafe',
    '$transaction',
  ];

  for (const m of methodsToWrap) {
    if (typeof base[m] === 'function') {
      const original = base[m].bind(base);
      client[m] = (...args: any[]) => withRetry(() => original(...args));
    }
  }
  return client;
}

// نغلف العميل الموسّع ليشمل الـ raw أيضاً
const prismaWithRetry = wrapRawMethods(prismaExtended, prismaBase);

export const prisma = (globalForPrisma.prisma ?? prismaWithRetry) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma as unknown as PrismaClient;
  globalForPrisma.prismaBase = prismaBase;
}

// محاولة اتصال أولي مع إعادة محاولة (لا يُسقط الخادم إن فشل، فقط تحذير — سيُعاد المحاولة عند أول استعلام)
(async () => {
  try {
    await withRetry(() => prismaBase.$connect(), 2, 500);
    console.log('✅ SPEX DB: Prisma client connected (with retry wrapper ready).');
  } catch (err) {
    console.warn(
      '⚠️ SPEX DB: Initial connect failed, will retry on first query:',
      (err as Error).message?.slice(0, 200)
    );
  }
})();
