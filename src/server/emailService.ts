/**
 * SPEX - Email Service (Resend)
 * إرسال بريد إعادة تعيين كلمة المرور عبر Resend (REST API بسيطة، بدون مكتبة SMTP ثقيلة)
 *
 * لماذا Resend: تسجيل مجاني سريع، إرسال عبر fetch مباشرة بدون تبعية إضافية،
 * وتوثيق واضح لربط نطاق مُرسِل حقيقي. يمكن استبدالها بأي مزوّد آخر (SendGrid, Postmark...)
 * بتغيير هذا الملف فقط دون المساس ببقية الكود.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'SPEX <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY غير معرّف — لن يُرسل أي بريد فعلياً. راجع README-PRODUCTION.md.');
    return { sent: false, error: 'خدمة البريد الإلكتروني غير مُهيّأة على الخادم.' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html })
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Resend API error:', res.status, errBody);
      return { sent: false, error: 'تعذر إرسال البريد الإلكتروني.' };
    }

    return { sent: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { sent: false, error: 'تعذر الاتصال بخدمة البريد الإلكتروني.' };
  }
}

export async function sendPasswordResetEmail(to: string, firstName: string, rawToken: string) {
  const resetLink = `${APP_URL}/?reset_token=${rawToken}`;

  const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; background:#0f172a; padding: 32px; border-radius: 16px; color:#e2e8f0;">
      <h2 style="color:#60a5fa; margin-bottom: 4px;">منصة SPEX الابتدائي</h2>
      <p style="font-size: 13px; color:#94a3b8;">طلب إعادة تعيين كلمة المرور</p>
      <p style="font-size: 14px; line-height: 1.7;">مرحباً ${firstName || ''}،</p>
      <p style="font-size: 14px; line-height: 1.7;">
        وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اضغط الزر أدناه لاختيار كلمة مرور جديدة.
        هذا الرابط صالح لمدة <strong>30 دقيقة</strong> فقط ولمرة واحدة.
      </p>
      <a href="${resetLink}" style="display:inline-block; margin: 16px 0; background: linear-gradient(to right, #2563eb, #059669); color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 13px;">
        إعادة تعيين كلمة المرور
      </a>
      <p style="font-size: 12px; color:#64748b; line-height: 1.6;">
        إن لم تطلب هذا التغيير، يمكنك تجاهل هذه الرسالة بأمان — لن يتغيّر شيء في حسابك.
      </p>
    </div>
  `;

  return sendEmail(to, 'إعادة تعيين كلمة المرور - منصة SPEX', html);
}
