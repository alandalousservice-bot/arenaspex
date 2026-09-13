import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  generateLessonMemoDraft,
  saveLessonMemo,
} from '../src/services/lessonMemoGeneration.service';
import {
  annualDistributionLessonMemoIdFor,
  scheduledLessonMemoIdFor,
} from '../src/services/lessonMemoIdentity.service';
import type { User } from '../src/types/spex';

const teacher = {
  id: 'teacher-daily-flow-p1b',
  username: 'teacher-daily-flow-p1b',
  spexId: 'SPX-DAILY-FLOW-P1B',
  firstName: 'اختبار',
  lastName: 'المذكرة السنوية',
  email: 'daily-flow-p1b@example.test',
  role: 'teacher',
  directorateId: '',
  districtId: '',
  status: 'active',
} as User;

const source = {
  referenceSessionId: 'lvl_p5:f_locomotion:sequence:4',
  fieldId: 'f_locomotion',
  fieldName: 'الميدان البدني',
  finalCompetency: 'ينجز وضعيات حركية منظمة.',
  segmentGoal: 'تنمية التحكم الحركي.',
  sessionNumber: 2,
  globalNumber: 4,
  weekNumber: 2,
  type: 'تعلمية' as const,
  typeLabel: 'حصة تعلمية 2',
  objective: 'ينسق حركاته في وضعية منظمة.',
  tools: ['أقماع'],
};

describe('DAILY-FLOW-P1B class-free annual reference contract', () => {
  it('generates a pedagogical annual memo without class or operational identity', () => {
    const plan = generateLessonMemoDraft({
      teacher,
      levelName: 'السنة الخامسة ابتدائي',
      academicYearId: '2026-2027',
      plannedDate: '2026-10-04',
      durationMinutes: 60,
      source,
    });

    expect(plan.classId).toBeUndefined();
    expect(plan.classPlannedSessionId).toBeUndefined();
    expect(plan.academicYearId).toBe('2026-2027');
    expect(plan.lessonRows?.length).toBeGreaterThan(0);
  });

  it('uses deterministic annual-reference identity without arbitrary class lookup', () => {
    const first = annualDistributionLessonMemoIdFor({
      teacherId: teacher.id,
      academicYearId: '2026-2027',
      referenceSessionId: source.referenceSessionId,
    });
    const second = annualDistributionLessonMemoIdFor({
      teacherId: teacher.id,
      academicYearId: '2026-2027',
      referenceSessionId: source.referenceSessionId,
    });

    expect(first).toBe(second);
    expect(first).toContain('lp_annual_');
    expect(first).not.toBe(scheduledLessonMemoIdFor(source.referenceSessionId));
  });

  it('preserves manual edits at the class-free save boundary', () => {
    const plan = generateLessonMemoDraft({
      teacher,
      levelName: 'السنة الخامسة ابتدائي',
      academicYearId: '2026-2027',
      plannedDate: '2026-10-04',
      durationMinutes: 60,
      source,
    });
    const saved = saveLessonMemo(
      { ...plan, memoSource: 'annual-distribution', teacherNotes: 'ملاحظة اختبارية' },
      undefined
    );

    expect(saved.classId).toBeUndefined();
    expect(saved.classPlannedSessionId).toBeUndefined();
    expect(saved.teacherNotes).toBe('ملاحظة اختبارية');
  });

  it('keeps the annual API and persistence validation class-free while scheduled remains bound', () => {
    const view = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
    const api = readFileSync('src/services/api.ts', 'utf8');
    const router = readFileSync('src/server/apiRouter.ts', 'utf8');

    expect(view).toContain('value={annualLevelId}');
    expect(view).toContain("className: ''");
    expect(view).not.toContain('اختر حصة من التوزيع السنوي وقسماً صالحاً أولاً.');
    expect(api).toContain('new URLSearchParams({ levelId, academicYearId })');
    expect(router).toContain('const requestedLevelId = normalizePrimaryLevelId');
    expect(router).toContain('(!classId && !requestedLevelId)');
    expect(router).toContain("typeof item.levelId === 'string'");
    expect(router).toContain('item.classPlannedSessionId');
  });
});
