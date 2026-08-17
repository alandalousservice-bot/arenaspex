/**
 * SPEX - Google Sign-In Verification
 * التحقق من صحة رمز هوية Google (ID token) الصادر عن Google Identity Services في الواجهة،
 * قبل الوثوق بالبريد الإلكتروني المستخرج منه لربط/تسجيل الدخول بحساب المستخدم في SPEX.
 *
 * إصلاحات المراجعة على النسخة الأصلية لمستودع 01:
 *  1) isGoogleSignInConfigured كانت ترجع true دائماً — أصبحت فحصاً حقيقياً لوجود GOOGLE_CLIENT_ID.
 *  2) مسار tokeninfo الاحتياطي كان يقبل الرموز دون التحقق من أنها صادرة لهذا التطبيق
 *     (claim "aud") — أي رمز Google سليم صادر لتطبيق آخر كان يمكنه اختطاق حساب بنفس البريد!
 *     الآن يُرفض أي رمز لا يطابق GOOGLE_CLIENT_ID (و"iss" لازم يكون نطاق Google).
 *  3) عندما لا يكون Google مفعّلاً على الخادم، لا يُقبل أي رمز إطلاقاً بدل محاولة تحقق عمياء.
 */
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// جهات الإصدار الشرعية الوحيدة لرموز هوية Google
const VALID_GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatar?: string;
}

/** فحص حقيقي: بدون GOOGLE_CLIENT_ID لا يمكن التحقق من هوية التطبيق فتُعطَّل الميزة */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && client);
}

/**
 * يتحقق من رمز الهوية (credential) القادم من زر "الدخول عبر Google" في الواجهة.
 * يتحقق محلياً بالعميل الرسمي، ويسقط إلى API tokeninfo الرسمي عند الحاجة —
 * مع التحقق الإلزامي في الحالتين من audience (aud) و issuer (iss).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  // الميزة معطّلة بدون معرّف التطبيق — لا يُقبل أي رمز إطلاقاً (تثبيت للإصلاح 3)
  if (!client || !GOOGLE_CLIENT_ID) return null;

  // 1. التحقق المحلي عبر مكتبة Google الرسمية (يفحص التوقيع وaud وانتهاء الصلاحية)
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (payload && payload.sub && payload.email) {
      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: Boolean(payload.email_verified),
        firstName: payload.given_name || payload.name || 'مستخدم',
        lastName: payload.family_name || 'جديد',
        avatar: payload.picture
      };
    }
    return null;
  } catch (err) {
    console.warn('تعذر التحقق المحلي من رمز Google (شبكة/ساعة النظام؟) — الانتقال إلى tokeninfo API...', err);
  }

  // 2. التحقق عبر نقطة النهاية الرسمية لتأكيد الرموز من Google (احتياطي شبكي)
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
      aud?: string;
      iss?: string;
    };
    if (!payload || !payload.sub || !payload.email) return null;

    // إصلاح أمني حاسم: يجب أن تكون الرسالة موجهة لهذا التطبيق نفسه، وصادرة عن Google
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      console.warn('رفض رمز Google: audience لا يطابق GOOGLE_CLIENT_ID لهذه المنصة.');
      return null;
    }
    if (!payload.iss || !VALID_GOOGLE_ISSUERS.has(payload.iss)) {
      console.warn('رفض رمز Google: جهة الإصدار (iss) غير موثوقة.');
      return null;
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      firstName: payload.given_name || payload.name || 'مستخدم',
      lastName: payload.family_name || 'جديد',
      avatar: payload.picture
    };
  } catch (err) {
    console.error('فشل التحقق من رمز Google عبر tokeninfo API:', err);
    return null;
  }
}
