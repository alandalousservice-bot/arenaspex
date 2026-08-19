import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage for node environment
class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = value; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
  key(index: number) { return Object.keys(this.store)[index] || null; }
  get length() { return Object.keys(this.store).length; }
}

// Setup globals
const localStorageMock = new LocalStorageMock() as any;
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('navigator', { onLine: true } as any);
vi.stubGlobal('document', {
  visibilityState: 'visible',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
} as any);
vi.stubGlobal('window', {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  localStorage: localStorageMock
} as any);

const { offlinePost, offlineDelete, registerOnlineFlush, __getOutboxForTest, __clearOutboxForTest } = await import('../src/lib/offline');

beforeEach(() => {
  localStorageMock.clear();
  __clearOutboxForTest();
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

    const result = await offlinePost('/api/db/lesson-plans', { lessonPlan: { id: 'lp1', title: 'test' } });

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
});
