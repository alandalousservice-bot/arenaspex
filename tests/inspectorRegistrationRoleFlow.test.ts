import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultTabForRole, resolveTabForRole, tabToPath } from '../src/lib/routes';

// Every Prisma import is replaced before loading the real routers. No DB client
// is constructed, no .env is loaded, and unexpected model writes throw.
const memory = vi.hoisted(() => {
  type Row = Record<string, any>;
  const users = new Map<string, Row>();
  const auditEvents = new Map<string, Row>();
  const challenges = new Map<string, Row>();
  const emailCodes = new Map<string, string>();
  const directorates = [
    { id: 'dir-a', name: 'المديرية أ' },
    { id: 'dir-b', name: 'المديرية ب' },
  ];
  const districts = [
    { id: 'district-a', directorateId: 'dir-a', name: 'المقاطعة أ' },
    { id: 'district-b', directorateId: 'dir-b', name: 'المقاطعة ب' },
    { id: 'district-free', directorateId: 'dir-a', name: 'المقاطعة الحرة' },
  ];
  function matches(row: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR') return value.some((clause: Row) => matches(row, clause));
      if (value && typeof value === 'object') {
        if ('in' in value) return value.in.includes(row[key]);
        if ('notIn' in value) return !value.notIn.includes(row[key]);
        if ('not' in value) return row[key] !== value.not;
        if ('gt' in value && !(row[key] > value.gt)) return false;
        if ('gte' in value && !(row[key] >= value.gte)) return false;
        if ('lt' in value && !(row[key] < value.lt)) return false;
        if ('lte' in value && !(row[key] <= value.lte)) return false;
        if (['in', 'notIn', 'not', 'gt', 'gte', 'lt', 'lte'].some((operator) => operator in value))
          return true;
      }
      return row[key] === value;
    });
  }
  const user = {
    findUnique: vi.fn(async ({ where }: Row) =>
      structuredClone([...users.values()].find((u) => matches(u, where)) || null)
    ),
    findUniqueOrThrow: vi.fn(async ({ where }: Row) => {
      const row = [...users.values()].find((u) => matches(u, where));
      if (!row) throw new Error('Missing fixture');
      return structuredClone(row);
    }),
    findFirst: vi.fn(
      async ({ where }: Row) => [...users.values()].find((u) => matches(u, where)) || null
    ),
    findMany: vi.fn(async ({ where }: Row = {}) =>
      [...users.values()].filter((u) => matches(u, where))
    ),
    count: vi.fn(
      async ({ where }: Row) => [...users.values()].filter((u) => matches(u, where)).length
    ),
    create: vi.fn(async ({ data }: Row) => {
      if (
        [...users.values()].some(
          (existing) =>
            (Boolean(data.email) && existing.email === data.email) ||
            (Boolean(data.platformEmail) && existing.platformEmail === data.platformEmail) ||
            (Boolean(data.googleId) && existing.googleId === data.googleId)
        )
      ) {
        throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      }
      const row = {
        status: 'active',
        isApprovedByAdmin: true,
        isPlatformOwner: false,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        accessExpiresAt: new Date('2099-07-31'),
        ...data,
      };
      users.set(row.id, row);
      return { ...row };
    }),
    update: vi.fn(async ({ where, data }: Row) => {
      const row = users.get(where.id);
      if (!row) throw new Error('Missing fixture');
      for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = value;
      row.updatedAt = new Date();
      return { ...row };
    }),
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const row = [...users.values()].find((candidate) => matches(candidate, where));
      if (!row) return { count: 0 };
      Object.assign(row, data);
      row.updatedAt = new Date();
      return { count: 1 };
    }),
  };
  const emailVerificationChallenge = {
    findUnique: vi.fn(async ({ where }: Row) =>
      structuredClone(challenges.get(where.userId) || null)
    ),
    create: vi.fn(async ({ data }: Row) => {
      if (challenges.has(data.userId))
        throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      const row = { id: `challenge-${data.userId}`, ...data };
      challenges.set(data.userId, row);
      return structuredClone(row);
    }),
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const row = [...challenges.values()].find((candidate) => matches(candidate, where));
      if (!row) return { count: 0 };
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && 'increment' in value)
          row[key] += (value as Row).increment;
        else row[key] = value;
      }
      return { count: 1 };
    }),
  };
  const emptyModel = () => ({
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    count: vi.fn(async () => 0),
    create: () => {
      throw new Error('Unexpected test model write');
    },
    update: () => {
      throw new Error('Unexpected test model write');
    },
  });
  const models: Row = {
    user,
    emailVerificationChallenge,
    auditEvent: {
      create: vi.fn(async ({ data }: Row) => {
        const row = { id: `audit-${auditEvents.size}`, createdAt: new Date(), ...data };
        auditEvents.set(row.id, row);
        return row;
      }),
    },
    directorate: {
      findUnique: vi.fn(
        async ({ where }: Row) => directorates.find((d) => d.id === where.id) || null
      ),
      findMany: vi.fn(async () => directorates),
    },
    inspectionDistrict: {
      findUnique: vi.fn(async ({ where }: Row) => districts.find((d) => d.id === where.id) || null),
      findMany: vi.fn(async ({ where }: Row = {}) => districts.filter((d) => matches(d, where))),
    },
    inspectorAssignment: { ...emptyModel(), deleteMany: vi.fn(async () => ({ count: 0 })) },
  };
  const prisma = new Proxy(models, {
    get(target, key: string) {
      return (target[key] ||= emptyModel());
    },
  });
  models.$transaction = vi.fn(
    async (work: ((db: Row) => Promise<unknown>) | Promise<unknown>[]) => {
      if (Array.isArray(work)) return Promise.all(work);
      const userBackup = structuredClone(users);
      const auditBackup = structuredClone(auditEvents);
      try {
        return await work(prisma);
      } catch (error) {
        users.clear();
        auditEvents.clear();
        for (const [id, row] of userBackup) users.set(id, row);
        for (const [id, row] of auditBackup) auditEvents.set(id, row);
        throw error;
      }
    }
  );
  return {
    users,
    user,
    challenges,
    emailCodes,
    prisma,
    profile: {
      googleId: 'google-inspector',
      email: 'google-inspector@example.test',
      emailVerified: true,
      firstName: 'Google',
      lastName: 'Inspector',
    },
  };
});
vi.mock('../src/server/prismaClient.js', () => ({ prisma: memory.prisma }));
vi.mock('../src/server/googleAuth.js', () => ({
  isGoogleSignInConfigured: () => true,
  verifyGoogleIdToken: async () => memory.profile,
}));
vi.mock('../src/server/emailService.js', () => ({
  isEmailConfigured: () => true,
  sendPasswordResetEmail: async () => ({ sent: true }),
  sendEmailVerificationCode: async (email: string, _firstName: string, code: string) => {
    memory.emailCodes.set(email, code);
    return { sent: true };
  },
}));
vi.mock('../src/server/assignmentService.js', async () => ({
  ...(await vi.importActual('../src/server/assignmentService.js')),
  reassignTeacher: vi.fn(),
  reassignAllForInspector: vi.fn(),
}));
// This unrelated optional PDF runtime is absent in this workstation's node_modules.
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({
  parseStudentRosterPdf: () => {
    throw new Error('PDF ingestion is outside this auth test');
  },
  StudentRosterPdfImportError: class extends Error {},
}));

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-that-is-longer-than-32-characters';
process.env.EMAIL_VERIFICATION_SECRET = 'test-email-verification-secret-long-enough';
const { authRouter } = await import('../src/server/authRouter');
const { apiRouter } = await import('../src/server/apiRouter');
const { assignmentRouter } = await import('../src/server/assignmentRouter');
const { requireAuth, requireOperationalAccount } =
  await import('../src/server/middleware/requireAuth');
const { signSession, verifySession } = await import('../src/server/auth');
const { resetAuthRateLimitsForTests } = await import('../src/server/authRateLimit');

let server: Server;
let url: string;
const adminCookie = () => `spex_session=${signSession({ userId: 'admin', role: 'admin' })}`;
async function request(path: string, body?: unknown, cookie?: string, method?: string) {
  const response = await fetch(`${url}${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  const session = response.headers.get('set-cookie')?.split(';')[0];
  return { status: response.status, data, cookie: session };
}
async function signup(role: 'teacher' | 'inspector', district = '') {
  const email = `${role}@example.test`;
  const registered = await request('/api/auth/register', {
    firstName: 'Test',
    lastName: role,
    email: `${role}@example.test`,
    password: 'Local-test-pass1!',
    role,
    eduDirectorateId: 'dir-a',
    eduDistrictId: district || 'district-a',
  });
  expect(registered.status).toBe(202);
  expect(registered.cookie).toBeUndefined();
  const code = memory.emailCodes.get(email);
  expect(code).toMatch(/^\d{6}$/);
  return request('/api/auth/email-verification/verify', { email, code });
}
async function pendingRole(id: string) {
  const result = await request('/api/admin/users/pending', undefined, adminCookie());
  expect(result.status).toBe(200);
  return result.data.users.find((u: any) => u.id === id)?.role;
}
async function approveDistrict(id: string, districtId = 'district-a', directorateId = 'dir-a') {
  return request(
    '/api/db/users',
    { privilegedAccountMutation: true, user: { id, directorateId, districtId } },
    adminCookie()
  );
}
async function login(email: string) {
  return request('/api/auth/login', {
    email,
    password: 'Local-test-pass1!',
    portal: 'professional',
  });
}
function checkWorkspace(role: 'teacher' | 'inspector') {
  const home = defaultTabForRole(role);
  expect(tabToPath(home)).toBe(role === 'inspector' ? '/inspector' : '/dashboard');
  expect(resolveTabForRole(role === 'inspector' ? 'dashboard' : 'inspector_portal', role)).toBe(
    home
  );
}
async function checkAccess(cookie: string, role: 'teacher' | 'inspector') {
  const teacher = await request(
    '/api/teacher/weekly-timetable?academicYearId=2026-2027',
    undefined,
    cookie
  );
  const inspector = await request('/api/inspector/pending-assignments', undefined, cookie);
  expect(teacher.status).toBe(role === 'teacher' ? 200 : 403);
  expect(inspector.status).toBe(role === 'inspector' ? 200 : 403);
  const write = await request('/api/teacher/weekly-timetable', {}, cookie);
  expect(write.status).toBe(role === 'inspector' ? 403 : 400);
  const anotherUserWrite = await request(
    '/api/db/users',
    { user: { id: 'admin', firstName: 'Unauthorized' } },
    cookie
  );
  expect(anotherUserWrite.status).toBe(403);
}
beforeAll(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter);
  app.use('/api', requireAuth, requireOperationalAccount, assignmentRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unexpected loopback address');
  url = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  vi.clearAllMocks();
  resetAuthRateLimitsForTests();
  memory.users.clear();
  memory.challenges.clear();
  memory.emailCodes.clear();
  memory.users.set('admin', {
    id: 'admin',
    role: 'admin',
    status: 'active',
    isApprovedByAdmin: true,
    isPlatformOwner: false,
    emailVerifiedAt: new Date(),
    directorateId: '',
    districtId: '',
    accessExpiresAt: new Date('2099-07-31'),
  });
  memory.profile = {
    googleId: 'google-inspector',
    email: 'google-inspector@example.test',
    emailVerified: true,
    firstName: 'Google',
    lastName: 'Inspector',
  };
});

describe(
  'P0 persisted registration → Admin activation → session → protected workspace (mock DB)',
  { timeout: 15_000 },
  () => {
    it('does not issue a session or expose Inspector APIs before email verification', async () => {
      const email = 'unverified-inspector@example.test';
      const started = await request('/api/auth/register', {
        firstName: 'Test',
        lastName: 'Inspector',
        email,
        password: 'Local-test-pass1!',
        role: 'inspector',
        eduDirectorateId: 'dir-a',
        eduDistrictId: 'district-a',
      });
      expect(started.status).toBe(202);
      expect(started.cookie).toBeUndefined();
      const user = [...memory.users.values()].find((row) => row.email === email)!;
      expect(user.emailVerifiedAt).toBeNull();
      expect(await pendingRole(user.id)).toBeUndefined();
      expect(
        (await request('/api/inspector/pending-assignments', undefined, started.cookie)).status
      ).toBe(401);
      const wrong = await request('/api/auth/email-verification/verify', { email, code: '000000' });
      expect(wrong.status).toBe(400);
      const code = memory.emailCodes.get(email)!;
      const verified = await request('/api/auth/email-verification/verify', { email, code });
      expect(verified.status, JSON.stringify(verified.data)).toBe(200);
      expect(verified.data.user).toMatchObject({
        role: 'inspector',
        emailVerifiedAt: expect.any(String),
        status: 'pending_approval',
      });
      expect(verified.cookie).toBeDefined();
      expect(
        (await request('/api/inspector/pending-assignments', undefined, verified.cookie)).status
      ).toBe(403);
      expect((await request('/api/auth/email-verification/verify', { email, code })).status).toBe(
        400
      );
    });

    it('requires both professional geography fields and rejects mismatched directorate districts', async () => {
      const noDistrict = await request('/api/auth/register', {
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'missing-district@example.test',
        password: 'Local-test-pass1!',
        role: 'teacher',
        eduDirectorateId: 'dir-a',
      });
      expect(noDistrict.status).toBe(400);
      const mismatch = await request('/api/auth/register', {
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'wrong-district@example.test',
        password: 'Local-test-pass1!',
        role: 'teacher',
        eduDirectorateId: 'dir-a',
        eduDistrictId: 'district-b',
      });
      expect(mismatch.status).toBe(400);
      expect(memory.users.size).toBe(1);
    });

    it('uses a six-digit code, expires it after ten minutes, and limits incorrect attempts', async () => {
      const email = 'expiry@example.test';
      const registered = await request('/api/auth/register', {
        firstName: 'Test',
        lastName: 'Teacher',
        email,
        password: 'Local-test-pass1!',
        role: 'teacher',
        eduDirectorateId: 'dir-a',
        eduDistrictId: 'district-a',
      });
      expect(registered.status).toBe(202);
      const code = memory.emailCodes.get(email)!;
      expect(code).toMatch(/^\d{6}$/);
      const user = [...memory.users.values()].find((row) => row.email === email)!;
      const challenge = memory.challenges.get(user.id)!;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const wrongCode = code === '999999' ? '000000' : '999999';
        expect(
          (await request('/api/auth/email-verification/verify', { email, code: wrongCode })).status
        ).toBe(400);
      }
      expect((await request('/api/auth/email-verification/verify', { email, code })).status).toBe(
        400
      );
      expect(challenge.failedAttempts).toBe(5);

      const secondEmail = 'expired@example.test';
      await request('/api/auth/register', {
        firstName: 'Test',
        lastName: 'Teacher',
        email: secondEmail,
        password: 'Local-test-pass1!',
        role: 'teacher',
        eduDirectorateId: 'dir-a',
        eduDistrictId: 'district-a',
      });
      const secondUser = [...memory.users.values()].find((row) => row.email === secondEmail)!;
      memory.challenges.get(secondUser.id)!.expiresAt = new Date(Date.now() - 1);
      expect(
        (
          await request('/api/auth/email-verification/verify', {
            email: secondEmail,
            code: memory.emailCodes.get(secondEmail),
          })
        ).status
      ).toBe(400);
      expect(memory.users.get(secondUser.id)?.emailVerifiedAt).toBeNull();
    });

    it('enforces resend cooldown, replaces old codes, and rejects concurrent replay', async () => {
      const email = 'resend@example.test';
      await request('/api/auth/register', {
        firstName: 'Test',
        lastName: 'Teacher',
        email,
        password: 'Local-test-pass1!',
        role: 'teacher',
        eduDirectorateId: 'dir-a',
        eduDistrictId: 'district-a',
      });
      const user = [...memory.users.values()].find((row) => row.email === email)!;
      const oldCode = memory.emailCodes.get(email)!;
      expect((await request('/api/auth/email-verification/request', { email })).status).toBe(202);
      expect(memory.emailCodes.get(email)).toBe(oldCode);
      memory.challenges.get(user.id)!.lastSentAt = new Date(Date.now() - 61_000);
      expect((await request('/api/auth/email-verification/request', { email })).status).toBe(202);
      const newCode = memory.emailCodes.get(email)!;
      expect(newCode).not.toBe(oldCode);
      for (let resend = 0; resend < 3; resend += 1) {
        memory.challenges.get(user.id)!.lastSentAt = new Date(Date.now() - 61_000);
        expect((await request('/api/auth/email-verification/request', { email })).status).toBe(202);
      }
      const cappedCode = memory.emailCodes.get(email);
      memory.challenges.get(user.id)!.lastSentAt = new Date(Date.now() - 61_000);
      expect((await request('/api/auth/email-verification/request', { email })).status).toBe(202);
      expect(memory.emailCodes.get(email)).toBe(cappedCode);
      expect(
        (await request('/api/auth/email-verification/verify', { email, code: oldCode })).status
      ).toBe(400);
      const latestCode = memory.emailCodes.get(email)!;
      const results = await Promise.all([
        request('/api/auth/email-verification/verify', { email, code: latestCode }),
        request('/api/auth/email-verification/verify', { email, code: latestCode }),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
      expect(memory.users.get(user.id)?.emailVerifiedAt).toBeInstanceOf(Date);
      expect(memory.challenges.get(user.id)?.consumedAt).toBeInstanceOf(Date);
    });

    it('returns the same registration result for an existing email and blocks automatic Google linking', async () => {
      const email = 'existing@example.test';
      const first = await request('/api/auth/register', {
        firstName: 'Test',
        lastName: 'Teacher',
        email,
        password: 'Local-test-pass1!',
        role: 'teacher',
        eduDirectorateId: 'dir-a',
        eduDistrictId: 'district-a',
      });
      const duplicate = await request('/api/auth/register', {
        firstName: 'Other',
        lastName: 'Person',
        email,
        password: 'Local-test-pass1!',
        role: 'teacher',
        eduDirectorateId: 'dir-a',
        eduDistrictId: 'district-a',
      });
      expect(first.status).toBe(202);
      expect(duplicate.status).toBe(202);
      expect(duplicate.data).toEqual(first.data);
      const user = [...memory.users.values()].find((row) => row.email === email)!;
      memory.profile.email = email;
      memory.profile.googleId = 'google-for-existing-account';
      const google = await request('/api/auth/google', {
        credential: 'mocked-verified-google-token',
      });
      expect(google.status).toBe(409);
      expect(google.data.code).toBe('GOOGLE_LINK_REQUIRED');
      expect(google.cookie).toBeUndefined();
      expect(memory.users.get(user.id)?.googleId).toBeFalsy();
    });

    it('does not create duplicates when a verified Google identity collides with an existing linked email', async () => {
      const email = 'google-collision@example.test';
      memory.profile.email = email;
      memory.profile.googleId = 'first-google-id';
      const first = await request('/api/auth/google', {
        credential: 'mocked-verified-google-token',
        registration: { role: 'teacher', eduDirectorateId: 'dir-a', eduDistrictId: 'district-a' },
      });
      expect(first.status).toBe(200);
      memory.profile.googleId = 'second-google-id';
      const collision = await request('/api/auth/google', {
        credential: 'mocked-verified-google-token',
      });
      expect(collision.status).toBe(409);
      expect(collision.cookie).toBeUndefined();
      expect([...memory.users.values()].filter((row) => row.email === email)).toHaveLength(1);
    });

    it('preserves Teacher registration, pending review, activation and Teacher-only access', async () => {
      const created = await signup('teacher');
      expect(created.status, JSON.stringify(created.data)).toBe(200);
      const id = created.data.user.id;
      expect(created.data.user).toMatchObject({
        role: 'teacher',
        status: 'pending_approval',
        isApprovedByAdmin: false,
      });
      expect(await pendingRole(id)).toBe('teacher');
      expect((await login('teacher@example.test')).status).toBe(403);
      const activated = await request(
        `/api/admin/users/${id}/lifecycle`,
        { action: 'activate', role: 'inspector' },
        adminCookie()
      );
      expect(activated.data.user.role).toBe('teacher');
      const loggedIn = await login('teacher@example.test');
      expect(loggedIn.status).toBe(200);
      expect(verifySession(loggedIn.cookie!.split('=')[1])?.role).toBe('teacher');
      await checkAccess(loggedIn.cookie!, 'teacher');
      checkWorkspace('teacher');
    });

    it('keeps Inspector pending until Admin approval, then authorizes Inspector only', async () => {
      const created = await signup('inspector');
      expect(created.status).toBe(200);
      const id = created.data.user.id;
      expect(await pendingRole(id)).toBe('inspector');
      expect(verifySession(created.cookie!.split('=')[1])?.role).toBe('inspector');
      expect(
        (await request('/api/inspector/pending-assignments', undefined, created.cookie)).data.code
      ).toBe('ACCOUNT_PENDING_APPROVAL');
      expect(
        (
          await request(
            '/api/locations/districts',
            { directorateId: 'dir-a', name: 'Self assigned' },
            created.cookie
          )
        ).status
      ).toBe(403);
      expect((await login('inspector@example.test')).status).toBe(403);
      const activate = () =>
        request(
          `/api/admin/users/${id}/lifecycle`,
          { action: 'activate', role: 'teacher' },
          adminCookie()
        );
      expect((await activate()).status).toBe(200);
      expect(memory.users.get(id)).toMatchObject({
        role: 'inspector',
        status: 'active',
        districtId: 'district-a',
        eduDistrictId: 'district-a',
        isApprovedByAdmin: true,
      });
      expect((await activate()).data.user.role).toBe('inspector');
      expect(memory.users.get(id)?.role).toBe('inspector');
      await checkAccess(created.cookie!, 'inspector');
      const loggedIn = await login('inspector@example.test');
      expect(loggedIn.status).toBe(200);
      expect(verifySession(loggedIn.cookie!.split('=')[1])?.role).toBe('inspector');
      await checkAccess(loggedIn.cookie!, 'inspector');
      checkWorkspace('inspector');
      expect((await approveDistrict(id, 'district-b', 'dir-b')).status).toBe(200);
      expect(memory.users.get(id)).toMatchObject({
        directorateId: 'dir-b',
        districtId: 'district-b',
        eduDirectorateId: 'dir-b',
        eduDistrictId: 'district-b',
      });
    });

    it.each(['activate', 'reactivate', 'legacy'] as const)(
      'blocks %s with absent, mismatched or occupied district',
      async (action) => {
        const { data } = await signup('inspector');
        const id = data.user.id;
        const activate = () =>
          request(
            `/api/admin/users/${id}/${action === 'legacy' ? 'activate' : 'lifecycle'}`,
            action === 'legacy' ? {} : { action },
            adminCookie()
          );
        const row = memory.users.get(id)!;
        row.districtId = '';
        row.eduDistrictId = null;
        expect((await activate()).status).toBe(400);
        row.directorateId = 'dir-a';
        row.districtId = 'district-b';
        row.eduDirectorateId = 'dir-a';
        row.eduDistrictId = 'district-b';
        expect((await activate()).status).toBe(400);
        row.directorateId = 'dir-a';
        row.districtId = 'district-a';
        row.eduDirectorateId = 'dir-a';
        row.eduDistrictId = 'district-a';
        memory.users.set('occupied', {
          id: 'occupied',
          role: 'inspector',
          status: 'active',
          districtId: 'district-a',
        });
        expect((await activate()).status).toBe(400);
        memory.users.delete('occupied');
        expect((await activate()).status).toBe(200);
        expect(row.role).toBe('inspector');
      }
    );

    it('preserves Admin-created Inspector using the existing user/assignment path', async () => {
      const created = await request(
        '/api/db/users',
        {
          privilegedAccountMutation: true,
          user: {
            id: 'admin-created-inspector',
            username: 'created',
            spexId: 'SPX-CREATED',
            firstName: 'Admin',
            lastName: 'Created',
            email: 'created@example.test',
            password: 'Local-test-pass1!',
            role: 'inspector',
            status: 'active',
            isApprovedByAdmin: true,
            directorateId: 'dir-a',
            districtId: 'district-free',
          },
        },
        adminCookie()
      );
      expect(created.status, JSON.stringify(created.data)).toBe(200);
      expect(created.data.user).toMatchObject({
        role: 'inspector',
        status: 'active',
        districtId: 'district-free',
        eduDistrictId: 'district-free',
      });
      const workspace = await request('/api/admin/inspectors/workspace', undefined, adminCookie());
      expect(workspace.status).toBe(200);
      expect(workspace.data.inspectors.some((i: any) => i.id === 'admin-created-inspector')).toBe(
        true
      );
      const loggedIn = await login('created@example.test');
      expect(loggedIn.status).toBe(200);
      expect(verifySession(loggedIn.cookie!.split('=')[1])?.role).toBe('inspector');
      await checkAccess(loggedIn.cookie!, 'inspector');
      checkWorkspace('inspector');
    });

    it.each(['teacher', 'inspector'] as const)(
      'preserves Google %s creation, pending review, activation and linking',
      async (role) => {
        memory.profile.email = `${role}@example.test`;
        const created = await request('/api/auth/google', {
          credential: 'mocked-verified-google-token',
          registration: { role, eduDirectorateId: 'dir-a', eduDistrictId: 'district-a' },
        });
        expect(created.status).toBe(200);
        const id = created.data.user.id;
        expect(created.data.user).toMatchObject({
          role,
          status: 'pending_approval',
          isApprovedByAdmin: false,
        });
        expect(await pendingRole(id)).toBe(role);
        expect(
          (await request('/api/inspector/pending-assignments', undefined, created.cookie)).status
        ).toBe(403);
        if (role === 'inspector') {
          expect((await request(`/api/admin/users/${id}/activate`, {}, adminCookie())).status).toBe(
            200
          );
        }
        expect((await request(`/api/admin/users/${id}/activate`, {}, adminCookie())).status).toBe(
          200
        );
        const loggedIn = await request('/api/auth/google', {
          credential: 'mocked-verified-google-token',
        });
        expect(loggedIn.data.user.role).toBe(role);
        expect(verifySession(loggedIn.cookie!.split('=')[1])?.role).toBe(role);
        await checkAccess(loggedIn.cookie!, role);
        checkWorkspace(role);
        memory.users.get(id)!.googleId = null;
        const linked = await request(
          '/api/auth/google/link',
          { credential: 'mocked-verified-google-token' },
          loggedIn.cookie
        );
        expect(linked.status, JSON.stringify(linked.data)).toBe(200);
        expect(linked.data.user.role).toBe(role);
        expect(memory.users.get(id)?.googleId).toBe(memory.profile.googleId);
      }
    );

    it('uses persisted role over stale JWT and rejects attempts to change approval/district as Inspector', async () => {
      const created = await signup('inspector', 'district-a');
      const id = created.data.user.id;
      await request(`/api/admin/users/${id}/activate`, {}, adminCookie());
      const staleRoleCookie = `spex_session=${signSession({ userId: id, role: 'teacher' })}`;
      await checkAccess(staleRoleCookie, 'inspector');
      const selfEdit = await request(
        '/api/db/users',
        {
          privilegedAccountMutation: true,
          user: {
            id,
            role: 'teacher',
            status: 'inactive',
            isApprovedByAdmin: false,
            districtId: 'district-b',
            directorateId: 'dir-b',
          },
        },
        staleRoleCookie
      );
      expect(selfEdit.status).toBe(200);
      expect(memory.users.get(id)).toMatchObject({
        role: 'inspector',
        status: 'active',
        isApprovedByAdmin: true,
        districtId: 'district-a',
      });
    });

    it('validates Admin profile review and synchronizes both district representations without activating', async () => {
      const created = await signup('inspector', 'district-a');
      const id = created.data.user.id;
      const review = () =>
        request(
          `/api/admin/users/${id}/profile`,
          {
            firstName: 'Reviewed',
            lastName: 'Inspector',
            email: 'inspector@example.test',
            username: 'reviewed',
            spexId: 'SPX-REVIEWED',
            directorateId: 'dir-b',
            districtId: 'district-b',
            role: 'teacher',
            status: 'active',
            isApprovedByAdmin: true,
          },
          adminCookie(),
          'PUT'
        );
      memory.users.set('occupied', {
        id: 'occupied',
        role: 'inspector',
        status: 'active',
        districtId: 'district-b',
      });
      expect((await review()).status).toBe(400);
      expect(memory.users.get(id)?.districtId).toBe('district-a');
      memory.users.delete('occupied');
      expect((await review()).status).toBe(200);
      expect(memory.users.get(id)).toMatchObject({
        role: 'inspector',
        status: 'pending_approval',
        isApprovedByAdmin: false,
        directorateId: 'dir-b',
        districtId: 'district-b',
        eduDirectorateId: 'dir-b',
        eduDistrictId: 'district-b',
      });
    });

    it('rejects new Google registration without role context instead of guessing Teacher', async () => {
      const result = await request('/api/auth/google', {
        credential: 'mocked-verified-google-token',
      });
      expect(result.status).toBe(400);
      expect(memory.users.size).toBe(1);
    });

    it('preserves Inspector intent and destination in the legacy GIS callback', async () => {
      const created = await request('/api/auth/google', {
        credential: 'mocked-verified-google-token',
        registration: { role: 'inspector', eduDirectorateId: 'dir-a', eduDistrictId: 'district-a' },
      });
      expect(created.status).toBe(200);
      const response = await fetch(`${url}/api/auth/google/gsi-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ credential: 'mocked-verified-google-token' }),
      });
      expect(await response.text()).toContain('url=/inspector');
      expect(
        [...memory.users.values()].find((u) => u.googleId === memory.profile.googleId)?.role
      ).toBe('inspector');
      expect(
        verifySession(response.headers.get('set-cookie')!.split(';')[0].split('=')[1])?.role
      ).toBe('inspector');
      memory.users.clear();
      const noContext = await fetch(`${url}/api/auth/google/gsi-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ credential: 'mocked-verified-google-token' }),
      });
      expect(await noContext.text()).toContain('google_error=');
      expect(memory.users.size).toBe(0);
    });
  }
);
