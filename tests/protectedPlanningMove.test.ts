import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  generateAllPrimaryLevelDistributions,
  materializeClassPlannedSessionSeedsFromTimetable,
} from '../src/services/teacherPlanning.service';

const read = (file: string) => fs.readFileSync(file, 'utf8');

describe('protected planning session move contract', () => {
  it('keeps protected-session canonical identity separate from operational introduction', () => {
    const distribution = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21'
    ).levels.find((level) => level.levelId === 'lvl_p1');
    expect(distribution?.status).toBe('generated');

    const materialized = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-1',
      '2026-2027',
      distribution?.sessions || [],
      [
        { weekday: 0, startTime: '08:00', endTime: '09:00' },
        { weekday: 2, startTime: '10:00', endTime: '11:00' },
      ]
    );
    const first = materialized.seeds.find((seed) => seed.referenceSessionId.endsWith('sequence:1'));
    const second = materialized.seeds.find((seed) =>
      seed.referenceSessionId.endsWith('sequence:2')
    );

    expect(materialized.error).toBeUndefined();
    expect(first?.plannedDate.toISOString().slice(0, 10)).toBe('2026-09-27');
    expect(first?.startTime).toBe('08:00');
    expect(second?.plannedDate.toISOString().slice(0, 10)).toBe('2026-09-29');
    expect(second?.startTime).toBe('10:00');
    expect(materialized.seeds.some((seed) => seed.referenceSessionId.includes(':intro:'))).toBe(
      true
    );
  });

  it('keeps the move server-authoritative and preserves the protected-session boundary', () => {
    const router = read('src/server/apiRouter.ts');
    const start = router.indexOf("'/teacher/planning/sessions/:sessionId/move-to-canonical-slot'");
    const end = router.indexOf("apiRouter.get('/teacher/planning/sessions'", start);
    const moveRoute = router.slice(start, end);
    const api = read('src/services/api.ts');
    const calendar = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');

    expect(start).toBeGreaterThan(-1);
    expect(moveRoute).toContain('isPreLaunchAcademicYear');
    expect(moveRoute).toContain('materializeClassPlannedSessionSeedsFromTimetable');
    expect(moveRoute).toContain('referenceSessionId === existing.referenceSessionId');
    expect(moveRoute).toContain('executionDependencyIds');
    expect(moveRoute).toContain("'attendance-dependency'");
    expect(moveRoute).toContain("'assessment-dependency'");
    expect(moveRoute).toContain("'destination-occupied'");
    expect(moveRoute).toContain('prisma.$transaction');
    expect(moveRoute).toContain('tx.classPlannedSession.update');
    expect(moveRoute).toContain('tx.lessonPlan.update');
    expect(moveRoute).not.toContain('classPlannedSession.create');
    expect(api).toContain('body: JSON.stringify({ academicYearId })');
    expect(api).not.toContain('body: JSON.stringify({ academicYearId, targetDate');
    expect(calendar).toContain('onMoveProtectedSession');
    expect(calendar).toContain('نقل الحصة إلى الموعد الجديد');
    expect(calendar).toContain('تأكيد النقل');
    expect(calendar).toContain('الاحتفاظ بالموعد الحالي');
    expect(calendar).toContain('إلغاء');
    expect(workspace).toContain('moveTeacherPlanningSessionToCanonicalSlot');
    expect(workspace).toContain('fetchTeacherPlanningSessions');
  });

  it('does not add an audit schema model or migration for the move', () => {
    expect(read('prisma/schema.prisma')).not.toContain('ProtectedPlanningMove');
    expect(
      fs.readdirSync('prisma/migrations').some((name) => name.includes('protected_planning'))
    ).toBe(false);
  });
});
