import { describe, it, expect, beforeEach, vi } from 'vitest';

class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = value; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
  key(index: number) { return Object.keys(this.store)[index] || null; }
  get length() { return Object.keys(this.store).length; }
}

const localStorageMock = new LocalStorageMock() as any;

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', {
  localStorage: localStorageMock,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
} as any);

// Mock caches and serviceWorker
const cacheDeleteMock = vi.fn().mockResolvedValue(true);
const cacheKeysMock = vi.fn().mockResolvedValue(['spex-v2-static', 'spex-v2-api', 'other-cache']);

vi.stubGlobal('caches', {
  keys: cacheKeysMock,
  delete: cacheDeleteMock,
  match: vi.fn()
} as any);

const unregisterMock = vi.fn().mockResolvedValue(true);
vi.stubGlobal('navigator', {
  serviceWorker: {
    getRegistrations: vi.fn().mockResolvedValue([{ unregister: unregisterMock }])
  }
} as any);

const { triggerKillSwitch } = await import('../src/lib/killSwitch');

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  cacheKeysMock.mockResolvedValue(['spex-v2-static', 'spex-v2-api', 'other-cache']);
});

describe('killSwitch - إطلاق الزر + استثناء الصندوق (PART C/C3)', () => {
  it('يمحي كل مفاتيح spex_* ما عدا spex_outbox_v1 (معفى)', () => {
    localStorageMock.setItem('spex_current_user', JSON.stringify({ id: 'u1' }));
    localStorageMock.setItem('spex_custom_api_key', 'key123');
    localStorageMock.setItem('spex_outbox_v1', JSON.stringify([{ id: '1' }]));
    localStorageMock.setItem('other_key', 'should stay');

    triggerKillSwitch();

    expect(localStorageMock.getItem('spex_current_user')).toBeNull();
    expect(localStorageMock.getItem('spex_custom_api_key')).toBeNull();
    expect(localStorageMock.getItem('spex_outbox_v1')).not.toBeNull();
    expect(localStorageMock.getItem('other_key')).toBe('should stay');
    expect(JSON.parse(localStorageMock.getItem('spex_outbox_v1') as string).length).toBe(1);
  });

  it('يمحي كاشات sw (spex-*)', async () => {
    localStorageMock.setItem('spex_outbox_v1', '[]');

    triggerKillSwitch();

    // wait for caches.keys promise
    await new Promise((r) => setTimeout(r, 50));

    expect(cacheKeysMock).toHaveBeenCalled();
    // should delete spex caches
    expect(cacheDeleteMock).toHaveBeenCalled();
  });

  it('يُلغي تسجيل عمال الخدمة', async () => {
    triggerKillSwitch();
    await new Promise((r) => setTimeout(r, 50));
    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled();
  });

  it('الصندوق المعفى يبقى حتى بعد إطلاق الزر ثم إعادة التفعيل (محاكاة)', () => {
    const outboxData = [{ path: '/api/db/users', payload: { user: { id: 't1' } } }];
    localStorageMock.setItem('spex_outbox_v1', JSON.stringify(outboxData));
    localStorageMock.setItem('spex_current_user', 'some');

    triggerKillSwitch();

    const preserved = localStorageMock.getItem('spex_outbox_v1');
    expect(preserved).not.toBeNull();
    expect(JSON.parse(preserved as string)).toEqual(outboxData);
  });
});
