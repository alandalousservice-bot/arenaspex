/**
 * SPEX - Reversible Security Kill-Switch (PART C - C3)
 * عند إطلاق الزر: تمحى كل مفاتيح spex_* ما عدا spex_outbox_v1 (معفى — بتحديثات الاستاذ قبل الحظر حتى الإعادة التفعيل)
 * + تمحى كاشات sw + يُلغى تسجيل عمال الخدمة
 */

const OUTBOX_KEY = 'spex_outbox_v1';
const SPEX_PREFIX = 'spex_';

export function triggerKillSwitch(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. مسح كل مفاتيح spex_* ما عدا الصندوق المعفى
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(SPEX_PREFIX) && key !== OUTBOX_KEY) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }

    // احتفظ بـ spex_outbox_v1 — لا نمسحه
  } catch (e) {
    console.warn('killSwitch localStorage clear failed', e);
  }

  // 2. مسح كاشات Service Worker
  try {
    const cacheObj = (typeof caches !== 'undefined' ? caches : (typeof window !== 'undefined' && (window as any).caches ? (window as any).caches : null)) as any;
    if (cacheObj && cacheObj.keys) {
      cacheObj.keys().then((keys: string[]) => {
        for (const key of keys) {
          if (key.startsWith('spex-') || key.includes('spex') || key.includes('api')) {
            cacheObj.delete(key).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  } catch {}

  // 3. إلغاء تسجيل عمال الخدمة
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          reg.unregister().catch(() => {});
        }
      }).catch(() => {});
    }
  } catch {}
}

export function getOutboxPreserved(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(OUTBOX_KEY);
    }
  } catch {}
  return null;
}
