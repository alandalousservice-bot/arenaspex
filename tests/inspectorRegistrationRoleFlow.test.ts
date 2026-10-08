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
      }
      return row[key] === value;
    });
  }
  const user = {
    findUnique: vi.fn(
      async ({ where }: Row) => structuredClone([...users.values()].find((u) => matches(u, where)) || null)
    ),
    findUniqueOrThrow: vi.fn(async ({where}: Row) => { const row = [...users.values()].find((u) => matches(u, where)); if(!row)throw new Error('Missing fixture');return structuredClone(row); }),
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
      const row = {
        status: 'active',
        isApprovedByAdmin: true,
        isPlatformOwner: false,
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
    auditEvent: { create: vi.fn(async ({data}: Row) => { const row = {id: `audit-${auditEvents.size}`, createdAt:new Date(),...data};auditEvents.set(row.id,row);return row; }) },
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
  const prisma = new Proxy(models, { get(target,key:string){return (target[key] ||= emptyModel());} });
  models.$transaction = vi.fn(async (work: ((db:Row)=>Promise<unknown>) | Promise<unknown>[]) => {
    if(Array.isArray(work))return Promise.all(work);
    const userBackup = structuredClone(users); const auditBackup = structuredClone(auditEvents);
    try { return await work(prisma); } catch(error) { users.clear();auditEvents.clear();for(const [id,row] of userBackup)users.set(id,row);for(const [id,row] of auditBackup)auditEvents.set(id,row);throw error; }
  });
  return {
    users,
    user,
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

const { authRouter } = await import('../src/server/authRouter');
const { apiRouter } = await import('../src/server/apiRouter');
const { assignmentRouter } = await import('../src/server/assignmentRouter');
const { requireAuth, requireOperationalAccount } =
  await import('../src/server/middleware/requireAuth');
const { signSession, verifySession } = await import('../src/server/auth');

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
  return request('/api/auth/register', {
    firstName: 'Test',
    lastName: role,
    email: `${role}@example.test`,
    password: 'Local-test-pass1!',
    role,
    eduDirectorateId: 'dir-a',
    ...(district ? { eduDistrictId: district } : {}),
  });
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
  memory.users.clear();
  memory.users.set('admin', {
    id: 'admin',
    role: 'admin',
    status: 'active',
    isApprovedByAdmin: true,
    isPlatformOwner: false,
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
    it('preserves Teacher registration, pending review, activation and Teacher-only access', async () => {
      const created = await signup('teacher');
      expect(created.status).toBe(200);
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

    it('keeps Inspector pending, requires Admin district approval, then authorizes Inspector only', async () => {
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
      expect((await activate()).status).toBe(400);
      expect(memory.users.get(id)?.status).toBe('pending_approval');
      expect((await approveDistrict(id)).status).toBe(200);
      expect(memory.users.get(id)).toMatchObject({
        role: 'inspector',
        status: 'pending_approval',
        districtId: 'district-a',
        eduDistrictId: 'district-a',
        isApprovedByAdmin: false,
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
        expect((await activate()).status).toBe(400);
        const row = memory.users.get(id)!;
        row.districtId = 'district-b';
        expect((await activate()).status).toBe(400);
        row.districtId = 'district-a';
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
      expect(created.status).toBe(200);
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
        const created = await request('/api/auth/google', {
          credential: 'mocked-verified-google-token',
          role,
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
            400
          );
          expect((await approveDistrict(id)).status).toBe(200);
        }
        expect((await request(`/api/admin/users/${id}/activate`, {}, adminCookie())).status).toBe(
          200
        );
        const loggedIn = await request('/api/auth/google', {
          credential: 'mocked-verified-google-token',
          role: role === 'teacher' ? 'inspector' : 'teacher',
        });
        expect(loggedIn.data.user.role).toBe(role);
        expect(verifySession(loggedIn.cookie!.split('=')[1])?.role).toBe(role);
        await checkAccess(loggedIn.cookie!, role);
        checkWorkspace(role);
        memory.users.get(id)!.googleId = null;
        const linked = await request('/api/auth/google', {
          credential: 'mocked-verified-google-token',
          role: 'teacher',
        });
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
      const response = await fetch(`${url}/api/auth/google/gsi-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          credential: 'mocked-verified-google-token',
          role: 'inspector',
        }),
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
