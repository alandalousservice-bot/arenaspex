import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  normalizeDailyNotebookEntries,
  normalizePlanningSessions,
} from '../src/services/dailyNotebook.service';
import { formatLocalDate, parseLocalDate, shiftLocalDate } from '../src/services/localDate';

const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');
const routes = readFileSync('src/server/apiRouter.ts', 'utf8');

const validSession = {
  id: 'planned-1',
  teacherId: 'teacher-1',
  classId: 'class-a',
  academicYearId: '2026-2027',
  referenceSessionId: 'reference-1',
  plannedDate: '2026-08-29',
  durationMinutes: 60,
  status: 'مبرمجة',
};

const validEntry = {
  id: 'entry-1',
  teacherId: 'teacher-1',
  classPlannedSessionId: 'planned-1',
  academicYearId: '2026-2027',
  classId: 'class-a',
  className: 'القسم أ',
  executionDate: '2026-08-29',
  timeSlot: '08:00 - 09:00',
  status: 'منجزة',
  note: 'تم التنفيذ',
};

describe('Daily Notebook P0 persistence contracts', () => {
  it('hydrates notes from the server on refresh and accepts an empty server result', () => {
    expect(api).toContain("fetch('/api/db/notebook')");
    expect(store).toContain('fetchDailyNotebookFromDB');
    expect(store).toContain('normalizeDailyNotebookEntries(dbNotebook, currentUser.id)');
    expect(store).toContain('setDailyNotebook(hydratedNotebook)');
    expect(normalizeDailyNotebookEntries([validEntry], 'teacher-1')[0]?.note).toBe('تم التنفيذ');
    expect(normalizeDailyNotebookEntries([], 'teacher-1')).toEqual([]);
  });

  it('keeps notebook entries isolated by teacher, class, academic year, and session', () => {
    const entries = normalizeDailyNotebookEntries(
      [
        validEntry,
        { ...validEntry, id: 'other-teacher', teacherId: 'teacher-2' },
        { ...validEntry, id: 'other-year', academicYearId: '2025-2026' },
        { ...validEntry, id: 'other-class', classId: 'class-b' },
      ],
      'teacher-1'
    );
    expect(entries).toHaveLength(3);
    expect(notebook).toContain("(classFilter === 'all' || entry.classId === classFilter)");
    expect(notebook).toContain('entry.academicYearId === academicYearId');
  });

  it('gives canonical ClassPlannedSession status precedence over NotebookEntry status', () => {
    expect(notebook).toContain('const status = session.status');
    expect(notebook).not.toContain('entry?.status || session.status');
    expect(normalizePlanningSessions([{ ...validSession, status: 'منجزة' }])[0]?.status).toBe(
      'منجزة'
    );
  });

  it('normalizes malformed session, date, and notebook API payloads safely', () => {
    expect(normalizePlanningSessions(null)).toEqual([]);
    expect(normalizePlanningSessions({ sessions: [validSession] })).toEqual([]);
    expect(
      normalizePlanningSessions([validSession, { ...validSession, plannedDate: 'invalid' }])
    ).toHaveLength(1);
    expect(
      normalizeDailyNotebookEntries([null, {}, { ...validEntry, status: 'unknown' }], 'teacher-1')
    ).toEqual([]);
  });

  it('uses local calendar arithmetic for today, previous, and next actions', () => {
    expect(formatLocalDate(new Date(2026, 7, 29, 23, 30))).toBe('2026-08-29');
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(shiftLocalDate('2026-08-29', -1)).toBe('2026-08-28');
    expect(shiftLocalDate('2026-08-29', 1)).toBe('2026-08-30');
    expect(shiftLocalDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftLocalDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(notebook).not.toContain('toISOString().slice(0, 10)');
  });

  it('awaits direct Daily Notebook saves and rolls back on persistence failure', () => {
    expect(notebook).toContain('await onPersistNotebookEntry');
    expect(store).toContain('const previous = dailyNotebookRef.current');
    expect(store).toContain('if (!result.success)');
    expect(store).toContain('setDailyNotebook(previous)');
    expect(api).toContain("return offlinePost('/api/db/notebook', { entry }, 'POST')");
  });

  it('preserves class, planned-session, and academic-year context for both memo actions', () => {
    expect(notebook).toContain('classPlannedSessionId=${encodeURIComponent(session.id)}');
    expect(notebook).toContain('academicYearId=${encodeURIComponent(session.academicYearId)}');
    expect(app).toContain('classPlannedSessionId: sessionRef.id');
    expect(app).toContain('academicYearId: sessionRef.academicYearId');
    expect(app).toContain('window.location.assign(`/lesson-plans?${params.toString()}`)');
    expect(notebook).not.toContain('onOpenLessonPlan');
  });

  it('keeps server ownership and the existing notebook route contract', () => {
    expect(routes).toContain("path: 'notebook'");
    expect(routes).toContain('row.ownerId === user.id');
    expect(routes).toContain('teacherId: user.id');
    expect(store).not.toContain('syncNotebookBatchToDB(dailyNotebook)');
  });
});
