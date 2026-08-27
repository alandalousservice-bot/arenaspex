export const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;

function yearParts(academicYearId: string): [number, number] | null {
  if (!ACADEMIC_YEAR_PATTERN.test(academicYearId)) return null;
  const [start, end] = academicYearId.split('-').map(Number);
  return Number.isInteger(start) && end === start + 1 ? [start, end] : null;
}

export function isCanonicalAcademicYearId(value: string): boolean {
  return yearParts(value) !== null;
}

export function getAcademicYearForDate(date: Date): string {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function getCurrentAcademicYear(): string {
  return getAcademicYearForDate(new Date());
}

export function formatAcademicYearLabel(academicYearId: string): string {
  return isCanonicalAcademicYearId(academicYearId)
    ? academicYearId.replace('-', ' / ')
    : academicYearId;
}

export function getAcademicYearOptions(referenceDate = new Date()): string[] {
  const current = Number(getAcademicYearForDate(referenceDate).slice(0, 4));
  return [-1, 0, 1].map((offset) => `${current + offset}-${current + offset + 1}`);
}

/** Planning dates belong to the selected school-year window, Aug 1 through Aug 31 of its end year. */
export function isPlanningStartDateConsistent(academicYearId: string, dateValue: string): boolean {
  const parts = yearParts(academicYearId);
  if (!parts || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;
  const [startYear, endYear] = parts;
  const calendar = getAcademicCalendar(academicYearId);
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue) return false;
  const start = new Date(`${calendar.schoolStart}T00:00:00.000Z`);
  const end = new Date(`${calendar.schoolEnd || `${endYear}-08-31`}T00:00:00.000Z`);
  return date >= start && date <= end;
}
import { getAcademicCalendar } from '../data/academicCalendars';
