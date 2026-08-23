import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('accepted inspector teacher roster', () => {
  it('uses accepted server assignments and session inspector scope', () => {
    const source = read('src/server/assignmentRouter.ts');
    expect(source).toContain("assignmentRouter.get('/inspector/teachers'");
    expect(source).toContain("where: { inspectorId: req.user!.id, status: { in: ['Active', 'Changed'] } }");
    expect(source).toContain("assignmentStatus: 'ACCEPTED'");
  });

  it('aggregates real follow-up fields without frontend user-list reconstruction', () => {
    const source = read('src/server/assignmentRouter.ts');
    expect(source).toContain('classCount');
    expect(source).toContain('visitCount');
    expect(source).toContain('noteCount');
    expect(source).toContain('lastVisitAt');
    expect(source).toContain('followUpStatus');
    expect(read('src/App.tsx')).toContain('assignedTeachers');
  });

  it('refreshes accepted roster after Inspector acceptance and keeps empty states explicit', () => {
    expect(read('src/components/dashboard/inspector/InspectorPendingAssignments.tsx')).toContain('onAccepted?.()');
    expect(read('src/components/dashboard/InspectorDashboard.tsx')).toContain('لا يوجد أساتذة مسندون إليك حالياً.');
    expect(read('src/components/dashboard/inspector/InspectorPendingAssignments.tsx')).toContain('لا توجد إسنادات بانتظار القبول.');
  });

  it('does not permit inspector notes or visits for unrelated teachers', () => {
    const source = read('src/server/apiRouter.ts');
    expect(source).toContain("path === 'inspector-notes' && req.user!.role === 'inspector'");
    expect(source).toContain("assignment.inspectorId !== req.user!.id");
    expect(source).toContain("apiRouter.post('/inspection-visits'");
  });
});
