import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const mockPrisma = {
  inspectorAssignment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/server/prismaClient.js', () => ({ prisma: mockPrisma }));

const { ACCEPTED_ASSIGNMENT_STATUSES, acceptedTeacherIdsForInspector, canInspectorAccessTeacher } =
  await import('../src/server/assignmentService');
const { canReadTeacherOwnedDocument } = await import('../src/server/collectionAuth');

describe('P0-3 Inspector document access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authorizes only the canonical accepted assignment statuses', async () => {
    expect(ACCEPTED_ASSIGNMENT_STATUSES).toEqual(['Active', 'Changed']);

    for (const status of ACCEPTED_ASSIGNMENT_STATUSES) {
      mockPrisma.inspectorAssignment.findFirst.mockResolvedValueOnce({
        id: `assignment-${status}`,
      });
      await expect(canInspectorAccessTeacher('inspector-a', 'teacher-x')).resolves.toBe(true);
    }

    for (const status of ['Pending', 'Removed']) {
      mockPrisma.inspectorAssignment.findFirst.mockResolvedValueOnce(null);
      await expect(
        canInspectorAccessTeacher('inspector-a', 'teacher-x'),
        `${status} assignment must not authorize access`
      ).resolves.toBe(false);
    }

    expect(mockPrisma.inspectorAssignment.findFirst).toHaveBeenLastCalledWith({
      where: {
        inspectorId: 'inspector-a',
        teacherId: 'teacher-x',
        status: { in: ['Active', 'Changed'] },
      },
      select: { id: true },
    });
  });

  it('builds the current server-side teacher scope for an inspector', async () => {
    mockPrisma.inspectorAssignment.findMany.mockResolvedValue([
      { teacherId: 'teacher-x' },
      { teacherId: 'teacher-x' },
    ]);

    await expect(acceptedTeacherIdsForInspector('inspector-a')).resolves.toEqual(
      new Set(['teacher-x'])
    );
    expect(mockPrisma.inspectorAssignment.findMany).toHaveBeenCalledWith({
      where: { inspectorId: 'inspector-a', status: { in: ['Active', 'Changed'] } },
      select: { teacherId: true },
    });
  });

  it('keeps Teacher ownership, Inspector assignment scope, and Admin access separate', () => {
    const teacherXDocument = { id: 'doc-x', ownerId: 'teacher-x' };
    const teacherYDocument = { id: 'doc-y', ownerId: 'teacher-y' };

    expect(
      canReadTeacherOwnedDocument(teacherXDocument, { id: 'teacher-x', role: 'teacher' }, new Set())
    ).toBe(true);
    expect(
      canReadTeacherOwnedDocument(teacherYDocument, { id: 'teacher-x', role: 'teacher' }, new Set())
    ).toBe(false);
    expect(
      canReadTeacherOwnedDocument(
        teacherXDocument,
        { id: 'inspector-a', role: 'inspector' },
        new Set(['teacher-x'])
      )
    ).toBe(true);
    expect(
      canReadTeacherOwnedDocument(
        teacherYDocument,
        { id: 'inspector-a', role: 'inspector' },
        new Set(['teacher-x'])
      )
    ).toBe(false);
    expect(
      canReadTeacherOwnedDocument(
        teacherXDocument,
        { id: 'inspector-b', role: 'inspector' },
        new Set(['teacher-y'])
      )
    ).toBe(false);
    expect(
      canReadTeacherOwnedDocument(teacherXDocument, { id: 'admin', role: 'admin' }, new Set())
    ).toBe(true);
  });

  it('protects the generic collections and preserves P0-2 router gating', () => {
    const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');
    const authMiddleware = readFileSync('src/server/middleware/requireAuth.ts', 'utf8');

    expect(apiRouter).toContain('acceptedTeacherIdsForInspector');
    expect(apiRouter).toContain('buildCollectionReadQuery');
    expect(apiRouter).not.toContain('const isStaff');
    expect(apiRouter).toContain('canInspectorAccessTeacher');
    expect(apiRouter).toContain("apiRouter.get('/db/annual-plans'");
    expect(authMiddleware).toContain('requireOperationalAccount');
  });
});
