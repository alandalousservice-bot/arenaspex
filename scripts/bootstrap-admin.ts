import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { bootstrapAdmin } from '../src/server/adminBootstrap.js';
const db = new PrismaClient();
try {
  const result = await bootstrapAdmin(db, process.env);
  console.log(
    result.created ? 'ADMIN_BOOTSTRAP_CREATED' : 'ADMIN_BOOTSTRAP_EXISTS: no account data changed'
  );
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  console.error(
    message.startsWith('ADMIN_BOOTSTRAP_')
      ? message
      : 'ADMIN_BOOTSTRAP_FAILED: check database availability and migration status'
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
