/**
 * SPEX - Offline Field Mode (PART C - C1)
 * صندوق صادر localStorage ('spex_outbox_v1') —
 * offlinePost(path,payload)/offlineDelete(path): انقطاع الشبكة ⇒ تُخزَّن بنفس الترتيب مع إزالة تكرار بمعرّف السجل (payload.*.id)،
 * وأخطاء HTTP 4xx/409 لا تُعاد؛ registerOnlineFlush() يفرغها بترتيبها عند 'online' (يوقف عند انقطاع جديد).
 */

const OUTBOX_KEY = 'spex_outbox_v1';
const QUARANTINE_KEY = 'spex_outbox_quarantine_v1';
const IDENTITY_KEY = 'spex_offline_identity_v1';

let activeUserId: string | null = null;

export interface OutboxEntry {
  id: string; // internal unique for outbox item
  path: string;
  method: 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  payload?: unknown;
  recordId?: string | null; // extracted for dedupe
  timestamp: number;
  /** The authenticated account that created this mutation. Missing means legacy data. */
  ownerUserId?: string;
}

function normalizeUserId(userId: string | null | undefined): string | null {
  const normalized = typeof userId === 'string' ? userId.trim() : '';
  return normalized || null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function extractRecordId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  // direct id
  if (typeof obj.id === 'string' && obj.id) return obj.id;
  // look for nested object with id (e.g., { lessonPlan: { id } })
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && typeof (v as any).id === 'string' && (v as any).id) {
      return (v as any).id as string;
    }
    // deeper: if v is array? first element with id
    if (Array.isArray(v)) {
      for (const el of v) {
        if (el && typeof el === 'object' && typeof (el as any).id === 'string' && (el as any).id) {
          return (el as any).id as string;
        }
      }
    }
  }
  return null;
}

function getOutbox(): OutboxEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as OutboxEntry[];
    return [];
  } catch {
    return [];
  }
}

function setOutbox(entries: OutboxEntry[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable - ignore
  }
}

function getQuarantine(): OutboxEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(QUARANTINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    return [];
  }
}

function setQuarantine(entries: OutboxEntry[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable - keep the active outbox untouched
  }
}

/**
 * Set the in-memory account context used when a mutation must be queued.
 * Only the opaque user id is persisted, never a token or other credential.
 */
export function setOfflineUserId(userId: string | null): void {
  const nextUserId = normalizeUserId(userId);
  let previousUserId: string | null = activeUserId;
  if (isBrowser()) {
    try {
      previousUserId = normalizeUserId(localStorage.getItem(IDENTITY_KEY)) || previousUserId;
    } catch {
      // localStorage is best-effort; the in-memory identity remains authoritative.
    }
  }

  if (nextUserId && previousUserId && nextUserId !== previousUserId) {
    clearOfflineReadState();
  }

  activeUserId = nextUserId;
  if (!isBrowser()) return;
  try {
    if (nextUserId) localStorage.setItem(IDENTITY_KEY, nextUserId);
    else localStorage.removeItem(IDENTITY_KEY);
  } catch {
    // localStorage is best-effort; mutations still fail closed without an id.
  }
}

export function getOfflineUserId(): string | null {
  return activeUserId;
}

/** Remove authenticated read/optimistic state while preserving pending work. */
export function clearOfflineReadState(): void {
  if (!isBrowser()) return;
  try {
    const preserved = new Set([OUTBOX_KEY, QUARANTINE_KEY]);
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith('spex_') && !preserved.has(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Cache cleanup is best-effort; the service worker never caches authenticated APIs.
  }
}

/** Logout/account-switch boundary: clear account state, retain recoverable queues. */
export function clearOfflineAccountState(): void {
  activeUserId = null;
  clearOfflineReadState();
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(IDENTITY_KEY);
  } catch {
    // best effort
  }
}

function queueMutation(
  entry: Omit<OutboxEntry, 'id' | 'timestamp' | 'recordId' | 'ownerUserId'> & {
    payload?: unknown;
  }
): boolean {
  const ownerUserId =
    activeUserId || normalizeUserId(isBrowser() ? localStorage.getItem(IDENTITY_KEY) : null);
  if (!ownerUserId) return false;
  addToOutbox({ ...entry, ownerUserId });
  return true;
}

function addToOutbox(
  entry: Omit<OutboxEntry, 'id' | 'timestamp' | 'recordId'> & { payload?: unknown }
): void {
  const outbox = getOutbox();
  const recordId = entry.payload
    ? extractRecordId(entry.payload)
    : extractRecordIdFromPath(entry.path);

  // إزالة تكرار بمعرّف السجل (payload.*.id) — نفس الترتيب مع استبدال الأحدث
  if (recordId) {
    const filtered = outbox.filter(
      (e) => e.ownerUserId !== entry.ownerUserId || e.recordId !== recordId
    );
    // also check path may contain same id even if payload doesn't
    const finalFiltered = filtered.filter((e) => {
      if (e.ownerUserId !== entry.ownerUserId) return true;
      if (e.recordId === recordId) return false;
      // if same path (especially DELETE) with same recordId extracted from path
      const pathId = extractRecordIdFromPath(e.path);
      if (pathId && pathId === recordId) return false;
      return true;
    });
    outbox.length = 0;
    outbox.push(...finalFiltered);
  } else {
    // dedupe by path+method if no recordId (prevent duplicate deletes of same id)
    const pathId = extractRecordIdFromPath(entry.path);
    if (pathId) {
      const filtered = outbox.filter((e) => {
        const existingPathId = extractRecordIdFromPath(e.path);
        if (
          existingPathId &&
          existingPathId === pathId &&
          e.ownerUserId === entry.ownerUserId &&
          e.method === entry.method &&
          e.path === entry.path
        ) {
          return false;
        }
        return true;
      });
      outbox.length = 0;
      outbox.push(...filtered);
    }
  }

  const newEntry: OutboxEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    path: entry.path,
    method: entry.method,
    payload: entry.payload,
    recordId: recordId || extractRecordIdFromPath(entry.path),
    timestamp: Date.now(),
    ownerUserId: entry.ownerUserId,
  };
  outbox.push(newEntry);
  setOutbox(outbox);
}

function extractRecordIdFromPath(path: string): string | null {
  try {
    // path like /api/db/lesson-plans/xxx or /api/db/users/xxx
    const parts = path.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (
      last &&
      last.length >= 3 &&
      !last.includes('?') &&
      !last.includes('batch') &&
      !last.includes('users') &&
      !last.includes('lesson-plans') &&
      !last.includes('notebook') &&
      !last.includes('inspector-notes') &&
      !last.includes('district-messages') &&
      !last.includes('direct-messages') &&
      !last.includes('community-resources') &&
      !last.includes('community-notifications')
    ) {
      // assume last segment is id if not a known collection name
      // we will consider any segment that looks like id (contains _ or - or length > 5)
      if (/^[A-Za-z0-9_-]+$/.test(last)) return last;
    }
    return null;
  } catch {
    return null;
  }
}

export async function offlinePost(
  path: string,
  payload: unknown,
  method: 'POST' | 'PUT' | 'PATCH' = 'POST'
): Promise<{ success: boolean; error?: string }> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
      if (res.ok) {
        return { success: true };
      }
      // أخطاء HTTP 4xx/409 لا تُعاد
      if ((res.status >= 400 && res.status < 500) || res.status === 409) {
        // لا نعيد، نعتبرها منتهية (عدم إدخال للصندوق)
        return { success: false, error: `HTTP ${res.status}` };
      }
      // 5xx -> consider as failure to be queued
      throw new Error(`Server error ${res.status}`);
    } catch (e) {
      // network error or 5xx -> queue
      const message = (e as Error).message || '';
      // if message indicates 4xx we already handled; otherwise queue
      if (
        !isOnline ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('Server error')
      ) {
        if (queueMutation({ path, method, payload })) {
          return { success: false, error: 'queued offline' };
        }
        return { success: false, error: 'offline identity unavailable' };
      }
      if (queueMutation({ path, method, payload })) {
        return { success: false, error: 'queued offline' };
      }
      return { success: false, error: 'offline identity unavailable' };
    }
  } else {
    // offline directly
    if (queueMutation({ path, method, payload })) {
      return { success: false, error: 'queued offline' };
    }
    return { success: false, error: 'offline identity unavailable' };
  }
}

export async function offlineDelete(path: string): Promise<{ success: boolean; error?: string }> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    try {
      const res = await fetch(path, { method: 'DELETE' });
      if (res.ok) {
        return { success: true };
      }
      if ((res.status >= 400 && res.status < 500) || res.status === 409) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      throw new Error(`Server error ${res.status}`);
    } catch {
      if (queueMutation({ path, method: 'DELETE' })) {
        return { success: false, error: 'queued offline' };
      }
      return { success: false, error: 'offline identity unavailable' };
    }
  } else {
    if (queueMutation({ path, method: 'DELETE' })) {
      return { success: false, error: 'queued offline' };
    }
    return { success: false, error: 'offline identity unavailable' };
  }
}

export async function flushOfflineOutbox(): Promise<void> {
  if (!isBrowser()) return;
  const currentUserId = activeUserId || normalizeUserId(localStorage.getItem(IDENTITY_KEY));
  if (!currentUserId || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

  const outbox = getOutbox();
  if (outbox.length === 0) return;

  outbox.sort((a, b) => a.timestamp - b.timestamp);
  const remaining: OutboxEntry[] = [];
  const quarantined = getQuarantine();

  for (const entry of outbox) {
    // Legacy entries have no trustworthy owner and must never be replayed.
    if (!entry.ownerUserId) {
      quarantined.push(entry);
      continue;
    }
    // Keep another account's pending work for that account's later session.
    if (entry.ownerUserId !== currentUserId) {
      remaining.push(entry);
      continue;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const idx = outbox.indexOf(entry);
      remaining.push(...outbox.slice(idx));
      break;
    }

    try {
      const res = await fetch(entry.path, {
        method: entry.method,
        headers: entry.payload ? { 'Content-Type': 'application/json' } : undefined,
        body: entry.payload ? JSON.stringify(entry.payload) : undefined,
      });

      if (res.ok || (res.status >= 400 && res.status < 500) || res.status === 409) {
        continue;
      }
      const idx = outbox.indexOf(entry);
      remaining.push(...outbox.slice(idx));
      break;
    } catch {
      const idx = outbox.indexOf(entry);
      remaining.push(...outbox.slice(idx));
      break;
    }
  }

  setQuarantine(quarantined);
  setOutbox(remaining);
}

export function registerOnlineFlush(): () => void {
  if (!isBrowser()) return () => {};

  // immediate attempt if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    // defer slightly to avoid blocking
    setTimeout(() => void flushOfflineOutbox(), 1000);
  }

  const onOnline = () => {
    void flushOfflineOutbox();
  };

  window.addEventListener('online', onOnline);

  // also flush on visibility change to online
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void flushOfflineOutbox();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

// Helpers for tests
export function __getOutboxForTest(): OutboxEntry[] {
  return getOutbox();
}
export function __setOutboxForTest(entries: OutboxEntry[]): void {
  setOutbox(entries);
}
export function __clearOutboxForTest(): void {
  setOutbox([]);
}
export function __getQuarantineForTest(): OutboxEntry[] {
  return getQuarantine();
}
export function __clearQuarantineForTest(): void {
  setQuarantine([]);
}
