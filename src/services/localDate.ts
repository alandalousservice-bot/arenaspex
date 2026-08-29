export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function shiftLocalDate(value: string, days: number): string {
  const date = parseLocalDate(value);
  if (!date || !Number.isFinite(days)) return value;
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/** Returns the Sunday that starts the local calendar week containing `value`. */
export function startOfLocalWeek(value: string): string {
  const date = parseLocalDate(value);
  if (!date) return value;
  date.setDate(date.getDate() - date.getDay());
  return formatLocalDate(date);
}

/** Returns the seven local calendar dates from Sunday through Saturday. */
export function getLocalWeekDates(value: string): string[] {
  const start = startOfLocalWeek(value);
  if (!parseLocalDate(start)) return [];
  return Array.from({ length: 7 }, (_, index) => shiftLocalDate(start, index));
}
