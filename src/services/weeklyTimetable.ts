import type { WeeklyScheduleSlot } from '../types/spex';

export const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const;
export type WeeklyDay = (typeof WEEKDAYS)[number];

export interface WeeklyTimetableSlot extends WeeklyScheduleSlot {
  academicYearId: string;
  startTime: string;
  endTime: string;
}

export interface WeeklyTimetableSummary {
  slots: WeeklyTimetableSlot[];
  totalMinutes: number;
  totalSessions: number;
  uniqueClasses: number;
  workingDays: number;
  dailyTotals: Record<WeeklyDay, number>;
  classTotals: Record<string, { className: string; sessions: number; minutes: number }>;
}

const TIME_RE = /^(\d{2}):(\d{2})$/;

export function minutesFromTime(value: string): number | null {
  const match = TIME_RE.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function parseSlotTimes(
  slot: Pick<WeeklyScheduleSlot, 'timeSlot' | 'startTime' | 'endTime'>
) {
  const [legacyStart, legacyEnd] = slot.timeSlot.split(/\s*(?:-|–|→)\s*/);
  return {
    startTime: slot.startTime || legacyStart || '',
    endTime: slot.endTime || legacyEnd || '',
  };
}

export function validateWeeklyTime(startTime: string, endTime: string): string | null {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  if (start === null || end === null || start < 8 * 60 || end > 17 * 60 || end <= start) {
    return 'يجب أن يكون توقيت الحصة بين 08:00 و17:00.';
  }
  return null;
}

export function durationMinutes(
  slot: Pick<WeeklyScheduleSlot, 'timeSlot' | 'startTime' | 'endTime'>
): number {
  const { startTime, endTime } = parseSlotTimes(slot);
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  return start !== null && end !== null && end > start ? end - start : 0;
}

export function formatWeeklyMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} دقيقة`;
  if (!minutes) return `${hours} س`;
  return `${hours} س ${minutes} د`;
}

export function buildWeeklyTimetableSummary(input: WeeklyScheduleSlot[]): WeeklyTimetableSummary {
  const slots = input.map((slot) => {
    const times = parseSlotTimes(slot);
    return { ...slot, ...times, academicYearId: slot.academicYearId || '2025-2026' };
  });
  const dailyTotals = Object.fromEntries(WEEKDAYS.map((day) => [day, 0])) as Record<
    WeeklyDay,
    number
  >;
  const classTotals: WeeklyTimetableSummary['classTotals'] = {};
  for (const slot of slots) {
    const minutes = durationMinutes(slot);
    dailyTotals[slot.day] += minutes;
    const current = classTotals[slot.classId] || {
      className: slot.className,
      sessions: 0,
      minutes: 0,
    };
    classTotals[slot.classId] = {
      className: current.className,
      sessions: current.sessions + 1,
      minutes: current.minutes + minutes,
    };
  }
  return {
    slots,
    totalMinutes: slots.reduce((total, slot) => total + durationMinutes(slot), 0),
    totalSessions: slots.length,
    uniqueClasses: Object.keys(classTotals).length,
    workingDays: WEEKDAYS.filter((day) => dailyTotals[day] > 0).length,
    dailyTotals,
    classTotals,
  };
}

export function hasWeeklyOverlap(
  input: WeeklyScheduleSlot[],
  candidate: WeeklyScheduleSlot,
  ignoreId?: string
): boolean {
  const candidateTimes = parseSlotTimes(candidate);
  const candidateStart = minutesFromTime(candidateTimes.startTime);
  const candidateEnd = minutesFromTime(candidateTimes.endTime);
  if (candidateStart === null || candidateEnd === null) return false;
  return input.some((slot) => {
    if (slot.id === ignoreId || slot.day !== candidate.day) return false;
    const times = parseSlotTimes(slot);
    const start = minutesFromTime(times.startTime);
    const end = minutesFromTime(times.endTime);
    return start !== null && end !== null && candidateStart < end && candidateEnd > start;
  });
}
