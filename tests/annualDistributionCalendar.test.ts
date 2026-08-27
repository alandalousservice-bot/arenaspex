import { describe, expect, it } from 'vitest';
import {
  ALGERIAN_SCHOOL_HOLIDAYS_2025_2026,
  generateAnnualTimeDistribution,
} from '../src/data/algerianCurriculum';
import { buildAnnualCalendarRows } from '../src/components/curriculum/AnnualDistributionCalendar';
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
});
