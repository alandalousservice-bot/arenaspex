import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LessonPlan } from '../src/types/spex';
import type { TeacherPlanningSession } from '../src/services/api';
import {
  buildLessonMemoPreview,
  calculateExecutionProgress,
  countSessionsByDate,
  getPairedSessionInfo,
  sortPlanningSessions,
} from '../src/services/dailyNotebook.service';
import { getLocalWeekDates, shiftLocalDate, startOfLocalWeek } from '../src/services/localDate';

const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');

function session(
  id: string,
  plannedDate: string,
  overrides: Partial<NonNullable<TeacherPlanningSession['reference']>> & {
    status?: TeacherPlanningSession['status'];
    startTime?: string | null;
  } = {}
): TeacherPlanningSession {
  const { status = 'مبرمجة', startTime = null, ...referenceOverrides } = overrides;
  return {
    id,
    teacherId: 'teacher-1',
    classId: 'class-a',
    academicYearId: '2026-2027',
    referenceSessionId: `reference-${id}`,
    plannedDate,
    durationMinutes: 60,
    status,
    startTime,
    venue: null,
    operationalNote: null,
    createdAt: '',
    updatedAt: '',
    reference: {
      referenceSessionId: `reference-${id}`,
      grade: 1,
      domainId: 'f_locomotion',
      fieldName: 'الوضعيات والتنقلات',
      finalCompetency: 'كفاءة',
      learningSectionId: 'lvl_p1:f_locomotion',
      objectiveId: null,
      objectiveGroupId: null,
      objective: 'هدف تعلمي',
      sessionType: 'تعلمية',
      sessionTypeLabel: 'تعلمية',
      sequenceIndex: 1,
      fieldSessionNumber: 1,
      ...referenceOverrides,
    },
  };
}

describe('Daily Notebook P2 weekly experience', () => {
  it('generates a local Sunday-to-Saturday week across month and year boundaries', () => {
    expect(startOfLocalWeek('2026-08-31')).toBe('2026-08-30');
    expect(getLocalWeekDates('2026-08-31')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ]);
    expect(getLocalWeekDates('2027-01-01')).toEqual([
      '2026-12-27',
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('moves exactly one week while preserving local calendar semantics', () => {
    expect(shiftLocalDate('2026-08-31', -7)).toBe('2026-08-24');
    expect(shiftLocalDate('2026-08-31', 7)).toBe('2026-09-07');
    expect(notebook).toContain('shiftWeek(-1)');
    expect(notebook).toContain('shiftWeek(1)');
    expect(notebook).toContain('getLocalWeekDates(selectedDate)');
  });

  it('counts only selected class/year sessions for week indicators', () => {
    const dates = getLocalWeekDates('2026-08-31');
    const selected = [
      session('a1', '2026-08-31'),
      session('a2', '2026-08-31'),
      session('a3', '2026-09-02'),
    ];
    const otherClass = { ...session('b1', '2026-08-31'), classId: 'class-b' };
    const otherYear = { ...session('c1', '2026-09-02'), academicYearId: '2025-2026' };
    expect([...countSessionsByDate(selected, dates).values()]).toEqual([0, 2, 0, 1, 0, 0, 0]);
    expect([...countSessionsByDate([...selected, otherClass, otherYear], dates).values()]).toEqual([
      0, 3, 0, 2, 0, 0, 0,
    ]);
    expect(notebook).toContain('filteredSessions, weekDates');
    expect(notebook).toContain('selectedClassId');
    expect(notebook).toContain('academicYearId');
  });

  it('detects only canonical G1–3 objective pairs and keeps status independent', () => {
    const first = session('pair-1', '2026-09-07', {
      objectiveGroupId: 'objective-group-1',
      sequenceIndex: 4,
      status: 'منجزة',
    });
    const second = session('pair-2', '2026-09-09', {
      objectiveGroupId: 'objective-group-1',
      sequenceIndex: 5,
    });
    expect(getPairedSessionInfo(first, [first, second], 1)).toEqual({ position: 1, total: 2 });
    expect(getPairedSessionInfo(second, [first, second], 1)).toEqual({ position: 2, total: 2 });
    expect(calculateExecutionProgress([first, second])).toMatchObject({ completed: 1, total: 2 });
    expect(notebook).toContain('الهدف المشترك');
  });

  it('does not falsely pair different groups or standard G4/G5 sessions', () => {
    const first = session('similar-1', '2026-09-07', {
      objectiveGroupId: 'objective-group-1',
      objective: 'هدف متشابه',
    });
    const second = session('similar-2', '2026-09-09', {
      objectiveGroupId: 'objective-group-2',
      objective: 'هدف متشابه',
    });
    expect(getPairedSessionInfo(first, [first, second], 1)).toBeNull();
    expect(getPairedSessionInfo(first, [first, second], 4)).toBeNull();
    expect(getPairedSessionInfo(first, [first, second], 5)).toBeNull();
  });

  it('sorts a day by start time, then canonical sequence, then stable id', () => {
    const late = session('late', '2026-09-07', { startTime: '10:00', sequenceIndex: 1 });
    const early = session('early', '2026-09-07', { startTime: '08:00', sequenceIndex: 2 });
    const noTime = session('no-time', '2026-09-07', { sequenceIndex: 0 });
    expect(sortPlanningSessions([late, noTime, early]).map((item) => item.id)).toEqual([
      'early',
      'late',
      'no-time',
    ]);
  });

  it('builds a compact read-only preview from saved lesson memo data', () => {
    const plan = {
      teacherId: 'teacher-1',
      classPlannedSessionId: 'pair-1',
      equipmentNeeded: ['كرات', 'كرات', 'أقماع'],
      lessonRows: [{ learningContent: 'الجري والقفز' }],
      mainPhase: {
        problemSituation: 'تنفيذ مسار حركي',
        learningSituation1: { title: 'الموقف الأول', description: 'وصف مختصر' },
        learningSituation2: { title: 'الموقف الثاني', description: '' },
      },
    } as unknown as LessonPlan;
    expect(buildLessonMemoPreview(plan)).toEqual({
      situations: [
        { title: 'الموقف الأول', summary: 'وصف مختصر' },
        { title: 'الموقف الثاني', summary: null },
      ],
      equipment: ['كرات', 'أقماع'],
      contentSummary: 'الجري والقفز',
    });
    expect(buildLessonMemoPreview(undefined)).toBeNull();
    expect(buildLessonMemoPreview({ lessonRows: [null] } as unknown as LessonPlan)).toEqual({
      situations: [],
      equipment: [],
      contentSummary: null,
    });
    expect(notebook).toContain('عرض محتوى المذكرة');
    expect(notebook).toContain('إخفاء محتوى المذكرة');
    expect(notebook).not.toContain('fetchLessonPlan');
  });

  it('keeps technical section and domain identifiers out of primary labels', () => {
    expect(notebook).not.toContain('|| reference.learningSectionId');
    expect(notebook).not.toContain('domain: field?.name || reference?.domainId');
    expect(notebook).toContain('الميدان غير محدد');
    expect(notebook).toContain('المقطع غير محدد');
    expect(notebook).toContain('المقطع:');
  });

  it('keeps memo absence and P0/P1 links safe without fake content or new daily requests', () => {
    expect(buildLessonMemoPreview(null)).toBeNull();
    expect(notebook).toContain('المذكرة:');
    expect(notebook).toContain("'غير منشأة'");
    expect(notebook).toContain("'/gradebook?classId='");
    expect(notebook).toContain("'/attendance?classId='");
    expect(notebook).toContain('statusRequestVersions');
    expect(notebook).not.toContain('for (const date of weekDates) fetch');
  });
});
