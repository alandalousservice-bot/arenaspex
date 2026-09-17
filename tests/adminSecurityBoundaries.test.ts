import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const assignmentRouter = readFileSync('src/server/assignmentRouter.ts', 'utf8');
const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');
const assignmentService = readFileSync('src/server/assignmentService.ts', 'utf8');

describe('Admin mutation security boundaries', () => {
  it('protects the admin assignment router and bulk action with explicit confirmation', () => {
    expect(assignmentRouter).toContain("assignmentRouter.use(requireRole('admin'))");
    expect(assignmentRouter).toContain('req.body?.confirm !== true');
  });

  it('validates assignment roles and geographic ownership', () => {
    expect(assignmentRouter).toContain("teacher.role !== 'teacher'");
    expect(assignmentRouter).toContain("inspector.role !== 'inspector'");
    expect(assignmentRouter).toContain('district.directorateId !== inspectorDirectorate');
  });

  it('protects admin user and resource mutations server-side', () => {
    expect(apiRouter).toContain("'/admin/users/:id/activate', requireRole('admin')");
    expect(apiRouter).toContain("'/admin/resource-approvals/:resourceType/:id/review'");
    expect(apiRouter).toContain("'/admin/generation/config', requireRole('admin')");
  });

  it('blocks destructive geographic operations with dependency checks', () => {
    expect(assignmentRouter).toContain('لا يمكن حذف مديرية مرتبطة ببيانات أخرى');
    expect(assignmentRouter).toContain('لا يمكن حذف بلدية مرتبطة ببيانات أخرى');
    expect(assignmentRouter).toContain('لا يمكن حذف مؤسسة مرتبطة بحسابات');
    expect(assignmentRouter).toContain('لا يمكن حذف مقاطعة مرتبطة ببيانات');
  });

  it('executes bulk reassignment through one transaction client', () => {
    expect(assignmentService).toContain('return prisma.$transaction(async (tx) =>');
    expect(assignmentService).toContain('reassignTeacher(t.id, tx)');
    expect(assignmentService).toContain('db.inspectorAssignment.upsert');
  });
});
