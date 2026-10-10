/**
 * SPEX - Authentication Router
 * تسجيل الدخول الحقيقي (bcrypt + JWT في كوكيز httpOnly)، بدل التحقق من كلمة المرور في المتصفح
 */
import { Router, urlencoded, type Request } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from './prismaClient.js';
import {
  verifyPassword,
  hashPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  sanitizeOwnUser,
  getSessionTokenFromRequest,
  verifySession,
  generateResetToken,
  hashResetToken,
} from './auth.js';
import { isEmailConfigured, sendPasswordResetEmail } from './emailService.js';
import { requireAuth } from './middleware/requireAuth.js';
import { verifyGoogleIdToken, isGoogleSignInConfigured } from './googleAuth.js';
import { createPlatformEmail } from './platformEmail.js';
import { allowAuthAttempt } from './authRateLimit.js';
import { hasEmailVerificationSecret } from './emailVerification.js';
import { issueEmailVerification, verifyEmailCode } from './emailVerificationService.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  portal: z.enum(['professional', 'admin']).optional().default('professional'),
});

const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل'),
  lastName: z.string().trim().min(2, 'اللقب يجب أن يكون حرفين على الأقل'),
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  // Public registration creates a pending pedagogical account; Admin remains separate.
  role: z.enum(['teacher', 'inspector']).optional().default('teacher'),
  // PART A: هيكلية جغرافية وطنية + تسجيل بالقوائم المتراكبة
  eduDirectorateId: z.string().trim().min(1, 'يجب اختيار مديرية التربية'),
  eduDistrictId: z.string().trim().min(1, 'يجب اختيار المقاطعة التفتيشية'),
});

function remapHistoricDirectorateId(id?: string | null): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (trimmed === 'de_19' || trimmed === 'de_19'.toLowerCase()) return 'setif_de';
  // also handle de_19 variations like de_19 padded? already
  return trimmed;
}

const VERIFICATION_REQUEST_MESSAGE =
  'إذا كان البريد مؤهلاً للتحقق، فستصلك رسالة برمز صالح لعشر دقائق.';
const verificationIssueRateLimit = 10;
const verificationCheckRateLimit = 20;

function requestIdentity(req: Request) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

async function findAccountByAddress(address: string) {
  const normalizedEmail = address.trim().toLowerCase();
  return prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { platformEmail: normalizedEmail }] },
  });
}

authRouter.post('/register', async (req, res) => {
  if (!allowAuthAttempt('registration-ip', requestIdentity(req), 10, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'تجاوزت عدد محاولات التسجيل المسموح. حاول لاحقاً.' });
  }
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }

  const {
    firstName,
    lastName,
    email,
    password,
    role: requestedRole,
    eduDirectorateId,
    eduDistrictId,
  } = parsed.data;
  const role = requestedRole === 'inspector' ? 'inspector' : 'teacher';
  const lowerEmail = email.toLowerCase();

  if (!isEmailConfigured() || !hasEmailVerificationSecret()) {
    return res.status(503).json({ error: 'تعذر بدء التحقق من البريد حالياً. حاول لاحقاً.' });
  }

  const passwordHash = await hashPassword(password);
  const spexId = `SPX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const userId = `usr_${crypto.randomUUID()}`;
  const platformEmail = await createPlatformEmail(firstName, lastName);

  // ترمية الأكواد التاريخية de_19→setif_de
  const normalizedEduDir = remapHistoricDirectorateId(eduDirectorateId || null);
  const normalizedLegacyDir = normalizedEduDir || '';

  try {
    const directorate = normalizedEduDir
      ? await prisma.directorate.findUnique({ where: { id: normalizedEduDir } })
      : null;
    if (!directorate) {
      return res.status(400).json({ error: 'مديرية التربية المحددة غير موجودة.' });
    }

    const district = await prisma.inspectionDistrict.findUnique({ where: { id: eduDistrictId } });
    if (!district) {
      return res.status(400).json({ error: 'المقاطعة التفتيشية المحددة غير موجودة.' });
    }
    if (district.directorateId !== directorate.id) {
      return res
        .status(400)
        .json({ error: 'المقاطعة التفتيشية المحددة لا تتبع مديرية التربية المختارة.' });
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          id: userId,
          username: `user_${Date.now().toString().slice(-6)}`,
          spexId,
          firstName,
          lastName,
          email: lowerEmail,
          platformEmail,
          passwordHash,
          role,
          directorateId: normalizedLegacyDir,
          districtId: eduDistrictId,
          eduDirectorateId: normalizedEduDir,
          eduDistrictId,
          specialization:
            role === 'inspector'
              ? 'مفتش التربية البدنية والرياضية'
              : 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
          yearsExperience: null,
          status: 'pending_approval',
          isApprovedByAdmin: false,
          emailVerifiedAt: null,
          customApiKey: '',
          apiKeyStatus: 'not_set',
        } as any,
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        return res
          .status(202)
          .json({
            success: true,
            verificationRequired: true,
            message: VERIFICATION_REQUEST_MESSAGE,
          });
      }
      throw error;
    }

    await issueEmailVerification(user, new Date());
    res
      .status(202)
      .json({ success: true, verificationRequired: true, message: VERIFICATION_REQUEST_MESSAGE });
  } catch (err: unknown) {
    console.error('Registration request failed.');
    res.status(500).json({ error: 'تعذر إنشاء الحساب، يرجى إعادة المحاولة.' });
  }
});

authRouter.post('/email-verification/request', async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email() }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح.' });
  const address = parsed.data.email.toLowerCase();
  if (
    !allowAuthAttempt(
      'email-verification-request-ip',
      requestIdentity(req),
      verificationIssueRateLimit,
      60 * 60 * 1000
    )
  ) {
    return res.status(429).json({ success: true, message: VERIFICATION_REQUEST_MESSAGE });
  }
  const user = await findAccountByAddress(address);
  if (user && user.role !== 'admin' && !user.emailVerifiedAt) {
    await issueEmailVerification(user, new Date()).catch(() => undefined);
  }
  return res.status(202).json({ success: true, message: VERIFICATION_REQUEST_MESSAGE });
});

authRouter.post('/email-verification/verify', async (req, res) => {
  if (
    !allowAuthAttempt(
      'email-verification-check-ip',
      requestIdentity(req),
      verificationCheckRateLimit,
      60 * 60 * 1000
    )
  ) {
    return res.status(429).json({ error: 'تجاوزت عدد المحاولات المسموح. حاول لاحقاً.' });
  }
  const parsed = z
    .object({ email: z.string().trim().email(), code: z.string().regex(/^\d{6}$/) })
    .strict()
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'البريد أو رمز التحقق غير صالح.' });
  if (!hasEmailVerificationSecret())
    return res.status(503).json({ error: 'تعذر التحقق من البريد حالياً. حاول لاحقاً.' });
  const user = await findAccountByAddress(parsed.data.email);
  if (!user || user.role === 'admin')
    return res.status(400).json({ error: 'رمز التحقق غير صالح أو منتهي الصلاحية.' });
  const result = await verifyEmailCode(user.id, parsed.data.code, new Date());
  if (result.kind !== 'verified')
    return res.status(400).json({ error: 'رمز التحقق غير صالح أو منتهي الصلاحية.' });
  const token = signSession({ userId: result.user.id, role: result.user.role });
  setSessionCookie(res, token);
  return res.json({ success: true, verified: true, user: sanitizeOwnUser(result.user) });
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور.' });
  }
  const { email, password, portal } = parsed.data;

  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { platformEmail: normalizedEmail }] },
  });

  const genericError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';

  if (!user) {
    return res.status(401).json({ error: genericError });
  }
  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: genericError });
  }

  if (user.status === 'archived')
    return res
      .status(403)
      .json({
        error: 'الحساب مؤرشف ولا يمكن تسجيل الدخول إليه.',
        code: 'ACCOUNT_ARCHIVED',
        disabled: true,
      });

  if (user.role !== 'admin' && !user.emailVerifiedAt) {
    return res
      .status(403)
      .json({
        error: 'تحقق من بريدك الإلكتروني قبل تسجيل الدخول.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
      });
  }

  if (portal === 'admin' && user.role !== 'admin') {
    return res.status(403).json({
      error: 'هذا الحساب غير مخول للدخول إلى إدارة المنظومة.',
      code: 'AUTH_PORTAL_MISMATCH',
    });
  }
  if (portal === 'professional' && user.role === 'admin') {
    return res
      .status(403)
      .json({ error: 'يرجى استخدام بوابة الدخول المناسبة لحسابك.', code: 'AUTH_PORTAL_MISMATCH' });
  }

  if (user.status !== 'active' || !user.isApprovedByAdmin) {
    return res
      .status(403)
      .json({
        error: 'حسابك قيد انتظار موافقة الإدارة أو غير مفعّل حالياً.',
        code: 'ACCOUNT_PENDING_APPROVAL',
        user: sanitizeOwnUser(user),
      });
  }
  if (!user.platformEmail) {
    user.platformEmail = await createPlatformEmail(user.firstName, user.lastName);
    await prisma.user.update({
      where: { id: user.id },
      data: { platformEmail: user.platformEmail },
    });
  }
  const token = signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);

  res.json({ success: true, user: sanitizeOwnUser(user) });
});

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

// -----------------------------------------------------------------------
// Sign in with Google — سياسة المنصة: الإنشاء الذاتي المعلّق مسموح للأستاذ
// والمفتش فقط؛ أي بريد Google موثّق ينشئ حساباً بانتظار اعتماد المشرف.
// (pending_approval) والمشرف يفعّله لاحقاً من بوابته. الحسابات الموجودة بنفس
// البريد تتطلب تسجيل الدخول ثم ربطاً صريحاً من جلسة الحساب.
// -----------------------------------------------------------------------
const googleRegistrationSchema = z
  .object({
    role: z.enum(['teacher', 'inspector']),
    eduDirectorateId: z.string().trim().min(1),
    eduDistrictId: z.string().trim().min(1),
  })
  .strict();
const googleAuthSchema = z.object({
  credential: z.string().min(10),
  registration: googleRegistrationSchema.optional(),
});

const GOOGLE_SELF_REGISTER_ROLES = new Set(['teacher', 'inspector']);

/**
 * منطق Google الموحّد (يخدم مسارَي /google و /google/gsi-callback):
 * - حساب مربوط بـ googleId: دخول مباشر (بعد فحص التفعيل).
 * - حساب موجود بنفس البريد بلا ربط: يتطلب دخولاً محلياً ثم ربطاً صريحاً.
 * - لا حساب إطلاقاً: إنشاء حساب جديد بعد إدخال الدور والمديرية والمقاطعة
 *   (pending_approval — نفس سياسة التسجيل العادي)، بكلمة مرور عشوائية غير
 *   قابلة للاستعمال (لا يحتاجها — الدخول عبر Google، ويمكنه تعيين كلمة مرور
 *   لاحقاً من الإعدادات).
 */
async function findOrCreateGoogleUser(
  profile: {
    googleId: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    avatar?: string;
  },
  registration?: z.infer<typeof googleRegistrationSchema>
) {
  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (user) {
    if (user.status === 'archived' || user.status === 'inactive')
      return { kind: 'disabled' as const };
    if (!user.emailVerifiedAt && user.email.toLowerCase() === profile.email.toLowerCase()) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
    if (user.status !== 'active' || !user.isApprovedByAdmin) {
      return { kind: 'pending' as const, user };
    }
    return { kind: 'ok' as const, user, created: false };
  }
  const sameEmail = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
  if (sameEmail)
    return sameEmail.googleId
      ? { kind: 'identity_conflict' as const }
      : { kind: 'link_required' as const };
  if (!registration || !GOOGLE_SELF_REGISTER_ROLES.has(registration.role))
    return { kind: 'registration_required' as const };
  const directorate = await prisma.directorate.findUnique({
    where: { id: registration.eduDirectorateId },
  });
  const district = await prisma.inspectionDistrict.findUnique({
    where: { id: registration.eduDistrictId },
  });
  if (!directorate || !district || district.directorateId !== directorate.id)
    return { kind: 'invalid_geography' as const };
  const role = registration.role;
  const passwordHash = await hashPassword(crypto.randomBytes(24).toString('hex')); // غير قابلة للاستعمال إطلاقاً
  const spexId = `SPX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const platformEmail = await createPlatformEmail(profile.firstName, profile.lastName);

  let created;
  try {
    created = await prisma.user.create({
      data: {
        id: `usr_${crypto.randomUUID()}`,
        username: `user_${Date.now().toString().slice(-6)}`,
        spexId,
        firstName: profile.firstName || 'مستخدم',
        lastName: profile.lastName || 'جديد',
        email: profile.email,
        googleId: profile.googleId,
        platformEmail,
        passwordHash,
        role,
        directorateId: directorate.id,
        districtId: district.id,
        eduDirectorateId: directorate.id,
        eduDistrictId: district.id,
        avatar: profile.avatar || null,
        phone: null,
        schoolName: null,
        municipality: null,
        institutionId: null,
        specialization:
          role === 'teacher'
            ? 'أستاذ التربية البدنية والرياضية - الطور الابتدائي'
            : role === 'inspector'
              ? 'مفتش التربية البدنية والرياضية'
              : 'مدير مدرسة ابتدائية',
        yearsExperience: null,
        status: 'pending_approval',
        isApprovedByAdmin: false,
        emailVerifiedAt: new Date(),
        customApiKey: '',
        apiKeyStatus: 'not_set',
      },
    });
  } catch (error) {
    if ((error as { code?: string })?.code !== 'P2002') throw error;
    const linked = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (linked)
      return linked.status !== 'active' || !linked.isApprovedByAdmin
        ? { kind: 'pending' as const, user: linked }
        : { kind: 'ok' as const, user: linked, created: false };
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
    return byEmail?.googleId
      ? { kind: 'identity_conflict' as const }
      : { kind: 'link_required' as const };
  }

  return { kind: 'pending' as const, user: created, created: true };
}

authRouter.post('/google', async (req, res) => {
  if (!isGoogleSignInConfigured()) {
    return res
      .status(503)
      .json({ error: 'تسجيل الدخول عبر Google غير مفعّل حالياً على هذه المنصة.' });
  }

  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'طلب دخول غير صالح عبر Google.' });
  }

  const profile = await verifyGoogleIdToken(parsed.data.credential);
  if (!profile) {
    return res.status(401).json({ error: 'تعذر التحقق من حساب Google. يرجى إعادة المحاولة.' });
  }
  if (!profile.emailVerified) {
    return res
      .status(401)
      .json({ error: 'يجب أن يكون بريد حساب Google موثّقاً (verified) لاستخدامه في الدخول.' });
  }

  const outcome = await findOrCreateGoogleUser(profile, parsed.data.registration);
  if (outcome.kind === 'registration_required') {
    return res
      .status(400)
      .json({
        error: 'لإنشاء حساب جديد عبر Google، اختر الدور والمديرية والمقاطعة من نموذج التسجيل.',
      });
  }
  if (outcome.kind === 'invalid_geography')
    return res.status(400).json({ error: 'مديرية التربية أو المقاطعة التفتيشية غير صحيحة.' });
  if (outcome.kind === 'link_required') {
    return res
      .status(409)
      .json({
        code: 'GOOGLE_LINK_REQUIRED',
        error: 'يوجد حساب بهذا البريد. سجّل الدخول إليه أولاً ثم اربط Google من إعدادات الحساب.',
      });
  }
  if (outcome.kind === 'identity_conflict')
    return res
      .status(409)
      .json({ error: 'تعذر ربط هوية Google بهذا الحساب. تواصل مع إدارة المنصة.' });

  // Google identity is verified, but operational access still requires Admin approval.
  if (outcome.kind === 'disabled')
    return res
      .status(403)
      .json({
        error: 'الحساب معطل أو مؤرشف ولا يمكن تسجيل الدخول إليه.',
        code: 'ACCOUNT_DISABLED',
        disabled: true,
      });
  if (outcome.kind === 'pending') {
    const user = outcome.user;
    const token = signSession({ userId: user.id, role: user.role });
    setSessionCookie(res, token);
    return res.json({
      success: true,
      pending: true,
      message: 'حسابك قيد انتظار موافقة الإدارة — تم الدخول لوضع المشاهدة.',
      user: sanitizeOwnUser(user),
    });
  }

  const { user, created } = outcome;
  const token = signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);

  res.json({
    success: true,
    // created=true تعني: حساب جديد في وضع المشاهدة بانتظار تفعيل المشرف
    created,
    user: sanitizeOwnUser(user),
  });
});

// ربط حساب Google بحساب مسجّل الدخول حالياً (من صفحة الإعدادات، بدلاً من شاشة الدخول)
authRouter.post('/google/link', requireAuth, async (req, res) => {
  if (!isGoogleSignInConfigured()) {
    return res
      .status(503)
      .json({ error: 'تسجيل الدخول عبر Google غير مفعّل حالياً على هذه المنصة.' });
  }

  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'طلب ربط غير صالح.' });
  }

  const profile = await verifyGoogleIdToken(parsed.data.credential);
  if (!profile) {
    return res.status(401).json({ error: 'تعذر التحقق من حساب Google. يرجى إعادة المحاولة.' });
  }
  if (!profile.emailVerified) {
    return res
      .status(401)
      .json({ error: 'يجب أن يكون بريد حساب Google موثّقاً (verified) لربطه بحسابك.' });
  }

  const existing = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (existing && existing.id !== req.user!.id) {
    return res.status(409).json({ error: 'حساب Google هذا مرتبط بالفعل بحساب SPEX آخر.' });
  }

  const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (me && me.email.toLowerCase() !== profile.email.toLowerCase()) {
    return res.status(400).json({
      error: 'يجب أن يطابق بريد حساب Google بريد حسابك الحالي على SPEX لربطهما.',
    });
  }
  if (!me?.emailVerifiedAt)
    return res.status(403).json({ error: 'تحقق من بريد حساب SPEX قبل ربط Google.' });
  if (me.googleId === profile.googleId)
    return res.json({ success: true, user: sanitizeOwnUser(me) });
  try {
    const linked = await prisma.user.updateMany({
      where: { id: req.user!.id, googleId: null },
      data: { googleId: profile.googleId },
    });
    if (linked.count !== 1)
      return res.status(409).json({ error: 'تغير ارتباط الحساب بالتزامن. أعد المحاولة.' });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002')
      return res.status(409).json({ error: 'حساب Google هذا مرتبط بالفعل بحساب SPEX آخر.' });
    throw error;
  }
  const updated = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ success: true, user: sanitizeOwnUser(updated) });
});

// ---------------------------------------------------------------------------
// مسار العودة الاحتياطي (login_uri) لـ Google Identity Services:
// عندما تمنع المتصفحات كوكيز الطرف الثالث، يتحول زر Google إلى نموذج يُرسَل عبر
// accounts.google.com/gsi/transform ثم يعود POST إلى هنا حاملاً credential
// و g_csrf_token (نموذج urlencoded). نتحقق من مطابقة رمز CSRF إن وُجد (متساهل عند الحجب)
// ثم نكمل نفس منطق الدخول، ونعيد صفحة HTML تقوم بالتوجيه بدلاً من redirect صامت
// لتفادي صفحة بيضاء في https://accounts.google.com/gsi/transform
// ---------------------------------------------------------------------------
authRouter.post('/google/gsi-callback', urlencoded({ extended: false }), async (req, res) => {
  const fail = (message: string) => {
    // نرجع صفحة HTML بسيطة تقوم بالتوجيه إلى /login مع رسالة الخطأ بدلاً من redirect مجرد
    // حتى لا تبقى صفحة gsi/transform بيضاء إن فشل fetch
    const encoded = encodeURIComponent(message);
    return res.status(200).send(`
      <!doctype html>
      <html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>خطأ دخول Google</title></head>
      <body><script>window.location.href="/login?google_error=${encoded}";</script>
      <p>حدث خطأ: ${message} — <a href="/login?google_error=${encoded}">العودة لتسجيل الدخول</a></p></body></html>
    `);
  };

  try {
    if (!isGoogleSignInConfigured()) {
      return fail('تسجيل الدخول عبر Google غير مفعّل حالياً على هذه المنصة.');
    }

    // حماية CSRF متساهلة: إن كانت كوكيز الطرف الثالث محجوبة، لن تصل g_csrf_token ككوكي
    // فنسمح بالمرور إن وُجد الرمز في الجسم فقط، ونرفض فقط عند وجود تناقض صريح بين الكوكي والجسم
    const cookieToken = req.cookies?.g_csrf_token;
    const bodyToken = req.body?.g_csrf_token;
    if (cookieToken && bodyToken && cookieToken !== bodyToken) {
      return fail('فشل التحقق من أمان الطلب (CSRF). أعد المحاولة.');
    }

    const credential = req.body?.credential;
    if (!credential || typeof credential !== 'string' || credential.length < 10) {
      return fail('رمز هوية Google مفقود أو غير صالح.');
    }

    const profile = await verifyGoogleIdToken(credential);
    if (!profile) {
      return fail('تعذر التحقق من حساب Google. يرجى إعادة المحاولة.');
    }
    if (!profile.emailVerified) {
      return fail('يجب أن يكون بريد حساب Google موثّقاً (verified).');
    }

    let outcome;
    try {
      outcome = await findOrCreateGoogleUser(profile);
    } catch (err) {
      console.error('خطأ أثناء البحث/الإنشاء (gsi-callback):', err);
      return fail('تعذر إتمام الدخول الآن. أعد المحاولة بعد قليل.');
    }

    if (outcome.kind === 'registration_required' || outcome.kind === 'invalid_geography')
      return fail('اختر إنشاء حساب وحدد الدور والمديرية والمقاطعة من صفحة التسجيل.');
    if (outcome.kind === 'link_required')
      return fail(
        'يوجد حساب بهذا البريد. سجّل الدخول إليه أولاً ثم اربط Google من إعدادات الحساب.'
      );
    if (outcome.kind === 'identity_conflict')
      return fail('تعذر ربط هوية Google بهذا الحساب. تواصل مع إدارة المنصة.');
    if (outcome.kind === 'disabled')
      return fail('الحساب معطل أو مؤرشف ولا يمكن تسجيل الدخول إليه.');

    // أي مستخدم (حتى المعلق) يستطيع الدخول عبر Google مباشرة إلى وضع المشاهدة
    const user = outcome.user;
    const target =
      user.role === 'inspector' ? '/inspector' : user.role === 'admin' ? '/admin' : '/dashboard';
    const token = signSession({ userId: user.id, role: user.role });
    // للمسار القادم من accounts.google.com (cross-site)، نحتاج SameSite=None لضمان حفظ الكوكي
    // نضبط الكوكي يدوياً هنا بـ SameSite=None; Secure ليتجاوز حجب الطرف الثالث
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('spex_session', token, {
      httpOnly: true,
      secure: isProd ? true : false,
      sameSite: 'none' as any,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    } as any);

    // نرجع HTML يقوم بالتوجيه top-level بدلاً من redirect فقط لتفادي بقاء transform فارغة
    return res.status(200).send(`
      <!doctype html>
      <html><head><meta charset="utf-8"><title>جارٍ التوجيه...</title>
      <meta http-equiv="refresh" content="0;url=${target}">
      </head><body>
      <script>try{window.top.location.href="${target}";}catch(e){window.location.href="${target}";}</script>
      <p>جارٍ التوجيه إلى لوحة التحكم... <a href="${target}">اضغط هنا إن لم يتم التوجيه تلقائياً</a></p>
      </body></html>
    `);
  } catch (err) {
    console.error('خطأ في مسار Google gsi-callback:', err);
    return fail('حدث خطأ غير متوقع أثناء الدخول عبر Google.');
  }
});

authRouter.post('/google/unlink', requireAuth, async (req, res) => {
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { googleId: null },
  });
  res.json({ success: true, user: sanitizeOwnUser(updated) });
});

// -----------------------------------------------------------------------
// One-time Admin Bootstrap
// لإنشاء أول حساب مشرف بدون الحاجة لوصول Shell/CLI (بعض منصات الاستضافة المجانية
// لا توفره). يعمل هذا المسار مرة واحدة فقط: يرفض العمل إن كان هناك مشرف واحد
// على الأقل موجود مسبقاً في قاعدة البيانات، ويتطلب أيضاً معرفة SETUP_SECRET
// (متغير بيئة سرّي تضبطه أنت) — وليس مجرد معرفة رابط المسار.
// -----------------------------------------------------------------------
const bootstrapSchema = z.object({
  setupSecret: z.string().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  directorateId: z.string().optional().default(''),
  districtId: z.string().optional().default(''),
});

authRouter.post('/bootstrap-admin', async (req, res) => {
  const configuredSecret = process.env.SETUP_SECRET;
  if (!configuredSecret) {
    return res.status(403).json({
      error: 'ميزة الإنشاء الأولي غير مفعّلة (SETUP_SECRET غير معرّف في متغيرات البيئة).',
    });
  }

  const parsed = bootstrapSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }

  if (parsed.data.setupSecret !== configuredSecret) {
    return res.status(403).json({ error: 'الرمز السرّي غير صحيح.' });
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (existingAdmin) {
    return res.status(403).json({
      error:
        'يوجد حساب مشرف بالفعل. هذا المسار يعمل مرة واحدة فقط لأول إنشاء (بما في ذلك حساب SUPER_ADMIN إن كان قد أُنشئ تلقائياً عبر seed).',
    });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // معرّف عشوائي قوي (وليس Math.random) لتفادي أي تصادم على قيد spexId الفريد
  const spexId = `SPX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  try {
    const admin = await prisma.user.create({
      data: {
        id: `usr_admin_${Date.now()}`,
        username: 'admin',
        spexId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: 'admin',
        isPlatformOwner: true,
        directorateId: parsed.data.directorateId,
        districtId: parsed.data.districtId,
        status: 'active',
        isApprovedByAdmin: true,
      },
    });

    res.json({ success: true, message: `تم إنشاء حساب المشرف بنجاح: ${admin.email}` });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return res.status(409).json({ error: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل.' });
    }
    console.error('Error creating bootstrap admin:', err);
    res.status(500).json({ error: 'تعذر إنشاء حساب المشرف.' });
  }
});

authRouter.get('/me', async (req, res) => {
  const token = getSessionTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'لا توجد جلسة نشطة.', code: 'ACCOUNT_GONE' });

  const payload = verifySession(token);
  if (!payload) return res.status(401).json({ error: 'الجلسة غير صالحة.', code: 'ACCOUNT_GONE' });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'الحساب غير موجود.', code: 'ACCOUNT_GONE' });
  }

  if (user.status === 'archived') {
    clearSessionCookie(res);
    return res
      .status(401)
      .json({ error: 'الحساب مؤرشف.', code: 'ACCOUNT_ARCHIVED', disabled: true });
  }

  if (user.role !== 'admin' && !user.emailVerifiedAt) {
    clearSessionCookie(res);
    return res
      .status(403)
      .json({
        error: 'تحقق من بريدك الإلكتروني قبل استخدام الحساب.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
      });
  }

  // PART C/C3: إذا كان الحساب معطلاً ⇒ كيان الخادم (inactive) ⇒ يقفل إلى وضع المشاهدة
  // نعيد {disabled:true, user} مع كود ACCOUNT_DISABLED
  if (user.status === 'inactive') {
    return res.status(401).json({
      error: 'الحساب معطّل من طرف الإدارة.',
      code: 'ACCOUNT_DISABLED',
      disabled: true,
      user: sanitizeOwnUser(user),
    });
  }

  res.json({ success: true, user: sanitizeOwnUser(user) });
});

// -----------------------------------------------------------------------
// Forgot / Reset Password
// -----------------------------------------------------------------------

const forgotSchema = z.object({ email: z.string().trim().email() });

authRouter.post('/forgot-password', async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح.' });
  }

  // رسالة واحدة موحدة سواء كان البريد مسجلاً أم لا، لتفادي تسريب معلومة وجود الحساب من عدمه
  const genericResponse = {
    success: true,
    message:
      'إن كان هذا البريد الإلكتروني مسجلاً لدينا، فسيصلك رابط إعادة تعيين كلمة المرور خلال دقائق.',
  };

  const normalizedEmail = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { platformEmail: normalizedEmail }] },
  });
  if (!user || user.status === 'inactive') {
    return res.json(genericResponse);
  }

  const { rawToken, tokenHash, expiresAt } = generateResetToken();

  // إبطال أي رموز سابقة غير مستخدمة لهذا المستخدم قبل إنشاء رمز جديد
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const result = await sendPasswordResetEmail(user.email, user.firstName, rawToken);
  if (!result.sent) {
    // لا نُفشل الطلب على العميل حتى لا نكشف حالة الخادم الداخلية، لكن نسجّل الخطأ للمشرف
    console.error(`فشل إرسال بريد إعادة التعيين إلى ${user.email}: ${result.error}`);
  }

  res.json(genericResponse);
});

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

authRouter.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const { token, newPassword } = parsed.data;
  const tokenHash = hashResetToken(token);

  const resetRecord = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    return res
      .status(400)
      .json({ error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.' });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بها.' });
});
