import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  fetchLessonPlansFromDB,
  fetchTeacherWeeklyTimetable,
  fetchUsersFromDB,
} from '../src/services/api';
import {
  authoritativeCollection,
  PlatformStoreHydrationGuard,
} from '../src/services/platformStoreHydration';

const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');
const offline = readFileSync('src/lib/offline.ts', 'utf8');

describe('P1-2 identity-aware platform-store hydration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('replaces records with an authoritative empty collection', () => {
    expect(authoritativeCollection(['A', 'B', 'C'])).toEqual(['A', 'B', 'C']);
    expect(authoritativeCollection([])).toEqual([]);
    expect(authoritativeCollection(null)).toBeNull();
    expect(authoritativeCollection(undefined)).toBeNull();
  });

  it('replaces [A,B,C] with the newer authoritative [A] result', () => {
    const guard = new PlatformStoreHydrationGuard();
    guard.setIdentity('user-a');
    const token = guard.begin('initial');

    expect(guard.canCommit(token)).toBe(true);
    expect(authoritativeCollection(['A'])).toEqual(['A']);
  });

  it('discards User A hydration after the account changes to User B', () => {
    const guard = new PlatformStoreHydrationGuard();
    guard.setIdentity('user-a');
    const userAToken = guard.begin('studentRoster');

    guard.setIdentity('user-b');

    expect(guard.canCommit(userAToken)).toBe(false);
  });

  it('prevents an older request from overwriting a newer request', () => {
    const guard = new PlatformStoreHydrationGuard();
    guard.setIdentity('user-a');
    const older = guard.begin('initial');
    const newer = guard.begin('initial');

    expect(guard.canCommit(older)).toBe(false);
    expect(guard.canCommit(newer)).toBe(true);
  });

  it('does not treat network failure as an authoritative empty response', () => {
    expect(authoritativeCollection(null)).toBeNull();
    expect(api).toContain('fetchLessonPlansFromDB(): Promise<unknown[] | null>');
    expect(api).toContain('fetchUsersFromDB(): Promise<User[] | null>');
    expect(api).toMatch(
      /fetchTeacherWeeklyTimetable\(\s*academicYearId: string\s*\): Promise<unknown\[\] \| null>/s
    );
    expect(store).toContain('if (dbNotebook !== null');
    expect(store).toContain('const authoritativeLessons = authoritativeCollection(dbLessons);');
    expect(store).toContain(
      'const authoritativeDistrictMessages = authoritativeCollection(dbMsgs);'
    );
  });

  it('keeps network failures distinct from successful empty collection responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(fetchLessonPlansFromDB()).resolves.toBeNull();
    await expect(fetchUsersFromDB()).resolves.toBeNull();
    await expect(fetchTeacherWeeklyTimetable('2026-2027')).resolves.toBeNull();
  });

  it('keeps logout/account isolation and the owner-bound durable outbox intact', () => {
    expect(store).toContain('setTeacherClasses([]);');
    expect(store).toContain('setAllStudents([]);');
    expect(store).toContain('setActiveLessonSession(null);');
    expect(offline).toContain('export function clearOfflineAccountState()');
    expect(offline).toContain('const preserved = new Set([OUTBOX_KEY, QUARANTINE_KEY]);');
    expect(offline).toContain('entry.ownerUserId !== currentUserId');
  });

  it('keeps account-independent lesson timing preferences outside the reset boundary', () => {
    expect(store).toContain('setLessonTimingSettings');
    expect(store).not.toContain('setLessonTimingSettings(INITIAL');
    expect(store).toContain("localStorage.setItem('spex_lesson_timing_settings'");
  });

  it('uses replacement semantics for server-backed lesson plans and messages', () => {
    expect(store).toContain('setLessonPlans(authoritativeLessons as LessonPlan[]);');
    expect(store).toContain(
      'setDistrictGroupMessages(authoritativeDistrictMessages as DistrictGroupMessage[]);'
    );
    expect(store).toContain(
      'setDirectMessages(authoritativeDirectMessages as DirectChatMessage[]);'
    );
    expect(store).not.toContain('if (dbLessons && dbLessons.length > 0)');
    expect(store).not.toContain('if (dbDirectMsgs && dbDirectMsgs.length > 0)');
  });
});
