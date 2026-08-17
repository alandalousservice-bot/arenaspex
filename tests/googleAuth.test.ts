/**
 * اختبارات تشديد التحقق من رموز Google (إصلاحات المراجعة على ملف googleAuth):
 * - بدون GOOGLE_CLIENT_ID: الميزة معطّلة ولا يُقبل أي رمز إطلاقاً.
 * - عبر مسار tokeninfo الاحتياطي: يُرفض أي رمز لا يطابق aud هذا التطبيق
 *   (كان ثغرة: رمز تطبيق آخر يُقبل فيُختطَف الحساب بنفس البريد) أو iss غير تابع لـ Google.
 * - الرمز المطابق تماماً يُرجع ملفاً موحّد الحقول عبر TokeninfoPayload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// نُسقط التحقق المحلي (شبكة Google ليست جزءاً من الاختبار) ليذهب التدفق دوماً
// إلى مسار tokeninfo الاحتياطي الخاضع للمحاكاة
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    async verifyIdToken() {
      throw new Error('local verification unavailable in tests');
    }
  }
}));

const YOUR_CLIENT = 'your-client-id.apps.googleusercontent.com';

async function importFreshGoogleAuth(clientId?: string) {
  vi.resetModules();
  if (clientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    vi.stubEnv('GOOGLE_CLIENT_ID', clientId);
  }
  return await import('../src/server/googleAuth');
}

function mockTokeninfo(payload: Record<string, unknown>, ok = true) {
  const spy = vi.fn(async () => ({ ok, json: async () => payload }));
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('googleAuth — تشديدات المراجعة الأمنية', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('يعطّل الميزة بالكامل عند غياب GOOGLE_CLIENT_ID ولا يجري أي نداء شبكة', async () => {
    const mod = await importFreshGoogleAuth(undefined);
    expect(mod.isGoogleSignInConfigured()).toBe(false);
    const fetchSpy = mockTokeninfo({});
    expect(await mod.verifyGoogleIdToken('any.jwt.token')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('يفعّل الميزة عند وجود GOOGLE_CLIENT_ID', async () => {
    const mod = await importFreshGoogleAuth(YOUR_CLIENT);
    expect(mod.isGoogleSignInConfigured()).toBe(true);
  });

  it('يرفض رمزاً لتطبيق آخر (aud مختلف) — الثغرة الأصلية أُصلحت', async () => {
    const mod = await importFreshGoogleAuth(YOUR_CLIENT);
    mockTokeninfo({
      sub: '123',
      email: 'teacher@spex.dz',
      email_verified: 'true',
      given_name: 'أستاذ',
      aud: 'SOME-OTHER-APP.apps.googleusercontent.com',
      iss: 'https://accounts.google.com'
    });
    expect(await mod.verifyGoogleIdToken('h.p.s')).toBeNull();
  });

  it('يرفض iss غير تابع لـ Google حتى لو طابق aud', async () => {
    const mod = await importFreshGoogleAuth(YOUR_CLIENT);
    mockTokeninfo({
      sub: '123',
      email: 'teacher@spex.dz',
      email_verified: 'true',
      aud: YOUR_CLIENT,
      iss: 'https://evil-issuer.example.com'
    });
    expect(await mod.verifyGoogleIdToken('h.p.s')).toBeNull();
  });

  it('يرفض الرموز عند فشل اتصال Google أو استجابة غير مكتملة', async () => {
    const mod = await importFreshGoogleAuth(YOUR_CLIENT);
    mockTokeninfo({}, false); // ok=false
    expect(await mod.verifyGoogleIdToken('h.p.s')).toBeNull();

    mockTokeninfo({ sub: '123' }); // بلا بريد
    expect(await mod.verifyGoogleIdToken('h.p.s')).toBeNull();
  });

  it('يقبل الرمز الشرعي المطابق ويوحّد الحقول', async () => {
    const mod = await importFreshGoogleAuth(YOUR_CLIENT);
    mockTokeninfo({
      sub: 'g-123',
      email: 'Teacher@SPEX.dz',
      email_verified: 'true',
      given_name: 'عبد المالك',
      family_name: 'نابتي',
      picture: 'https://example.com/a.png',
      aud: YOUR_CLIENT,
      iss: 'accounts.google.com'
    });
    const profile = await mod.verifyGoogleIdToken('h.p.s');
    expect(profile).toEqual({
      googleId: 'g-123',
      email: 'teacher@spex.dz',
      emailVerified: true,
      firstName: 'عبد المالك',
      lastName: 'نابتي',
      avatar: 'https://example.com/a.png'
    });
  });
});
