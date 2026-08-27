import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pathToTab, planningSectionForPath, ROLE_TABS, tabToPath } from '../src/lib/routes';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('unified Teacher planning workspace', () => {
  it('exposes one planning route and preserves legacy section deep links', () => {
    expect(tabToPath('planning')).toBe('/planning');
    expect(pathToTab('/planning')).toBe('planning');
    expect(pathToTab('/annual-plan')).toBe('planning');
    expect(planningSectionForPath('/weekly-schedule')).toBe('weekly');
    expect(ROLE_TABS.teacher).toContain('planning');
    expect(ROLE_TABS.teacher).not.toContain('annual_plan');
    expect(ROLE_TABS.teacher).not.toContain('annual_schedule');
  });

  it('uses the four internal sections and persisted class-scoped session API', () => {
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    expect(workspace).toContain('المخطط السنوي');
    expect(workspace).toContain('المقاطع التعليمية');
    expect(workspace).toContain('التوزيع السنوي');
    expect(workspace).toContain('التوزيع الأسبوعي');
    expect(workspace).toContain('fetchTeacherPlanningSessions');
    expect(workspace).toContain('initializeTeacherPlanningSessions');
    expect(workspace).toContain('updateTeacherPlanningSession');
    expect(workspace).not.toContain('spex_weekly_schedule');
    expect(workspace).toContain('لا توجد أقسام مسندة إليك بعد.');
    expect(workspace).toContain('academicYearOptions');
    expect(workspace).toContain('arenaspex:selectedAcademicYear');
    expect(workspace).not.toContain("const ACADEMIC_YEAR_ID = '2025-2026'");
    expect(read('src/server/apiRouter.ts')).toContain('isCanonicalAcademicYearId');
    expect(read('src/server/apiRouter.ts')).toContain('isPlanningStartDateConsistent');
    expect(workspace).toContain('requestedClassId');
    expect(workspace).toContain('requestedLevelId');
    expect(workspace).toContain('القسم المطلوب غير موجود ضمن أقسامك.');
    expect(read('src/server/apiRouter.ts')).toContain('resolvePlanningReferences');
    expect(read('src/server/apiRouter.ts')).toContain('اختر تاريخاً يقع في يوم دراسي');
  });

  it('keeps weekly distribution as an in-memory filter of annual sessions', () => {
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    expect(workspace).toContain("section !== 'weekly' || !week");
    expect(workspace).toContain('weekStart(localDate(session.plannedDate)) === week');
    expect(workspace).toContain('classPlannedSessionId=${session.id}');
  });
});
