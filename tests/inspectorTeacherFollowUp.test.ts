import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Inspector teacher follow-up workspace', () => {
  it('uses a server-authorized detail read model', () => {
    const source = read('src/server/assignmentRouter.ts');
    expect(source).toContain("assignmentRouter.get('/inspector/teachers/:teacherId/follow-up'");
    expect(source).toContain("assignment.inspectorId !== req.user!.id");
    expect(source).toContain("['Active', 'Changed'].includes(assignment.status)");
  });

  it('supports a dedicated teacher detail URL and read-only follow-up sections', () => {
    expect(read('src/lib/routes.ts')).toContain("/^\\/inspector\\/teachers\\/[^/]+$/");
    const page = read('src/components/dashboard/InspectorWorkspacePage.tsx');
    expect(page).toContain('fetchInspectorTeacherFollowUp');
    expect(page).toContain('الأقسام والتلاميذ');
    expect(page).toContain('الزيارات والتوجيهات');
    expect(page).toContain('إضافة زيارة');
    expect(page).toContain('مراسلة الأستاذ');
    expect(read('src/App.tsx')).toContain('onNavigateWithTeacher');
    expect(read('src/App.tsx')).toContain('?teacherId=');
    expect(read('src/components/dashboard/inspector/InspectorReportsView.tsx')).toContain('teacherId?: string');
  });

  it('uses InspectorNote for authorized teacher-specific guidance and preserves district mode', () => {
    const page = read('src/components/dashboard/inspector/InspectorBroadcastsView.tsx');
    expect(page).toContain('onAddNote');
    expect(page).toContain('teacherId: teacherContext.id');
    expect(page).toContain('سيُحفظ التوجيه كسجل InspectorNote');
    expect(read('src/components/dashboard/InspectorWorkspacePage.tsx')).toContain('تعذر فتح توجيه الأستاذ');
  });

  it('keeps roster actions on accepted teachers and avoids per-card fetches', () => {
    const page = read('src/components/dashboard/InspectorWorkspacePage.tsx');
    expect(page).toContain('onOpenTeacher');
    expect(read('src/components/dashboard/inspector/InspectorTeacherList.tsx')).toContain('فتح ملف المتابعة');
    expect(read('src/server/assignmentRouter.ts')).toContain('classCount');
    expect(read('src/server/assignmentRouter.ts')).toContain('studentCount');
  });
});
