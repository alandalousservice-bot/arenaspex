import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

// Mock localStorage for node environment
class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  key(index: number) {
    return Object.keys(this.store)[index] || null;
  }
  get length() {
    return Object.keys(this.store).length;
  }
}

// Setup globals
const localStorageMock = new LocalStorageMock() as any;
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('navigator', { onLine: true } as any);
vi.stubGlobal('document', {
  visibilityState: 'visible',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any);
vi.stubGlobal('window', {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  localStorage: localStorageMock,
} as any);

const {
  offlinePost,
  offlineDelete,
  registerOnlineFlush,
  flushOfflineOutbox,
  setOfflineUserId,
  getOfflineUserId,
  clearOfflineAccountState,
  __getOutboxForTest,
  __setOutboxForTest,
  __clearOutboxForTest,
  __getQuarantineForTest,
  __clearQuarantineForTest,
} = await import('../src/lib/offline');

beforeEach(() => {
  clearOfflineAccountState();
  localStorageMock.clear();
  setOfflineUserId('user-a');
  __clearOutboxForTest();
  __clearQuarantineForTest();
  vi.stubGlobal('navigator', { onLine: true } as any);
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('offline.ts - PART C/C1', () => {
  it('تخزين عند انقطاع الشبكة (navigator.onLine===false)', async () => {
    vi.stubGlobal('navigator', { onLine: false } as any);
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));

    const result = await offlinePost('/api/db/lesson-plans', {
      lessonPlan: { id: 'lp1', title: 'test' },
    });

    expect(result.success).toBe(false);
    const outbox = __getOutboxForTest();
    expect(outbox.length).toBe(1);
    expect(outbox[0].path).toBe('/api/db/lesson-plans');
    expect(outbox[0].recordId).toBe('lp1');
  });

  it('عدم إعادة 4xx و 409 (لا تُخزَّن وتُهمل)', async () => {
    vi.stubGlobal('navigator', { onLine: true } as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 } as any);

    const result = await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'lp2' } });

    expect(result.success).toBe(false);
    const outbox = __getOutboxForTest();
    expect(outbox.length).toBe(0); // 4xx لا تُعاد ولا تُخزن
  });

  it('عدم إعادة 409 Conflict', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 409 } as any);
    const result = await offlinePost('/api/db/users', { user: { id: 'u1' } });
    const outbox = __getOutboxForTest();
    expect(outbox.length).toBe(0);
  });

  it('dedupe بالمعرف: نفس السجل يُستبدل بالأحدث', async () => {
    vi.stubGlobal('navigator', { onLine: false } as any);
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));

    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'lp_dup', title: 'v1' } });
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'lp_dup', title: 'v2' } });

    const outbox = __getOutboxForTest();
    expect(outbox.length).toBe(1);
    expect((outbox[0].payload as any).lessonPlan.title).toBe('v2');
  });

  it('الترتيب محفوظ (FIFO) — الطلبات تُخزَّن بنفس الترتيب', async () => {
    vi.stubGlobal('navigator', { onLine: false } as any);
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));

    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'a1' } });
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'b2' } });
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'c3' } });

    const outbox = __getOutboxForTest();
    expect(outbox.map((e) => e.recordId)).toEqual(['a1', 'b2', 'c3']);
  });

  it('الاستئناف بعد الانقطاع الجديد — يتوقف عند انقطاع جديد أثناء التفريغ', async () => {
    // Seed outbox with 3 entries
    vi.stubGlobal('navigator', { onLine: false } as any);
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'x1' } });
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'x2' } });
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'x3' } });

    // Now go online, but fetch succeeds for first, then fails (network) for second
    vi.stubGlobal('navigator', { onLine: true } as any);
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200 } as any);
      }
      // second call fails network
      return Promise.reject(new Error('network gone again'));
    });

    // Simulate flush via registerOnlineFlush manual trigger
    const cleanup = registerOnlineFlush();
    // registerOnlineFlush defers first flush by 1000ms + online event immediate also? Wait longer
    await new Promise((r) => setTimeout(r, 1200));

    // After first success, second failure should stop and keep remaining
    const remaining = __getOutboxForTest();
    // Should have 2 remaining (x2, x3) because first flushed
    expect(remaining.length).toBe(2);
    expect(remaining.map((e) => e.recordId)).toEqual(['x2', 'x3']);

    cleanup();
  });

  it('offlineDelete يُخزَّن عند انقطاع ويُراعى dedupe بالمسار', async () => {
    vi.stubGlobal('navigator', { onLine: false } as any);
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));

    await offlineDelete('/api/db/lesson-plans/lp_del1');
    await offlineDelete('/api/db/lesson-plans/lp_del1'); // duplicate

    const outbox = __getOutboxForTest();
    expect(outbox.length).toBe(1);
    expect(outbox[0].method).toBe('DELETE');
  });

  it('A: يعيد حساب A تشغيل عملياته التي أنشأها عند عودة الاتصال', async () => {
    vi.stubGlobal('navigator', { onLine: false } as any);
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'a-1' } });
    expect(__getOutboxForTest()[0].ownerUserId).toBe('user-a');

    vi.stubGlobal('navigator', { onLine: true } as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as any);
    await flushOfflineOutbox();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(__getOutboxForTest()).toHaveLength(0);
  });

  it('B: لا يعيد حساب B تشغيل طابور حساب A', async () => {
    vi.stubGlobal('navigator', { onLine: false } as any);
    await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'a-2' } });
    clearOfflineAccountState();
    setOfflineUserId('user-b');

    vi.stubGlobal('navigator', { onLine: true } as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as any);
    await flushOfflineOutbox();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(__getOutboxForTest()[0].ownerUserId).toBe('user-a');
  });

  it('C/F: يزيل الخروج حالة القراءة وهوية الحساب من الذاكرة مع إبقاء الطابور', async () => {
    localStorageMock.setItem('spex_teacher_classes_user-a', JSON.stringify([{ id: 'a-class' }]));
    vi.stubGlobal('navigator', { onLine: false } as any);
    await offlinePost('/api/db/notebook', { entry: { id: 'a-3' } });

    clearOfflineAccountState();

    expect(getOfflineUserId()).toBeNull();
    expect(localStorageMock.getItem('spex_teacher_classes_user-a')).toBeNull();
    expect(__getOutboxForTest()).toHaveLength(1);
  });

  it('D: الإدخال القديم بلا مالك يُحجر ولا يُعاد تشغيله تلقائياً', async () => {
    __setOutboxForTest([
      {
        id: 'legacy-1',
        path: '/api/db/lesson-plans',
        method: 'POST',
        payload: { lessonPlan: { id: 'legacy-record' } },
        timestamp: 1,
      },
    ]);
    vi.stubGlobal('navigator', { onLine: true } as any);
    global.fetch = vi.fn();
    await flushOfflineOutbox();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(__getOutboxForTest()).toHaveLength(0);
    expect(__getQuarantineForTest()).toHaveLength(1);
  });

  it('يفشل مغلقاً ولا ينشئ طابوراً مجهول المالك', async () => {
    clearOfflineAccountState();
    vi.stubGlobal('navigator', { onLine: false } as any);

    const result = await offlinePost('/api/db/notebook', { entry: { id: 'unknown-owner' } });

    expect(result).toEqual({ success: false, error: 'offline identity unavailable' });
    expect(__getOutboxForTest()).toHaveLength(0);
  });

  it('E: يستطيع A إعادة تشغيل عملياته بعد تسجيل الخروج والعودة', async () => {
    vi.stubGlobal('navigator', { onLine: false } as any);
    await offlinePost('/api/db/notebook', { entry: { id: 'a-4' } });
    clearOfflineAccountState();
    setOfflineUserId('user-a');

    vi.stubGlobal('navigator', { onLine: true } as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as any);
    await flushOfflineOutbox();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(__getOutboxForTest()).toHaveLength(0);
  });

  it('G: يبقى التخزين الثابت في عامل الخدمة، بينما لا تُخزَّن API', () => {
    const serviceWorker = readFileSync('public/sw.js', 'utf8');
    expect(serviceWorker).toContain('const STATIC_CACHE');
    expect(serviceWorker).toContain('caches.open(STATIC_CACHE)');
    expect(serviceWorker).toContain("if (url.pathname.startsWith('/api/'))");
    expect(serviceWorker).toContain('event.respondWith(fetch(request));');
    expect(serviceWorker).not.toContain('API_CACHE');
    expect(serviceWorker).not.toContain('cache.put(request, sanitizedResponse)');
  });

  it('يحمي مسار الخروج وحالة المتجر من إعادة استخدام ذاكرة الحساب السابق', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const auth = readFileSync('src/hooks/useAuth.ts', 'utf8');
    const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');

    expect(app).toContain('clearOfflineAccountState();');
    expect(auth).toContain('export const EMPTY_SESSION_USER');
    expect(app).toContain('setCurrentUser(EMPTY_SESSION_USER);');
    expect(store).toContain('setTeacherClasses([]);');
    expect(store).toContain('setAllStudents([]);');
    expect(store).toContain('setActiveLessonSession(null);');
  });
});
