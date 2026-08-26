import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync('src/components/dashboard/InspectorDashboard.tsx', 'utf8');
const teacherHook = readFileSync('src/hooks/useTeacher.ts', 'utf8');
const teacherList = readFileSync(
  'src/components/dashboard/inspector/InspectorTeacherList.tsx',
  'utf8'
);

describe('Inspector dashboard null safety', () => {
  it('normalizes missing teachers and renders an empty state', () => {
    expect(dashboard).toContain('const safeTeachers');
    expect(dashboard).toContain('لا يوجد أساتذة مرتبطون بهذه المقاطعة حالياً');
    expect(dashboard).toContain('selectedTeacher && <InspectorPedagogicalProfile');
  });

  it('allows the selected teacher relation to be absent', () => {
    expect(teacherHook).toContain('selectedTeacher?: User');
    expect(teacherList).toContain('selectedTeacher?: User');
    expect(teacherList).toContain('selectedTeacher?.id');
  });

  it('keeps a controlled message for a missing inspector profile', () => {
    expect(dashboard).toContain('بيانات حساب المفتش غير مكتملة');
  });

  it('does not dereference a missing inspector in the effect dependency or body', () => {
    expect(dashboard).toContain('if (!inspectorId) return;');
    expect(dashboard).toContain('const inspectorId = inspector?.id;');
    expect(dashboard).toContain('}, [inspectorId]);');
    expect(dashboard).not.toContain('}, [inspector.id]);');
  });
});
