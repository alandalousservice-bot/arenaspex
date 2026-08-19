import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma for requireAuth
const mockPrisma = {
  user: {
    findUnique: vi.fn()
  }
};

vi.mock('../src/server/prismaClient.js', () => ({ prisma: mockPrisma }));

const { requireAuth, requireRole } = await import('../src/server/middleware/requireAuth');

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(tokenPayload?: any, userId?: string) {
  return {
    cookies: tokenPayload ? { spex_session: 'fake-token' } : {},
    user: undefined
  } as any;
}

// Mock auth helpers
vi.mock('../src/server/auth.js', async () => {
  const actual = await vi.importActual('../src/server/auth.js') as any;
  return {
    ...actual,
    getSessionTokenFromRequest: vi.fn((req: any) => {
      if (req.cookies?.spex_session) return 'fake-token';
      return undefined;
    }),
    verifySession: vi.fn((token: string) => {
      // tokenPayload is injected via global
      const globalAny = global as any;
      return globalAny.__testSessionPayload || null;
    })
  };
});

describe('authSessionFlags - ACCOUNT_DISABLED / ACCOUNT_GONE / normal (PART C/D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).__testSessionPayload = { userId: 'u1', role: 'teacher' };
  });

  it('يرفض 401 مع ACCOUNT_GONE عند غياب التوكن', async () => {
    (global as any).__testSessionPayload = null;
    const req = { cookies: {} } as any;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.json.mock.calls[0][0];
    expect(body.code).toBe('ACCOUNT_GONE');
    expect(next).not.toHaveBeenCalled();
  });

  it('يرفض 401 مع ACCOUNT_GONE عند عدم وجود المستخدم في DB', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const req = mockReq(true);
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].code).toBe('ACCOUNT_GONE');
  });

  it('يرفض 401 مع ACCOUNT_DISABLED عند حساب inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'teacher',
      districtId: 'd1',
      status: 'inactive'
    });
    const req = mockReq(true);
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.json.mock.calls[0][0];
    expect(body.code).toBe('ACCOUNT_DISABLED');
    expect(body.disabled).toBe(true);
  });

  it('يمرّر الطلب عند حساب نشط (normal)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'teacher',
      districtId: 'd1',
      status: 'active'
    });
    const req = mockReq(true);
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 'u1', role: 'teacher' });
  });

  it('requireRole يرفض 401 مع ACCOUNT_GONE عند غياب المستخدم في الطلب', () => {
    const req = { user: undefined } as any;
    const res = mockRes();
    const next = vi.fn();

    const middleware = requireRole('teacher');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].code).toBe('ACCOUNT_GONE');
  });

  it('requireRole يرفض 403 عند دور غير مصرح', () => {
    const req = { user: { id: 'u1', role: 'teacher', districtId: 'd1' } } as any;
    const res = mockRes();
    const next = vi.fn();

    const middleware = requireRole('admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
