import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, it, vi } from 'vitest';
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({
  parseStudentRosterPdf: () => {
    throw new Error('not used');
  },
  StudentRosterPdfImportError: class extends Error {},
}));
import assert from 'node:assert/strict';
describe.skipIf(!process.env.ARENASPEX_POSTGRES_GATE_URL)(
  'Transaction conflict real disposable PostgreSQL',
  () => {
    it('recovers, exhausts with safe 409s, and keeps writes and audits atomic', async () => {
      process.env.DATABASE_URL = process.env.ARENASPEX_POSTGRES_GATE_URL!;
      process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
      const gateRoot = process.env.ARENASPEX_POSTGRES_GATE_ROOT!;
      assert.ok(
        path
          .resolve(gateRoot)
          .startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-'))
      );
      const url = new URL(process.env.DATABASE_URL!);
      assert.equal(url.hostname, '127.0.0.1');
      assert.equal(url.port, '55482');
      assert.equal(url.pathname, '/arenaspex_po_ins_02_disposable');
      const observer = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      const { prisma } = await import('../src/server/prismaClient.ts');
      const service = await import('../src/server/assignmentTransferService.ts');
      const result: any = { clientVersion: '6.19.3', cases: {} };
      const original = prisma.$transaction.bind(prisma);
      let server: any;
      try {
        const identity: any[] = await observer.$queryRawUnsafe(
          "SELECT current_database() AS db,current_setting('data_directory') AS directory,current_setting('default_transaction_isolation') AS isolation"
        );
        assert.equal(identity[0].db, 'arenaspex_po_ins_02_disposable');
        assert.equal(
          identity[0].directory.replaceAll('\\', '/'),
          path.join(gateRoot, 'data').replaceAll('\\', '/')
        );
        result.database = identity;
        assert.equal(
          (
            await observer.$queryRawUnsafe<any[]>(
              "SELECT tablename FROM pg_tables WHERE schemaname='public'"
            )
          ).length,
          0
        );
        execFileSync(
          process.execPath,
          [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
          {
            env: {
              ...process.env,
              DATABASE_URL: url.toString(),
              DIRECT_DATABASE_URL: url.toString(),
            },
            timeout: 60000,
          }
        );
        for (const [id, role] of [
          ['T', 'teacher'],
          ['A', 'admin'],
        ])
          await observer.user.create({
            data: {
              id,
              role,
              username: id,
              spexId: id,
              email: id + '@example.test',
              firstName: id,
              lastName: 'Synthetic',
              passwordHash: 'synthetic-only',
              directorateId: '',
              districtId: '',
              status: 'active',
              isApprovedByAdmin: true,
              accessExpiresAt: new Date('2099-07-31'),
            },
          });
        let reads = 0,
          attempts = 0;
        const errors: string[] = [],
          isolations: string[] = [];
        let release: any;
        const barrier = new Promise<void>((r) => (release = r));
        (prisma as any).$transaction = (work: any, options: any) => {
          attempts++;
          return original(async (tx: any) => {
            const iso: any[] = await tx.$queryRawUnsafe(
              "SELECT current_setting('transaction_isolation') AS isolation"
            );
            isolations.push(iso[0].isolation);
            const read = tx.user.findUnique.bind(tx.user);
            tx.user.findUnique = async (args: any) => {
              const row = await read(args);
              if (args.where.id === 'T' && reads < 2) {
                reads++;
                if (reads === 2) release();
                await barrier;
              }
              return row;
            };
            return work(tx);
          }, options).catch((e: any) => {
            errors.push(e.code);
            throw e;
          });
        };
        const two = await Promise.allSettled([
          service.updateTeacherProfile('T', { bio: 'one' }),
          service.updateTeacherProfile('T', { bio: 'two' }),
        ]);
        assert.equal(two.filter((r) => r.status === 'fulfilled').length, 2);
        assert.ok(errors.includes('P2034'));
        assert.ok(isolations.every((x) => x === 'serializable'));
        result.cases.retrySuccess = {
          requests: 2,
          successes: 2,
          transactionAttempts: attempts,
          errors,
          isolations,
          finalBio: (await observer.user.findUniqueOrThrow({ where: { id: 'T' } })).bio,
        };
        (prisma as any).$transaction = original;
        let forcedAttempts = 0,
          forcedErrors: any[] = [];
        const force = () => {
          (prisma as any).$transaction = (work: any, options: any) =>
            original(async (tx: any) => {
              forcedAttempts++;
              const update = tx.user.update.bind(tx.user);
              tx.user.update = async (args: any) => {
                await observer.user.update({
                  where: { id: args.where.id },
                  data: { bio: 'outside-' + forcedAttempts },
                });
                return update(args);
              };
              return work(tx);
            }, options).catch((e: any) => {
              forcedErrors.push({ code: e.code, message: e.message.split('\n').at(-1) });
              throw e;
            });
        };
        force();
        const exhausted = await service.updateTeacherProfile('T', { phone: 'failed-value' }).then(
          () => ({ success: true }),
          (e) => ({ success: false, code: e.code, name: e.constructor.name })
        );
        assert.equal(exhausted.success, false);
        assert.equal((exhausted as any).code, 'CONFLICT');
        assert.equal(forcedAttempts, 3);
        assert.equal((await observer.user.findUniqueOrThrow({ where: { id: 'T' } })).phone, null);
        result.cases.retryExhaustion = {
          attempts: forcedAttempts,
          errors: forcedErrors,
          outcome: exhausted,
          failedWriteRolledBack: true,
        };
        (prisma as any).$transaction = original;
        await import('express-async-errors');
        const { default: express } = await import('express');
        const { default: cookieParser } = await import('cookie-parser');
        const { apiRouter } = await import('../src/server/apiRouter.ts');
        const { signSession } = await import('../src/server/auth.ts');
        const app = express();
        app.use(express.json());
        app.use(cookieParser());
        app.use('/api', apiRouter);
        app.use((e: any, _q: any, s: any, _n: any) => s.status(500).json({ code: e.code }));
        server = await new Promise<any>((r) => {
          const s = app.listen(0, '127.0.0.1', () => r(s));
        });
        forcedAttempts = 0;
        forcedErrors = [];
        force();
        const response = await fetch(
          'http://127.0.0.1:' + server.address().port + '/api/db/users',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: 'spex_session=' + signSession({ userId: 'T', role: 'teacher' }),
            },
            body: JSON.stringify({ user: { id: 'T', phone: 'http-failed-value' } }),
          }
        );
        const payload = (await response.json()) as any;
        assert.equal(response.status, 409);
        assert.equal(payload.code, 'TRANSACTION_CONFLICT');
        assert.equal(payload.retryable, true);
        assert.equal(forcedAttempts, 3);
        result.cases.httpExhaustion = {
          status: response.status,
          body: payload,
          attempts: forcedAttempts,
          errors: forcedErrors,
        };
        forcedAttempts = 0;
        forcedErrors = [];
        const adminResponse = await fetch(
          'http://127.0.0.1:' + server.address().port + '/api/admin/users/T/lifecycle',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: 'spex_session=' + signSession({ userId: 'A', role: 'admin' }),
            },
            body: JSON.stringify({ action: 'deactivate' }),
          }
        );
        const adminPayload = (await adminResponse.json()) as any;
        assert.equal(adminResponse.status, 409);
        assert.equal(adminPayload.code, 'TRANSACTION_CONFLICT');
        assert.equal(adminPayload.retryable, true);
        assert.equal(forcedAttempts, 3);
        assert.equal(
          (await observer.user.findUniqueOrThrow({ where: { id: 'T' } })).status,
          'active'
        );
        result.cases.adminHttpExhaustion = {
          status: adminResponse.status,
          body: adminPayload,
          attempts: forcedAttempts,
          errors: forcedErrors,
          statusWriteRolledBack: true,
        };
        (prisma as any).$transaction = original;
        forcedAttempts = 0;
        forcedErrors = [];
        force();
        const atomic = await service
          .assignmentTransaction(async (tx) => {
            await tx.user.findUniqueOrThrow({ where: { id: 'T' } });
            await tx.auditEvent.create({
              data: {
                eventType: 'ACCOUNT_STATUS_CHANGED',
                actorUserId: 'A',
                actorRole: 'admin',
                actorName: 'Synthetic',
                entityType: 'USER',
                entityId: 'T',
                deduplicationKey: 'failed-audit-' + forcedAttempts,
              },
            });
            await tx.user.update({ where: { id: 'T' }, data: { phone: 'atomic-failed' } });
          })
          .then(
            () => true,
            (e) => e.code
          );
        assert.equal(atomic, 'CONFLICT');
        assert.equal(await observer.auditEvent.count(), 0);
        result.cases.atomicRollback = {
          attempts: forcedAttempts,
          outcome: atomic,
          auditRows: 0,
          failedUserWriteAbsent:
            (await observer.user.findUniqueOrThrow({ where: { id: 'T' } })).phone === null,
        };
        (prisma as any).$transaction = original;
        const { changeAccountAccess } = await import('../src/server/accountLifecycle.ts');
        let lifeReads = 0,
          lifeConflicts = 0,
          lifeRelease: any;
        const lifeBarrier = new Promise<void>((r) => (lifeRelease = r));
        (prisma as any).$transaction = (work: any, options: any) =>
          original(async (tx: any) => {
            const read = tx.user.findUnique.bind(tx.user);
            tx.user.findUnique = async (args: any) => {
              const row = await read(args);
              if (args.where.id === 'T' && lifeReads < 2) {
                lifeReads++;
                if (lifeReads === 2) lifeRelease();
                await lifeBarrier;
              }
              return row;
            };
            return work(tx);
          }, options).catch((e: any) => {
            if (e.code === 'P2034') lifeConflicts++;
            throw e;
          });
        const changed = await Promise.allSettled([
          changeAccountAccess('A', 'T', 'deactivate'),
          changeAccountAccess('A', 'T', 'deactivate'),
        ]);
        assert.equal(changed.filter((r) => r.status === 'fulfilled').length, 2);
        assert.ok(lifeConflicts > 0);
        assert.equal(await observer.auditEvent.count(), 1);
        assert.equal(
          (await observer.user.findUniqueOrThrow({ where: { id: 'T' } })).status,
          'inactive'
        );
        result.cases.lifecycleAuditRace = { successes: 2, auditRows: 1, conflicts: lifeConflicts };
        (prisma as any).$transaction = original;
        const { lockVisitAssignmentHead } =
          await import('../src/server/pedagogicalVisitService.ts');
        await observer.inspectorAssignment.create({
          data: { id: 'head-T', teacherId: 'T', status: 'Pending' },
        });
        let rawRelease: any, rawReady: any;
        const rawBarrier = new Promise<void>((r) => (rawRelease = r)),
          ready = new Promise<void>((r) => (rawReady = r));
        const raw = original(
          async (tx) => {
            await tx.inspectorAssignment.findUnique({ where: { teacherId: 'T' } });
            rawReady();
            await rawBarrier;
            return lockVisitAssignmentHead(tx, 'T');
          },
          { isolationLevel: 'Serializable' }
        ).then(
          () => ({ success: true }),
          (e) => ({ code: e.code, message: e.message })
        );
        await ready;
        await observer.inspectorAssignment.update({
          where: { teacherId: 'T' },
          data: { status: 'Removed' },
        });
        rawRelease();
        const rawResult = await raw;
        assert.equal((rawResult as any).code, 'P2034');
        result.cases.rawLockNormalization = rawResult;
        console.log(JSON.stringify(result, null, 2));
      } finally {
        (prisma as any).$transaction = original;
        if (server) await new Promise<void>((r) => server.close(() => r()));
        await prisma.$disconnect();
        await observer.$disconnect();
      }
    }, 60000);
  }
);
