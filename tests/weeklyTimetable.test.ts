import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildWeeklyTimetableSummary,
  formatWeeklyMinutes,
  hasWeeklyOverlap,
  validateWeeklyTime,
} from '../src/services/weeklyTimetable';
import type { WeeklyScheduleSlot } from '../src/types/spex';

const slot = (
  id: string,
  day: WeeklyScheduleSlot['day'],
  startTime: string,
  endTime: string,
  classId = 'class-a'
): WeeklyScheduleSlot => ({
  id,
  teacherId: 'teacher-1',
  academicYearId: '2026-2027',
  day,
  startTime,
  endTime,
  timeSlot: `${startTime} - ${endTime}`,
  classId,
  className: classId === 'class-a' ? 'السنة الأولى أ' : 'السنة الرابعة أ',
  fieldId: 'field',
  fieldName: 'ميدان',
});

describe('weekly timetable read model', () => {
  it('enforces the 08:00–17:00 time window', () => {
    expect(validateWeeklyTime('08:00', '09:00')).toBeNull();
    expect(validateWeeklyTime('16:00', '17:00')).toBeNull();
    expect(validateWeeklyTime('07:59', '09:00')).toBeTruthy();
    expect(validateWeeklyTime('16:30', '17:01')).toBeTruthy();
    expect(validateWeeklyTime('17:00', '17:30')).toBeTruthy();
  });

  it('rejects overlaps but allows adjacent meetings', () => {
    const existing = [slot('one', 'الأحد', '08:00', '09:00')];
    expect(hasWeeklyOverlap(existing, slot('two', 'الأحد', '08:30', '09:30'))).toBe(true);
    expect(hasWeeklyOverlap(existing, slot('two', 'الأحد', '09:00', '10:00'))).toBe(false);
  });

  it('calculates weekly, daily, class, and working-day totals from slots', () => {
    const summary = buildWeeklyTimetableSummary([
      slot('one', 'الأحد', '08:00', '09:00'),
      slot('two', 'الأحد', '10:00', '11:30'),
      slot('three', 'الثلاثاء', '13:00', '14:00'),
      slot('four', 'الخميس', '08:00', '09:00'),
    ]);
    expect(summary.totalMinutes).toBe(270);
    expect(summary.totalSessions).toBe(4);
    expect(summary.uniqueClasses).toBe(1);
    expect(summary.workingDays).toBe(3);
    expect(summary.dailyTotals['الأحد']).toBe(150);
    expect(summary.classTotals['class-a']).toMatchObject({ sessions: 4, minutes: 270 });
    expect(formatWeeklyMinutes(210)).toBe('3 س 30 د');
    expect(formatWeeklyMinutes(60)).toBe('1 س');
    expect(formatWeeklyMinutes(90)).toBe('1 س 30 د');
  });

  it('keeps academic years isolated through the explicit slot year', () => {
    const summary = buildWeeklyTimetableSummary([
      slot('current', 'الأحد', '08:00', '09:00'),
      { ...slot('legacy', 'الإثنين', '08:00', '09:00'), academicYearId: '2027-2028' },
    ]);
    expect(summary.slots.map((item) => item.academicYearId)).toEqual(['2026-2027', '2027-2028']);
  });

  it('exposes authorized server persistence and read-only Inspector routes', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const router = readFileSync('src/server/apiRouter.ts', 'utf8').replace(/\s+/g, ' ');
    const view = readFileSync('src/components/schedule/WeeklyTimetableView.tsx', 'utf8');
    expect(schema).toContain('model TeacherWeeklySlot');
    expect(router).toContain("apiRouter.get( '/inspector/teachers/:teacherId/weekly-timetable'");
    expect(router).toContain("requireRole('inspector')");
    expect(router).toContain('assignment.inspectorId !== req.user!.id');
    expect(view).toContain('readOnly');
    expect(view).toContain('onDeleteSlot');
  });

  it('uses the fillable five-day sports board without changing slot integrations', () => {
    const view = readFileSync('src/components/schedule/WeeklyTimetableView.tsx', 'utf8');
    const css = readFileSync('src/index.css', 'utf8');
    const screenCss = css.slice(css.indexOf('@media screen'), css.indexOf('@media print'));

    expect(view).toContain('weekly-timetable-hero');
    expect(view).toContain('weekly-timetable-board');
    expect(view).toContain('weekly-day-column');
    expect(view).toContain('openForm(undefined, weekday)');
    expect(view).toContain('[45, 60, 90]');
    expect(view).toContain('onAddSlot?.(candidate)');
    expect(view).toContain('onUpdateSlot?.(candidate)');
    expect(view).toContain('onDeleteSlot?.(slot.id)');
    expect(view).toContain('readOnly');

    expect(screenCss).toContain('.weekly-timetable-hero');
    expect(screenCss).toContain('.weekly-day-heading');
    expect(screenCss).toContain('--weekly-cyan: #09b8df');
  });
});
