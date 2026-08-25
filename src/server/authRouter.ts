/**
 * SPEX - Authentication Router
 * تسجيل الدخول الحقيقي (bcrypt + JWT في كوكيز httpOnly)، بدل التحقق من كلمة المرور في المتصفح
 */
import { Router, urlencoded } from 'express';
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
import { sendPasswordResetEmail } from './emailService.js';
import { requireAuth } from './middleware/requireAuth.js';
import { verifyGoogleIdToken, isGoogleSignInConfigured } from './googleAuth.js';

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
  // Public registration is always a pending Teacher; Inspector provisioning is Admin-only.
  role: z.enum(['teacher', 'inspector']).optional().default('teacher'),
  schoolName: z.string().optional(),
  municipality: z.string().optional(),
  phone: z.string().optional(),
  // PART A: هيكلية جغرافية وطنية + تسجيل بالقوائم المتراكبة
  eduDirectorateId: z.string().trim().optional(),
  eduDistrictId: z.string().trim().optional(),
  eduSchoolId: z.string().trim().optional(),
  municipalityId: z.string().trim().optional(),
});

function remapHistoricDirectorateId(id?: string | null): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (trimmed === 'de_19' || trimmed === 'de_19'.toLowerCase()) return 'setif_de';
  // also handle de_19 variations like de_19 padded? already
  return trimmed;
}

authRouter.post('/register', async (req, res) => {
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
    schoolName,
    municipality,
    phone,
    eduDirectorateId,
    eduDistrictId,
    eduSchoolId,
    municipalityId,
  } = parsed.data;
  const role = 'teacher';
  const lowerEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email: lowerEmail } });
  if (existingUser) {
    return res
      .status(409)
      .json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً في المنظومة. يمكنك تسجيل الدخول به.' });
  }

  const passwordHash = await hashPassword(password);
  const spexId = `SPX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const userId = `usr_${crypto.randomUUID()}`;

  // ترمية الأكواد التاريخية de_19→setif_de
  const normalizedEduDir = remapHistoricDirectorateId(eduDirectorateId || null);
  const normalizedLegacyDir = normalizedEduDir || '';

  try {
    const user = await prisma.user.create({
      data: {
        id: userId,
        username: `user_${Date.now().toString().slice(-6)}`,
        spexId,
        firstName,
        lastName,
        email: lowerEmail,
        passwordHash,
        role,
        phone: phone || null,
        schoolName: schoolName || null,
        municipality: municipality || null,
        directorateId: normalizedLegacyDir,
        districtId: eduDistrictId || '',
        institutionId: eduSchoolId || null,
        municipalityId: municipalityId || null,
        eduDirectorateId: normalizedEduDir,
        eduDistrictId: null,
        eduSchoolId: null,
        specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
        yearsExperience: null,
        status: 'pending_approval',
        isApprovedByAdmin: false,
        customApiKey: '',
        apiKeyStatus: 'not_set',
      } as any,
    });

    const token = signSession({ userId: user.id, role: user.role });
    setSessionCookie(res, token);

    res.json({ success: true, user: sanitizeOwnUser(user) });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'تعذر إنشاء الحساب، يرجى إعادة المحاولة.' });
  }
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور.' });
  }
  const { email, password, portal } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  const genericError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';

  if (!user) {
    return res.status(401).json({ error: genericError });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: genericError });
  }

  if (portal === 'admin' && user.role !== 'admin') {
    return res
      .status(403)
      .json({
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
    return res.status(403).json({
      error: 'حسابك قيد انتظار موافقة الإدارة أو غير مفعّل حالياً.',
      code: 'ACCOUNT_PENDING_APPROVAL',
      user: sanitizeOwnUser(user),
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
// البريد تُربَط تلقائياً وتدخل بصلاحياتها الحقيقية.
// -----------------------------------------------------------------------
const googleAuthSchema = z.object({
  credential: z.string().min(10), // Google ID token (JWT) القادم من Google Identity Services
  // دور ذاتي الاختيار عند الإنشاء الأول — أبداً "admin" من هنا (الإدارة للمشرف)
  role: z.enum(['teacher', 'inspector', 'director', 'admin']).optional(),
});

const GOOGLE_SELF_REGISTER_ROLES = new Set(['teacher']);

/**
 * منطق Google الموحّد (يخدم مسارَي /google و /google/gsi-callback):
 * - حساب مربوط بـ googleId: دخول مباشر (بعد فحص التفعيل).
 * - حساب موجود بنفس البريد بلا ربط: ربط تلقائي ثم دخول (بعد فحص التفعيل).
 * - لا حساب إطلاقاً: إنشاء حساب جديد فوراً بوضع "بانتظار تفعيل المشرف"
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
  requestedRole?: string
) {
  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
  }

  if (user) {
    if (user.role === 'admin' && requestedRole !== 'admin') {
      return { kind: 'forbidden' as const };
    }
    // ربط Google تلقائياً حتى للحسابات المعلقة — يسمح بالدخول المباشر عبر Google لأي بريد
    if (!user.googleId) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.googleId },
        });
      } catch (err) {
        console.error('تعذر ربط حساب Google تلقائياً:', err);
      }
    }
    if (user.status !== 'active' || !user.isApprovedByAdmin) {
      return { kind: 'pending' as const, user };
    }
    return { kind: 'ok' as const, user, created: false };
  }

  // The admin context is login-only: an unknown Google identity must never
  // be converted into a new account from that card.
  if (requestedRole === 'admin') {
    return { kind: 'forbidden' as const };
  }

  // إنشاء أول للحساب عبر Google — معتمد للأدوار البيداغوجية فقط وبانتظار تفعيل المشرف
  const role =
    requestedRole && GOOGLE_SELF_REGISTER_ROLES.has(requestedRole) ? requestedRole : 'teacher';
  const passwordHash = await hashPassword(crypto.randomBytes(24).toString('hex')); // غير قابلة للاستعمال إطلاقاً
  const spexId = `SPX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const created = await prisma.user.create({
    data: {
      id: `usr_${crypto.randomUUID()}`,
      username: `user_${Date.now().toString().slice(-6)}`,
      spexId,
      firstName: profile.firstName || 'مستخدم',
      lastName: profile.lastName || 'جديد',
      email: profile.email,
      passwordHash,
      role,
      avatar: profile.avatar || null,
      phone: null,
      schoolName: null,
      municipality: null,
      directorateId: '',
      districtId: '',
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
      customApiKey: '',
      apiKeyStatus: 'not_set',
    },
  });

  return { kind: 'ok' as const, user: created, created: true };
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

  const outcome = await findOrCreateGoogleUser(profile, parsed.data.role);

  if (outcome.kind === 'forbidden') {
    return res
      .status(403)
      .json({ error: 'حساب Google غير مرتبط بحساب مشرف موجود. اطلب إنشاء الحساب من مالك المنصة.' });
  }

  // السماح لأي مستخدم بالتسجيل مباشرة عبر Google — حتى الحساب المعلق يدخل لوضع المشاهدة بدل 403
  // (فرق واضح بين تسجيل الدخول العادي الذي يرفض المعلق، وبين Google الذي يُعتبر تسجيلاً مباشراً)
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
  if (me && me.email.toLowerCase() !== profile.email) {
    return res.status(400).json({
      error: 'يجب أن يطابق بريد حساب Google بريد حسابك الحالي على SPEX لربطهما.',
    });
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { googleId: profile.googleId },
  });
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

    // أي مستخدم (حتى المعلق) يستطيع الدخول عبر Google مباشرة إلى وضع المشاهدة
    const user = outcome.user;
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
      <meta http-equiv="refresh" content="0;url=/dashboard">
      </head><body>
      <script>try{window.top.location.href="/dashboard";}catch(e){window.location.href="/dashboard";}</script>
      <p>جارٍ التوجيه إلى لوحة التحكم... <a href="/dashboard">اضغط هنا إن لم يتم التوجيه تلقائياً</a></p>
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

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
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
