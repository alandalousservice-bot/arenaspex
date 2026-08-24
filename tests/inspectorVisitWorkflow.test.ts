import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'src');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('inspector teacher visit workflow', () => {
  it('opens the teacher-specific visits route with User.id context', () => {
    const source = read('components/dashboard/InspectorWorkspacePage.tsx');
    expect(source).toContain("'inspector_visits', props.teacherId!");
    expect(source).toContain('teacherId={props.teacherId}');
  });

  it('uses accepted assignment scope for visit reads and writes', () => {
    const router = read('server/assignmentRouter.ts');
    const api = read('server/apiRouter.ts');
    expect(router).toContain("assignmentRouter.get('/inspector/visits'");
    expect(router).toContain("status: { in: ['Active', 'Changed'] }");
    expect(api).toContain("apiRouter.post('/inspection-visits', requireRole('inspector')");
    expect(api).toContain("assignment.inspectorId !== req.user!.id");
  });

  it('does not trust frontend inspector or institution identity', () => {
    const api = read('server/apiRouter.ts');
    expect(api).toContain('inspectorId: req.user!.id');
    expect(api).toContain('institutionId: teacher.institutionId');
    expect(api).toContain('const safeData = {');
    expect(api).not.toContain('data: { ...visit');
  });

  it('refreshes visits, teacher counts and follow-up detail after persistence', () => {
    const store = read('hooks/usePlatformStore.ts');
    const workspace = read('components/dashboard/InspectorWorkspacePage.tsx');
    expect(store).toContain('fetchInspectorVisits()');
    expect(store).toContain('prev.filter((item) => item.id !== visit.id)');
    expect(workspace).toContain("'inspector-visit-saved'");
    expect(workspace).toContain('await props.onRefreshTeachers()');
  });

  it('protects double submit and reports refresh failure separately', () => {
    const page = read('components/dashboard/inspector/InspectorReportsView.tsx');
    expect(page).toContain('disabled={isSaving}');
    expect(page).toContain('تم حفظ الزيارة، وتعذر تحديث العرض فوراً.');
    expect(page).toContain('لا توجد زيارات مسجلة لهذا الأستاذ.');
  });
});
