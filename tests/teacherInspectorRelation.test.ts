import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('teacher inspector relationship', () => {
  it('resolves the teacher feed from the active persisted assignment', () => {
    const source = read('src/server/assignmentRouter.ts');
    expect(source).toContain("assignmentRouter.get('/teacher/inspection-feed'");
    expect(source).toContain("['Active', 'Changed'].includes(assignment.status)");
    expect(source).toContain("role: 'inspector', status: 'active'");
  });

  it('does not retain the former static inspector fallback', () => {
    expect(read('src/components/dashboard/teacher/InspectorFeedPanel.tsx')).not.toContain('CURRENT_INSPECTOR_NAME');
    expect(read('src/constants/teacherDashboard.constants.ts')).not.toContain('مصطفى رواق');
  });

  it('keeps visits server-persisted and scoped to the current assignment', () => {
    const source = read('src/server/apiRouter.ts');
    expect(source).toContain("apiRouter.post('/inspection-visits'");
    expect(source).toContain('assignment.inspectorId !== req.user!.id');
    expect(read('prisma/schema.prisma')).toContain('model InspectionVisitRecord');
  });

  it('uses assigned teachers for the inspector portal', () => {
    expect(read('src/App.tsx')).toContain("currentUser.role === 'inspector' ? assignedTeachers : []");
    expect(read('src/hooks/usePlatformStore.ts')).toContain('fetchMyAssignedTeachers');
  });
});
