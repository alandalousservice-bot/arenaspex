import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Request, Response } from 'express';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('../src/server/prismaClient.js', () => ({ prisma: mockPrisma }));
vi.mock('../src/server/auth.js', async () => {
  const actual = await vi.importActual('../src/server/auth.js');
  return {
    ...actual,
    getSessionTokenFromRequest: vi.fn((req: { cookies?: Record<string, string> }) =>
      req.cookies?.spex_session ? 'fake-token' : undefined
    ),
    verifySession: vi.fn(() => ({ userId: 'teacher-1', role: 'teacher' })),
  };
});

const { requireAuth, requireOperationalAccount } =
  await import('../src/server/middleware/requireAuth');

type MockResponse = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function mockRes(): MockResponse {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(): Request {
  return { cookies: { spex_session: 'fake-token' } } as unknown as Request;
}

const activeTeacher = {
  id: 'teacher-1',
  role: 'teacher',
  districtId: 'district-1',
  institutionId: 'school-1',
  isPlatformOwner: false,
  status: 'active',
  isApprovedByAdmin: true,
};

describe('P0-2 account approval enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps current session available while denying a pending account operational access', async () => {
    const pending = {
      ...activeTeacher,
      status: 'pending_approval',
      isApprovedByAdmin: false,
    };
    mockPrisma.user.findUnique.mockResolvedValue(pending);
    const req = mockReq();
    const authRes = mockRes();
    const authNext = vi.fn();

    await requireAuth(req, authRes as unknown as Response, authNext);
    expect(authNext).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ status: 'pending_approval', isApprovedByAdmin: false });

    const operationalRes = mockRes();
    const operationalNext = vi.fn();
    requireOperationalAccount(req, operationalRes as unknown as Response, operationalNext);

    expect(operationalRes.status).toHaveBeenCalledWith(403);
    expect(operationalRes.json.mock.calls[0][0]).toMatchObject({
      code: 'ACCOUNT_PENDING_APPROVAL',
      pending: true,
    });
    expect(operationalNext).not.toHaveBeenCalled();
  });

  it('reflects approval from the current database row without changing the session cookie', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...activeTeacher,
      status: 'pending_approval',
      isApprovedByAdmin: false,
    });
    await requireAuth(req, res as unknown as Response, next);
    expect(req.user).toMatchObject({ isApprovedByAdmin: false });

    mockPrisma.user.findUnique.mockResolvedValueOnce(activeTeacher);
    const approvedReq = mockReq();
    await requireAuth(approvedReq, res as unknown as Response, next);
    const approvedNext = vi.fn();
    requireOperationalAccount(approvedReq, mockRes() as unknown as Response, approvedNext);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
    expect(approvedNext).toHaveBeenCalledTimes(1);
  });

  it('allows approved operational roles and preserves unauthenticated behavior', () => {
    for (const role of ['teacher', 'inspector', 'director', 'admin']) {
      const next = vi.fn();
      requireOperationalAccount(
        {
          user: { ...activeTeacher, role },
        } as unknown as Request,
        mockRes() as unknown as Response,
        next
      );
      expect(next).toHaveBeenCalledTimes(1);
    }

    const res = mockRes();
    requireOperationalAccount(
      { user: undefined } as unknown as Request,
      res as unknown as Response,
      vi.fn()
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].code).toBe('ACCOUNT_GONE');
  });

  it('covers every mounted operational router tree with the centralized guard', () => {
    const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');
    const apiAssembly = readFileSync('src/server/apiAssembly.ts', 'utf8');
    const attendanceRouter = readFileSync('src/server/attendanceRouter.ts', 'utf8');
    const server = readFileSync('server.ts', 'utf8');
    const authRouter = readFileSync('src/server/authRouter.ts', 'utf8');

    expect(apiRouter).toContain('apiRouter.use(requireAuth);');
    expect(apiRouter).toContain('apiRouter.use(requireOperationalAccount);');
    expect(apiAssembly).toContain(
      'app.use(API_PREFIX, requireAuth, requireOperationalAccount, assignmentRouter);'
    );
    expect(server).toContain('mountApiRoutes({');
    expect(authRouter).toContain("authRouter.get('/me'");
    expect(authRouter).toContain("authRouter.post('/logout'");

    for (const path of [
      "'/teacher/planning/annual-distribution'",
      "'/students/roster'",
      "'/teacher/learning-plan'",
      "'/teacher/assessment-sessions'",
      '`/db/${path}`',
    ]) {
      expect(apiRouter).toContain(path);
    }
    expect(attendanceRouter).toContain("'/teacher/attendance'");
  });
});
