import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const mail = vi.hoisted(() => ({
  verificationCodes: new Map<string, string>(),
  resetTokens: new Map<string, string>(),
  googleProfile: {
    googleId: 'qa-google-inspector',
    email: 'qa-google-inspector@example.test',
    emailVerified: true,
    firstName: 'Google',
    lastName: 'QA',
  },
}));

vi.mock('../src/server/emailService.js', () => ({
  isEmailConfigured: () => true,
  sendEmailVerificationCode: async (email: string, _name: string, code: string) => {
    mail.verificationCodes.set(email, code);
    return { sent: true };
  },
  sendPasswordResetEmail: async (email: string, _name: string, token: string) => {
    mail.resetTokens.set(email, token);
    return { sent: true };
  },
}));

vi.mock('../src/server/googleAuth.js', () => ({
  isGoogleSignInConfigured: () => true,
  verifyGoogleIdToken: async () => ({ ...mail.googleProfile }),
}));

const url = process.env.ARENASPEX_POSTGRES_GATE_URL;
const root = process.env.ARENASPEX_POSTGRES_GATE_ROOT;
let db: PrismaClient;
let appServer: Server;
let base = '';
let authPrisma: typeof import('../src/server/prismaClient').prisma;

describe.skipIf(!url)('Secure registration isolated PostgreSQL QA', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      target.hostname !== '127.0.0.1' ||
      target.port !== '55482' ||
      target.pathname !== '/arenaspex_po_ins_02_disposable' ||
      !root ||
      !path
        .resolve(root)
        .toLowerCase()
        .startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-').toLowerCase())
    ) {
      throw new Error('STOP: verified disposable PostgreSQL gate required');
    }
    if (process.env.ARENASPEX_POSTGRES_GATE_MIGRATED !== '1') {
      throw new Error(
        'STOP: the isolated PostgreSQL gate must apply migrations before running registration tests'
      );
    }

    process.env.DATABASE_URL = url!;
    process.env.DIRECT_DATABASE_URL = url!;
    process.env.EMAIL_VERIFICATION_SECRET = 'isolated-postgres-qa-secret-at-least-32-chars';

    db = new PrismaClient({ datasources: { db: { url: url! } } });
    const registrationMigration = await db.$queryRaw<
      { finished_at: Date | null; rolled_back_at: Date | null }[]
    >`
      SELECT finished_at, rolled_back_at FROM "_prisma_migrations"
      WHERE migration_name = '20261010120000_secure_email_verification'
    `;
    expect(registrationMigration).toHaveLength(1);
    expect(registrationMigration[0].finished_at).not.toBeNull();
    expect(registrationMigration[0].rolled_back_at).toBeNull();

    const [identity] = await db.$queryRaw<{ directory: string }[]>`
      SELECT current_setting('data_directory') AS directory
    `;
    expect(path.resolve(identity.directory).toLowerCase()).toBe(
      path.resolve(root, 'data').toLowerCase()
    );

    const columns = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'emailVerifiedAt'
    `;
    expect(columns).toHaveLength(1);
    const indexes = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'EmailVerificationChallenge'
    `;
    expect(indexes.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        'EmailVerificationChallenge_userId_key',
        'EmailVerificationChallenge_expiresAt_idx',
        'EmailVerificationChallenge_lastSentAt_idx',
      ])
    );
    const constraints = await db.$queryRaw<{ contype: string; conname: string }[]>`
      SELECT contype, conname FROM pg_constraint
      WHERE conrelid = '"EmailVerificationChallenge"'::regclass
    `;
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ contype: 'p', conname: 'EmailVerificationChallenge_pkey' }),
        expect.objectContaining({
          contype: 'f',
          conname: 'EmailVerificationChallenge_userId_fkey',
        }),
      ])
    );
    ({ prisma: authPrisma } = await import('../src/server/prismaClient.js'));
    const { authRouter } = await import('../src/server/authRouter.js');
    const { requireAuth, requireOperationalAccount } =
      await import('../src/server/middleware/requireAuth.js');
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api/auth', authRouter);
    app.get('/api/inspector/private', requireAuth, requireOperationalAccount, (_req, res) => {
      res.json({ allowed: true });
    });
    app.get('/api/teacher/private', requireAuth, requireOperationalAccount, (_req, res) => {
      res.json({ allowed: true });
    });
    app.use(
      (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
        res.status(500).json({ error: error.message })
    );
    appServer = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => appServer.once('listening', resolve));
    const address = appServer.address();
    if (!address || typeof address === 'string')
      throw new Error('Loopback test server did not start');
    base = `http://127.0.0.1:${address.port}`;

    await db.directorate.create({
      data: { id: 'qa-dir-registration', name: 'Synthetic QA Directorate' },
    });
    await db.inspectionDistrict.create({
      data: {
        id: 'qa-district-registration',
        name: 'Synthetic QA District',
        directorateId: 'qa-dir-registration',
      },
    });

    writeFileSync(
      path.join(root!, 'secure-registration-migration-evidence.json'),
      JSON.stringify({
        localOnly: true,
        migration: '20261010120000_secure_email_verification',
        migrationStatus: 'Database schema is up to date (verified by isolated gate)',
        migrationApplied: true,
        constraintsVerified: true,
      })
    );
  }, 240_000);

  afterAll(async () => {
    if (appServer) {
      appServer.closeAllConnections();
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }
    if (authPrisma) await authPrisma.$disconnect();
    if (db) await db.$disconnect();
  });

  async function request(pathname: string, body?: unknown, cookie?: string) {
    const response = await fetch(`${base}/api/auth${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  }

  async function register(email: string, role: 'teacher' | 'inspector' = 'teacher') {
    return request('/register', {
      firstName: 'Synthetic',
      lastName: role === 'teacher' ? 'Teacher' : 'Inspector',
      email,
      password: 'Secure-local-qa-password-2026!',
      role,
      eduDirectorateId: 'qa-dir-registration',
      eduDistrictId: 'qa-district-registration',
    });
  }

  async function verify(email: string, code: string, cookie?: string) {
    return request('/email-verification/verify', { email, code }, cookie);
  }

  it('persists registration, verification, Google linking, role gates, reset and atomic concurrency', async () => {
    const teacherEmail = 'qa-registration-teacher@example.test';
    const teacherStart = await register(teacherEmail);
    expect(teacherStart.status).toBe(202);
    expect(teacherStart.cookie).toBeUndefined();
    const teacher = await db.user.findUniqueOrThrow({ where: { email: teacherEmail } });
    expect(teacher).toMatchObject({
      role: 'teacher',
      status: 'pending_approval',
      isApprovedByAdmin: false,
      emailVerifiedAt: null,
    });
    const teacherChallenge = await db.emailVerificationChallenge.findUniqueOrThrow({
      where: { userId: teacher.id },
    });
    const teacherCode = mail.verificationCodes.get(teacherEmail)!;
    expect(teacherCode).toMatch(/^\d{6}$/);
    expect(teacherChallenge.codeHash).not.toBe(teacherCode);
    expect(teacherChallenge.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(
      (await request('/login', { email: teacherEmail, password: 'Secure-local-qa-password-2026!' }))
        .status
    ).toBe(403);

    const wrongCode = teacherCode === '000000' ? '000001' : '000000';
    expect((await verify(teacherEmail, wrongCode)).status).toBe(400);
    const teacherVerified = await verify(teacherEmail, teacherCode);
    expect(teacherVerified.status).toBe(200);
    expect(teacherVerified.cookie).toBeTruthy();
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: teacher.id } })).emailVerifiedAt
    ).toBeTruthy();
    expect((await verify(teacherEmail, teacherCode)).status).toBe(400);

    const inspectorEmail = 'qa-registration-inspector@example.test';
    expect((await register(inspectorEmail, 'inspector')).status).toBe(202);
    const inspector = await db.user.findUniqueOrThrow({ where: { email: inspectorEmail } });
    expect(inspector.role).toBe('inspector');
    const inspectorVerified = await verify(
      inspectorEmail,
      mail.verificationCodes.get(inspectorEmail)!
    );
    expect(inspectorVerified.status).toBe(200);
    const blockedInspector = await fetch(`${base}/api/inspector/private`, {
      headers: { Cookie: inspectorVerified.cookie! },
    });
    expect(blockedInspector.status).toBe(403);

    const resendEmail = 'qa-registration-resend@example.test';
    expect((await register(resendEmail)).status).toBe(202);
    const resendUser = await db.user.findUniqueOrThrow({ where: { email: resendEmail } });
    const oldCode = mail.verificationCodes.get(resendEmail)!;
    const cooldown = await request('/email-verification/request', { email: resendEmail });
    expect(cooldown.status).toBe(202);
    expect(mail.verificationCodes.get(resendEmail)).toBe(oldCode);
    await db.emailVerificationChallenge.update({
      where: { userId: resendUser.id },
      data: { lastSentAt: new Date(Date.now() - 61_000) },
    });
    const resend = await request('/email-verification/request', { email: resendEmail });
    expect(resend.status).toBe(202);
    const newCode = mail.verificationCodes.get(resendEmail)!;
    expect(newCode).not.toBe(oldCode);
    expect((await verify(resendEmail, oldCode)).status).toBe(400);
    expect((await verify(resendEmail, newCode)).status).toBe(200);

    const limitedEmail = 'qa-registration-attempts@example.test';
    expect((await register(limitedEmail)).status).toBe(202);
    const limitedCode = mail.verificationCodes.get(limitedEmail)!;
    const invalid = limitedCode === '999999' ? '999998' : '999999';
    for (let attempt = 0; attempt < 5; attempt += 1)
      expect((await verify(limitedEmail, invalid)).status).toBe(400);
    expect((await verify(limitedEmail, limitedCode)).status).toBe(400);
    const limitedUser = await db.user.findUniqueOrThrow({ where: { email: limitedEmail } });
    expect(
      (await db.emailVerificationChallenge.findUniqueOrThrow({ where: { userId: limitedUser.id } }))
        .failedAttempts
    ).toBe(5);

    const expiredEmail = 'qa-registration-expired@example.test';
    expect((await register(expiredEmail)).status).toBe(202);
    const expiredUser = await db.user.findUniqueOrThrow({ where: { email: expiredEmail } });
    const expiredCode = mail.verificationCodes.get(expiredEmail)!;
    await db.emailVerificationChallenge.update({
      where: { userId: expiredUser.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect((await verify(expiredEmail, expiredCode)).status).toBe(400);

    const concurrentEmail = 'qa-registration-concurrent@example.test';
    expect((await register(concurrentEmail)).status).toBe(202);
    const concurrentCode = mail.verificationCodes.get(concurrentEmail)!;
    const concurrent = await Promise.all([
      verify(concurrentEmail, concurrentCode),
      verify(concurrentEmail, concurrentCode),
    ]);
    expect(concurrent.map((result) => result.status).sort()).toEqual([200, 400]);

    const googleProfile = {
      googleId: 'qa-google-inspector',
      email: 'qa-google-inspector@example.test',
      emailVerified: true,
      firstName: 'Google',
      lastName: 'QA',
    };
    Object.assign(mail.googleProfile, googleProfile);
    const googleStart = await request('/google', {
      credential: 'verified-google-credential-for-postgres-qa',
      registration: {
        role: 'inspector',
        eduDirectorateId: 'qa-dir-registration',
        eduDistrictId: 'qa-district-registration',
      },
    });
    expect(googleStart.status).toBe(200);
    const googleUser = await db.user.findUniqueOrThrow({ where: { email: googleProfile.email } });
    expect(googleUser).toMatchObject({
      role: 'inspector',
      status: 'pending_approval',
      isApprovedByAdmin: false,
      googleId: googleProfile.googleId,
    });
    expect(googleUser.emailVerifiedAt).toBeTruthy();
    expect(
      (await request('/google', { credential: 'verified-google-credential-for-postgres-qa' })).data
        .user.id
    ).toBe(googleUser.id);

    Object.assign(mail.googleProfile, {
      ...googleProfile,
      googleId: 'qa-google-for-existing-password-account',
      email: teacherEmail,
    });
    const unsafeLink = await request('/google', {
      credential: 'verified-google-credential-for-postgres-qa',
    });
    expect(unsafeLink.status).toBe(409);
    const explicitLink = await request(
      '/google/link',
      { credential: 'verified-google-credential-for-postgres-qa' },
      teacherVerified.cookie
    );
    expect(explicitLink.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: teacher.id } })).googleId).toBe(
      'qa-google-for-existing-password-account'
    );

    Object.assign(mail.googleProfile, {
      ...googleProfile,
      googleId: 'qa-google-for-existing-password-account',
      email: 'qa-collision@example.test',
    });
    const collision = await request(
      '/google/link',
      { credential: 'verified-google-credential-for-postgres-qa' },
      inspectorVerified.cookie
    );
    expect(collision.status).toBe(409);

    const duplicateBefore = await db.user.count({ where: { email: teacherEmail } });
    expect((await register(teacherEmail)).status).toBe(202);
    expect(await db.user.count({ where: { email: teacherEmail } })).toBe(duplicateBefore);

    const resetRequest = await request('/forgot-password', { email: teacherEmail });
    expect(resetRequest.status).toBe(200);
    const resetToken = mail.resetTokens.get(teacherEmail)!;
    expect(resetToken).toBeTruthy();
    expect(
      (
        await request('/reset-password', {
          token: resetToken,
          newPassword: 'Replacement-secure-pass-2026!',
        })
      ).status
    ).toBe(200);

    const rollbackUser = await db.user.findUniqueOrThrow({ where: { email: limitedEmail } });
    const beforeRollback = await db.emailVerificationChallenge.findUniqueOrThrow({
      where: { userId: rollbackUser.id },
    });
    await expect(
      db.$transaction(async (tx) => {
        await tx.emailVerificationChallenge.update({
          where: { userId: rollbackUser.id },
          data: { consumedAt: new Date() },
        });
        await tx.user.update({
          where: { id: 'qa-missing-user' },
          data: { emailVerifiedAt: new Date() },
        });
      })
    ).rejects.toThrow();
    const afterRollback = await db.emailVerificationChallenge.findUniqueOrThrow({
      where: { userId: rollbackUser.id },
    });
    expect(afterRollback.consumedAt).toEqual(beforeRollback.consumedAt);
  }, 120_000);

  it('applies the additive migration over an existing synthetic account and geography', async () => {
    const targetDb = `arenaspex_preexisting_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const psql = 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
    let legacyDb: PrismaClient | undefined;
    const priorSchemaDir = path.join(root!, 'pre-migration-schema');
    mkdirSync(priorSchemaDir, { recursive: true });
    const schema = readFileSync('prisma/schema.prisma', 'utf8')
      .replace(/^\s*emailVerifiedAt\s+DateTime\?\s+@db\.Timestamptz\(3\)\s*\r?\n/m, '')
      .replace(/^\s*emailVerificationChallenge\s+EmailVerificationChallenge\?\s*\r?\n/m, '')
      .replace(/^model EmailVerificationChallenge \{[\s\S]*?^\}\s*\r?\n/m, '');
    const schemaPath = path.join(priorSchemaDir, 'schema.prisma');
    writeFileSync(schemaPath, schema);
    const targetUrl = new URL(url!);
    targetUrl.pathname = `/${targetDb}`;
    try {
      execFileSync(
        psql,
        [
          '-X',
          '-h',
          '127.0.0.1',
          '-p',
          '55482',
          '-U',
          'gate_admin',
          '-d',
          'postgres',
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          `CREATE DATABASE "${targetDb}"`,
        ],
        { encoding: 'utf8', timeout: 30_000 }
      );
      execFileSync(
        process.execPath,
        [
          path.resolve('node_modules/prisma/build/index.js'),
          'db',
          'push',
          '--schema',
          schemaPath,
          '--skip-generate',
        ],
        {
          env: {
            ...process.env,
            DATABASE_URL: targetUrl.toString(),
            DIRECT_DATABASE_URL: targetUrl.toString(),
          },
          encoding: 'utf8',
          timeout: 120_000,
        }
      );
      legacyDb = new PrismaClient({ datasources: { db: { url: targetUrl.toString() } } });
      const [legacyIdentity] = await legacyDb.$queryRaw<{ directory: string }[]>`
        SELECT current_setting('data_directory') AS directory
      `;
      expect(path.resolve(legacyIdentity.directory).toLowerCase()).toBe(
        path.resolve(root!, 'data').toLowerCase()
      );
      await legacyDb.$executeRaw`INSERT INTO "Directorate" ("id", "name", "createdAt", "updatedAt") VALUES ('qa-legacy-dir', 'Synthetic legacy directorate', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
      await legacyDb.$executeRaw`INSERT INTO "InspectionDistrict" ("id", "name", "directorateId", "createdAt", "updatedAt") VALUES ('qa-legacy-district', 'Synthetic legacy district', 'qa-legacy-dir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
      await legacyDb.$executeRaw`
        INSERT INTO "User" ("id", "username", "spexId", "firstName", "lastName", "email", "passwordHash", "role", "directorateId", "districtId", "status", "isApprovedByAdmin", "createdAt", "updatedAt")
        VALUES ('qa-legacy-teacher', 'qa-legacy-teacher', 'SPX-QA-LEGACY', 'Synthetic', 'Legacy', 'qa-legacy@example.test', 'synthetic-hash', 'teacher', 'qa-legacy-dir', 'qa-legacy-district', 'pending_approval', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await legacyDb.$disconnect();
      legacyDb = undefined;
      execFileSync(
        psql,
        [
          '-X',
          '-h',
          '127.0.0.1',
          '-p',
          '55482',
          '-U',
          'gate_admin',
          '-d',
          targetDb,
          '-v',
          'ON_ERROR_STOP=1',
          '-f',
          path.resolve('prisma/migrations/20261010120000_secure_email_verification/migration.sql'),
        ],
        { encoding: 'utf8', timeout: 30_000 }
      );
      const verifyLegacy = new PrismaClient({ datasources: { db: { url: targetUrl.toString() } } });
      const rows = await verifyLegacy.$queryRaw<
        { email: string; districtId: string; emailVerifiedAt: Date | null }[]
      >`
        SELECT u."email", u."districtId", u."emailVerifiedAt"
        FROM "User" u JOIN "InspectionDistrict" d ON d."id" = u."districtId"
        WHERE u."id" = 'qa-legacy-teacher'
      `;
      expect(rows).toEqual([
        expect.objectContaining({
          email: 'qa-legacy@example.test',
          districtId: 'qa-legacy-district',
          emailVerifiedAt: null,
        }),
      ]);
      expect(await verifyLegacy.emailVerificationChallenge.count()).toBe(0);
      await verifyLegacy.$disconnect();
    } finally {
      if (legacyDb) await legacyDb.$disconnect();
      execFileSync(
        psql,
        [
          '-X',
          '-h',
          '127.0.0.1',
          '-p',
          '55482',
          '-U',
          'gate_admin',
          '-d',
          'postgres',
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          `DROP DATABASE IF EXISTS "${targetDb}" WITH (FORCE)`,
        ],
        { encoding: 'utf8', timeout: 30_000 }
      );
    }
  }, 180_000);
});
