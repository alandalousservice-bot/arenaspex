import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  earliestPlanningDate,
  filterPlanningSessions,
  resolveOperationalDate,
} from '../src/services/dailyNotebook.service';
import type { TeacherPlanningSession } from '../src/services/api';
import { getLocalWeekDates, shiftLocalDate } from '../src/services/localDate';

const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const service = readFileSync('src/services/dailyNotebook.service.ts', 'utf8');

function plannedSession(id: string, classId: string, plannedDate: string): TeacherPlanningSession {
  return {
    id,
    teacherId: 'teacher-1',
    classId,
    academicYearId: '2026-2027',
    referenceSessionId: `reference-${id}`,
    plannedDate,
    durationMinutes: 60,
    status: 'مبرمجة',
    startTime: null,
    venue: null,
    operationalNote: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('Daily Notebook operational start boundary', () => {
  it('reproduces the before-start ALL Today case', () => {
    expect(
      resolveOperationalDate({
        requestedDate: '2026-08-31',
        localToday: '2026-08-31',
        firstPlannedDate: '2026-09-21',
      })
    ).toBe('2026-09-21');
    expect(notebook).toContain('resolveOperationalDate');
  });

  it('uses the specific class boundary for Today', () => {
    expect(
      resolveOperationalDate({
        requestedDate: '2026-08-31',
        localToday: '2026-08-31',
        firstPlannedDate: '2026-09-23',
      })
    ).toBe('2026-09-23');
  });

  it('returns normal local today after the operational start', () => {
    expect(
      resolveOperationalDate({
        requestedDate: '2026-10-05',
        localToday: '2026-10-05',
        firstPlannedDate: '2026-09-21',
      })
    ).toBe('2026-10-05');
  });

  it('gives the date picker the applicable dynamic minimum', () => {
    expect(notebook).toContain('min={operationalMinimumDate || undefined}');
    expect(notebook).toContain('setSelectedDate(resolveDate(date))');
  });

  it('prevents Previous from crossing the operational minimum', () => {
    expect(notebook).toContain('setSelectedDate(resolveDate(shiftLocalDate(selectedDate, days)))');
    expect(notebook).toContain('firstPlannedDate: operationalMinimumDate');
  });

  it('computes ALL boundary from the earliest loaded teacher session', () => {
    const all = [
      plannedSession('a', 'class-a', '2026-09-21'),
      plannedSession('b', 'class-b', '2026-09-23'),
    ];
    expect(earliestPlanningDate(filterPlanningSessions(all, 'all'))).toBe('2026-09-21');
  });

  it('computes a class boundary from that class only', () => {
    const all = [
      plannedSession('a', 'class-a', '2026-09-21'),
      plannedSession('b', 'class-b', '2026-09-23'),
    ];
    expect(earliestPlanningDate(filterPlanningSessions(all, 'class-b'))).toBe('2026-09-23');
  });

  it('does not fabricate a boundary when planning is absent', () => {
    expect(earliestPlanningDate([])).toBeNull();
    expect(notebook).toContain('sessions.length === 0');
    expect(notebook).not.toContain('initializeTeacherPlanningSessions');
  });

  it('keeps ordinary class filter changes date-centered', () => {
    expect(notebook).toContain('setClassFilter(event.target.value)');
    expect(notebook).not.toContain('setClassFilter(event.target.value); setSelectedDate');
  });

  it('keeps next navigation unchanged and boundary-aware through the shared resolver', () => {
    expect(notebook).toContain('onClick={() => shiftDate(1)}');
    expect(notebook).toContain('onClick={() => shiftWeek(1)}');
    expect(notebook).toContain(
      'setSelectedDate(resolveDate(shiftLocalDate(selectedDate, weeks * 7)))'
    );
  });

  it('moves the week strip to the boundary week after Today', () => {
    expect(getLocalWeekDates('2026-09-21')).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
    ]);
    expect(notebook).toContain('getLocalWeekDates(selectedDate)');
  });

  it('preserves local-date arithmetic without UTC slicing', () => {
    expect(shiftLocalDate('2026-09-21', -1)).toBe('2026-09-20');
    expect(notebook).not.toContain('toISOString().slice(0, 10)');
  });

  it('does not hard-code the production boundary date', () => {
    expect(notebook).not.toContain('21/09/2026');
    expect(service).not.toContain('21/09/2026');
  });
});
