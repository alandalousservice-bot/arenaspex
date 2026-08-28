import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ALGERIAN_SCHOOL_HOLIDAYS_2025_2026,
  generateAnnualTimeDistribution,
  PRIMARY_GRADES_1_3,
} from '../src/data/algerianCurriculum';
import { calendarEventForDate } from '../src/data/academicCalendars';
import {
  buildAnnualCalendarRows,
  buildAnnualCompactRows,
} from '../src/components/curriculum/AnnualDistributionCalendar';
import type { TeacherPlanningSession } from '../src/services/api';

const persisted = (date: string, id: string): TeacherPlanningSession => ({
  id,
  teacherId: 'teacher-1',
  classId: 'class-1',
  academicYearId: '2025-2026',
  referenceSessionId: `ref-${id}`,
  plannedDate: date,
  durationMinutes: 60,
  status: 'مبرمجة',
  startTime: null,
  venue: null,
  operationalNote: null,
  createdAt: date,
  updatedAt: date,
  reference: null,
});

describe('classic annual distribution calendar', () => {
  it('contains the professional portrait print architecture without a second schedule source', () => {
    const source = readFileSync('src/components/curriculum/AnnualDistributionCalendar.tsx', 'utf8');
    expect(source).toContain('طباعة التوزيع السنوي');
    expect(readFileSync('src/index.css', 'utf8')).toContain('size: A4 portrait');
    expect(source).toContain('annual-distribution-document-header');
    expect(source).toContain('annual-distribution-document-footer');
    expect(source).toContain('annual-distribution-print-root');
    expect(source).toContain('buildAnnualCompactRows');
    expect(source).toContain('rowSpan={fieldSpan}');
    expect(source).toContain('print:table-header-group');
    expect(readFileSync('src/index.css', 'utf8')).toContain('page-break-inside: avoid');
    expect(readFileSync('src/index.css', 'utf8')).toContain('visibility: hidden !important');
    expect(readFileSync('src/index.css', 'utf8')).toContain('visibility: visible !important');
  });

  it('places configured holidays chronologically between persisted lessons', () => {
    const rows = buildAnnualCalendarRows([
      persisted('2025-11-30', 'before'),
      persisted('2026-01-11', 'after'),
    ]);
    const winterIndex = rows.findIndex(
      (row) => row.kind === 'holiday' && row.holiday.name === 'عطلة الشتاء'
    );
    expect(winterIndex).toBeGreaterThan(0);
    expect(rows[winterIndex - 1].kind).toBe('lesson');
    expect(rows[winterIndex + 1].kind).toBe('lesson');
    expect(ALGERIAN_SCHOOL_HOLIDAYS_2025_2026).toContainEqual({
      name: 'عطلة الشتاء',
      startDate: '2025-12-18',
      endDate: '2026-01-04',
    });
  });

  it('keeps canonical grade-specific distribution counts and avoids holiday dates', () => {
    expect(PRIMARY_GRADES_1_3).toMatchObject({ sessionsPerWeek: 2, durationMinutes: 60 });
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5']) {
      const sessions = generateAnnualTimeDistribution(levelId, '2025-09-22', 0, 'class-1');
      expect(sessions.length).toBe(['lvl_p1', 'lvl_p2', 'lvl_p3'].includes(levelId) ? 56 : 34);
      expect(
        sessions.every(
          (session) =>
            !ALGERIAN_SCHOOL_HOLIDAYS_2025_2026.some(
              (holiday) =>
                session.scheduledDate >= holiday.startDate &&
                session.scheduledDate <= holiday.endDate
            )
        )
      ).toBe(true);
    }
  });

  it('groups only same-objective Grade 1-3 weekly pairs without changing session identity', () => {
    const first = persisted('2025-10-05', 'pair-a');
    const second = persisted('2025-10-07', 'pair-b');
    const reference = (sequenceIndex: number) =>
      ({
        referenceSessionId: `ref-${sequenceIndex}`,
        grade: 1,
        domainId: 'f_locomotion',
        fieldName: 'الوضعيات والتنقلات',
        finalCompetency: 'كفاءة',
        learningSectionId: 'section-1',
        objectiveId: 'objective-1',
        objectiveGroupId: 'objective-group-1',
        objective: 'هدف',
        sessionType: 'تعلمية',
        sessionTypeLabel: 'تعلمية',
        sequenceIndex,
        fieldSessionNumber: sequenceIndex,
      }) as const;
    const rows = buildAnnualCompactRows(
      [
        { ...first, reference: reference(3) },
        { ...second, reference: reference(4) },
      ],
      'lvl_p1'
    );
    const lesson = rows.find((row) => row.kind === 'lesson');
    expect(lesson?.kind).toBe('lesson');
    expect(lesson?.kind === 'lesson' ? lesson.sessions.map((session) => session.id) : []).toEqual([
      'pair-a',
      'pair-b',
    ]);
  });

  it('starts representative 2026-2027 Grade 1 and Grade 4 schedules on or after student entry', () => {
    for (const levelId of ['lvl_p1', 'lvl_p4']) {
      const sessions = generateAnnualTimeDistribution(
        levelId,
        '2026-09-21',
        0,
        'class-1',
        '2026-2027'
      );
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.every((session) => session.scheduledDate >= '2026-09-21')).toBe(true);
    }
  });

  it('skips the configured 2026-2027 blocking periods without treating Ramadan as a closure', () => {
    for (const levelId of ['lvl_p1', 'lvl_p4']) {
      const sessions = generateAnnualTimeDistribution(
        levelId,
        '2026-09-21',
        0,
        'class-1',
        '2026-2027'
      );
      expect(
        sessions.every(
          (session) => calendarEventForDate(session.scheduledDate, '2026-2027') === null
        )
      ).toBe(true);
    }
    expect(calendarEventForDate('2027-02-08', '2026-2027')).toBeNull();
  });
});
