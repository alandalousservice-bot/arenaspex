import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { hashPassword } from './auth.js';

/** Production bootstrap: create a missing Admin, never repair/reset existing accounts or seed domain data. */
export async function bootstrapAdmin(db: PrismaClient, env: NodeJS.ProcessEnv) {
  const email = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SUPER_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8)
    throw new Error(
      'ADMIN_BOOTSTRAP_ENV_INVALID: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (8+ characters) are required.'
    );
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const matching = await tx.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          });
          if (matching && matching.role !== 'admin')
            throw new Error(
              'ADMIN_BOOTSTRAP_IDENTITY_CONFLICT: configured identity is not an Admin.'
            );
          const existing =
            matching ||
            (await tx.user.findFirst({
              where: { role: 'admin' },
              orderBy: [{ isPlatformOwner: 'desc' }, { createdAt: 'asc' }],
            }));
          if (existing) return { created: false };
          const suffix = randomUUID();
          await tx.user.create({
            data: {
              id: `usr_${suffix}`,
              username: `spex_admin_${suffix.slice(0, 8)}`,
              spexId: `SPX-ADMIN-${suffix}`,
              firstName: env.SUPER_ADMIN_FIRST_NAME?.trim() || 'مشرف',
              lastName: env.SUPER_ADMIN_LAST_NAME?.trim() || 'المنصة',
              email,
              passwordHash: await hashPassword(password),
              role: 'admin',
              isPlatformOwner: true,
              status: 'active',
              isApprovedByAdmin: true,
              directorateId: '',
              districtId: '',
            },
          });
          return { created: true };
        },
        { isolationLevel: 'Serializable', timeout: 15000 }
      );
    } catch (error) {
      if (['P2034', 'P2002'].includes((error as { code?: string }).code || '') && attempt < 2)
        continue;
      throw error;
    }
  }
  throw new Error('ADMIN_BOOTSTRAP_CONCURRENCY_FAILURE');
}
