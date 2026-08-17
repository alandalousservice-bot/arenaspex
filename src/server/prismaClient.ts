/**
 * SPEX - Prisma Client Singleton
 * عميل واحد لقاعدة البيانات لتفادي استنزاف الاتصالات أثناء إعادة تحميل التطوير (HMR)
 */

// حل مشكلة اتصالات Neon المُجمَّعة: ربط `-pooler`/`.pooler` يمر عبر PgBouncer وقد
// يُوجَّه إلى نسخة قراءة فقط فيرفض الكتابة بخطأ Postgres 25006 (read-only transaction).
// يتم التحويل تلقائياً إلى الرابط المباشر (نفس المضيف بدون pooler) لضمان القراءة/الكتابة.
function resolveDatabaseUrl(raw: string): string {
  const at = raw.lastIndexOf('@');
  if (at === -1) return raw;
  const suffix = raw.slice(at + 1);
  const slashIdx = suffix.indexOf('/');
  const authority = slashIdx === -1 ? suffix : suffix.slice(0, slashIdx);
  const query = slashIdx === -1 ? '' : suffix.slice(slashIdx);
  const host = authority.split(':')[0];
  const isNeonPooled =
    host.endsWith('.neon.tech') && (host.includes('-pooler.') || host.includes('.pooler.'));
  if (!isNeonPooled) return raw;
  const directHost = host.replace('-pooler.', '.').replace('.pooler.', '.');
  return raw.slice(0, at + 1) + authority.replace(host, directHost) + query;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL غير معرّفة. يجب ضبط متغير البيئة DATABASE_URL في بيئة النشر ' +
      '(Render Dashboard → Environment) قبل تشغيل الخادم.'
  );
}

const DATABASE_URL = resolveDatabaseUrl(process.env.DATABASE_URL);
if (DATABASE_URL !== process.env.DATABASE_URL) {
  console.warn(
    '[DB] ⚠️ رصد رابط Neon المُجمَّع (pooler) في DATABASE_URL — تم التحويل تلقائياً إلى الرابط المباشر لضمان الكتابة.'
  );
  console.warn(
    '[DB] ⚠️ يُنصح بتحديث DATABASE_URL في Render Dashboard → Environment بالرابط المباشر (بدون -pooler) لإزالة هذا التحويل.'
  );
}

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: DATABASE_URL } },
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
