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
  hashResetToken
} from './auth.js';
import { sendPasswordResetEmail } from './emailService.js';
import { requireAuth } from './middleware/requireAuth.js';
import { verifyGoogleIdToken, isGoogleSignInConfigured } from './googleAuth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل'),
  lastName: z.string().trim().min(2, 'اللقب يجب أن يكون حرفين على الأقل'),
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  schoolName: z.string().optional(),
  municipality: z.string().optional(),
  phone: z.string().optional()
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }

  const { firstName, lastName, email, password, schoolName, municipality, phone } = parsed.data;
  const role = 'teacher';
  const lowerEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email: lowerEmail } });
  if (existingUser) {
    return res.status(409).json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً في المنظومة. يمكنك تسجيل الدخول به.' });
  }

  const passwordHash = await hashPassword(password);
  const spexId = `SPX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const userId = `usr_${crypto.randomUUID()}`;

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
        directorateId: '',
        districtId: '',
        institutionId: null,
        specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
        yearsExperience: null,
        status: 'pending_approval',
        isApprovedByAdmin: false,
        customApiKey: '',
        apiKeyStatus: 'not_set'
      }
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
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  const genericError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';

  if (!user) {
    return res.status(401).json({ error: genericError });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: genericError });
  }

  if (user.status !== 'active' || !user.isApprovedByAdmin) {
    return res.status(403).json({
      error: 'حسابك قيد انتظار موافقة الإدارة أو غير مفعّل حالياً.',
      code: 'ACCOUNT_PENDING_APPROVAL',
      user: sanitizeOwnUser(user)
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
// Sign in with Google — سياسة المنصة: الإنشاء الذاتي مسموح للأدوار البيداغوجية
// (أستاذ/مفتش/مدير): أي بريد Google موثّق ينشئ حساباً فورياً بوضع المشاهدة
// (pending_approval) والمشرف يفعّله لاحقاً من بوابته. الحسابات الموجودة بنفس
// البريد تُربَط تلقائياً وتدخل بصلاحياتها الحقيقية.
// -----------------------------------------------------------------------
const googleAuthSchema = z.object({
  credential: z.string().min(10), // Google ID token (JWT) القادم من Google Identity Services
  // دور ذاتي الاختيار عند الإنشاء الأول — أبداً "admin" من هنا (الإدارة للمشرف)
  role: z.enum(['teacher', 'inspector', 'director']).optional()
});

const GOOGLE_SELF_REGISTER_ROLES = new Set(['teacher', 'inspector', 'director']);

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
  profile: { googleId: string; email: string; emailVerified: boolean; firstName: string; lastName: string; avatar?: string },
  requestedRole?: string
) {
  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
  }

  if (user) {
    if (user.status !== 'active' || !user.isApprovedByAdmin) {
      return { kind: 'pending' as const, user };
    }
    if (!user.googleId) {
      try {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.googleId } });
      } catch (err) {
        console.error('تعذر ربط حساب Google تلقائياً:', err);
      }
    }
    return { kind: 'ok' as const, user, created: false };
  }

  // إنشاء أول للحساب عبر Google — معتمد للأدوار البيداغوجية فقط وبانتظار تفعيل المشرف
  const role = requestedRole && GOOGLE_SELF_REGISTER_ROLES.has(requestedRole) ? requestedRole : 'teacher';
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
      apiKeyStatus: 'not_set'
    }
  });

  return { kind: 'ok' as const, user: created, created: true };
}

authRouter.post('/google', async (req, res) => {
  if (!isGoogleSignInConfigured()) {
    return res.status(503).json({ error: 'تسجيل الدخول عبر Google غير مفعّل حالياً على هذه المنصة.' });
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
    return res.status(401).json({ error: 'يجب أن يكون بريد حساب Google موثّقاً (verified) لاستخدامه في الدخول.' });
  }

  const outcome = await findOrCreateGoogleUser(profile, parsed.data.role);

  if (outcome.kind === 'pending') {
    return res.status(403).json({
      error: 'حسابك قيد انتظار موافقة الإدارة أو غير مفعّل حالياً.',
      code: 'ACCOUNT_PENDING_APPROVAL',
      user: sanitizeOwnUser(outcome.user)
    });
  }

  const { user, created } = outcome;
  const token = signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);

  res.json({
    success: true,
    // created=true تعني: حساب جديد في وضع المشاهدة بانتظار تفعيل المشرف
    created,
    user: sanitizeOwnUser(user)
  });
});

// ربط حساب Google بحساب مسجّل الدخول حالياً (من صفحة الإعدادات، بدلاً من شاشة الدخول)
authRouter.post('/google/link', requireAuth, async (req, res) => {
  if (!isGoogleSignInConfigured()) {
    return res.status(503).json({ error: 'تسجيل الدخول عبر Google غير مفعّل حالياً على هذه المنصة.' });
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
    return res.status(401).json({ error: 'يجب أن يكون بريد حساب Google موثّقاً (verified) لربطه بحسابك.' });
  }

  const existing = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (existing && existing.id !== req.user!.id) {
    return res.status(409).json({ error: 'حساب Google هذا مرتبط بالفعل بحساب SPEX آخر.' });
  }

  const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (me && me.email.toLowerCase() !== profile.email) {
    return res.status(400).json({
      error: 'يجب أن يطابق بريد حساب Google بريد حسابك الحالي على SPEX لربطهما.'
    });
  }

  const updated = await prisma.user.update({ where: { id: req.user!.id }, data: { googleId: profile.googleId } });
  res.json({ success: true, user: sanitizeOwnUser(updated) });
});

// ---------------------------------------------------------------------------
// مسار العودة الاحتياطي (login_uri) لـ Google Identity Services:
// عندما تمنع المتصفحات كوكيز الطرف الثالث، يتحول زر Google إلى نموذج يُرسَل عبر
// accounts.google.com/gsi/transform ثم يعود POST إلى هنا حاملاً credential
// و g_csrf_token (نموذج urlencoded) — نتحقق من مطابقة رمز CSRF (كوكي/جسم) ثم
// نكمل نفس منطق الدخول، ونعيد التوجيه إلى واجهة المنصة.
// ---------------------------------------------------------------------------
authRouter.post('/google/gsi-callback', urlencoded({ extended: false }), async (req, res) => {
  const fail = (message: string) => res.redirect(`/login?google_error=${encodeURIComponent(message)}`);

  try {
    if (!isGoogleSignInConfigured()) {
      return fail('تسجيل الدخول عبر Google غير مفعّل حالياً على هذه المنصة.');
    }

    // حماية CSRF الخاصة بمسار GSI: الرمز في الكوكي يجب أن يطابق رمز جسم الطلب
    const cookieToken = req.cookies?.g_csrf_token;
    const bodyToken = req.body?.g_csrf_token;
    if (!cookieToken || !bodyToken || cookieToken !== bodyToken) {
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

    if (outcome.kind === 'pending') {
      return fail('حسابك قيد انتظار موافقة الإدارة أو غير مفعّل حالياً.');
    }

    const user = outcome.user;
    const token = signSession({ userId: user.id, role: user.role });
    setSessionCookie(res, token);
    // الحساب الجديد يدخل فوراً على وضع المشاهدة (بوابة التفعيل تظهر له آلياً)
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('خطأ في مسار Google gsi-callback:', err);
    return fail('حدث خطأ غير متوقع أثناء الدخول عبر Google.');
  }
});

authRouter.post('/google/unlink', requireAuth, async (req, res) => {
  const updated = await prisma.user.update({ where: { id: req.user!.id }, data: { googleId: null } });
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
  directorateId: z.string().min(1).default('setif_de'),
  districtId: z.string().min(1).default('dist_setif_7')
});

authRouter.post('/bootstrap-admin', async (req, res) => {
  const configuredSecret = process.env.SETUP_SECRET;
  if (!configuredSecret) {
    return res.status(403).json({ error: 'ميزة الإنشاء الأولي غير مفعّلة (SETUP_SECRET غير معرّف في متغيرات البيئة).' });
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
    return res.status(403).json({ error: 'يوجد حساب مشرف بالفعل. هذا المسار يعمل مرة واحدة فقط لأول إنشاء (بما في ذلك حساب SUPER_ADMIN إن كان قد أُنشئ تلقائياً عبر seed).' });
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
        directorateId: parsed.data.directorateId,
        districtId: parsed.data.districtId,
        status: 'active',
        isApprovedByAdmin: true
      }
    });

    res.json({ success: true, message: `تم إنشاء حساب المشرف بنجاح: ${admin.email}` });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
      return res.status(409).json({ error: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل.' });
    }
    console.error('Error creating bootstrap admin:', err);
    res.status(500).json({ error: 'تعذر إنشاء حساب المشرف.' });
  }
});

authRouter.get('/me', async (req, res) => {
  const token = getSessionTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'لا توجد جلسة نشطة.' });

  const payload = verifySession(token);
  if (!payload) return res.status(401).json({ error: 'الجلسة غير صالحة.' });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'الحساب غير موجود.' });
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
    message: 'إن كان هذا البريد الإلكتروني مسجلاً لدينا، فسيصلك رابط إعادة تعيين كلمة المرور خلال دقائق.'
  };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || user.status === 'inactive') {
    return res.json(genericResponse);
  }

  const { rawToken, tokenHash, expiresAt } = generateResetToken();

  // إبطال أي رموز سابقة غير مستخدمة لهذا المستخدم قبل إنشاء رمز جديد
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt }
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
  newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
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
    return res.status(400).json({ error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.' });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } })
  ]);

  res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بها.' });
});
