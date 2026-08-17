/**
 * SPEX - Authentication Router
 * تسجيل الدخول الحقيقي (bcrypt + JWT في كوكيز httpOnly)، بدل التحقق من كلمة المرور في المتصفح
 */
import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from './prismaClient.js';
import {
  verifyPassword,
  hashPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  sanitizeUser,
  getSessionTokenFromRequest,
  verifySession,
  generateResetToken,
  hashResetToken
} from './auth.js';
import { sendPasswordResetEmail } from './emailService.js';
import { wrapRouterAsyncErrors } from './middleware/asyncHandler.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور.' });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // رسالة خطأ عامة موحدة سواء كان البريد غير موجود أو كلمة المرور خاطئة
  // (لتفادي تسريب معلومة "هل هذا البريد مسجل؟" لمهاجم محتمل)
  const genericError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو لم يُنشأ لك حساب بعد من طرف المشرف.';

  if (!user) {
    return res.status(401).json({ error: genericError });
  }

  if (user.isApprovedByAdmin === false || user.status === 'inactive') {
    return res.status(403).json({
      error: '⛔ حسابك قيد التفعيل أو لم يتم اعتماده من طرف مشرف المنظومة الرقمية بعد.'
    });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: genericError });
  }

  const token = signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);

  res.json({ success: true, user: sanitizeUser(user) });
});

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
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
  } catch (err: any) {
    if (err.code === 'P2002') {
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
  if (!user || user.status === 'inactive') {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'الحساب غير موجود أو معطّل.' });
  }

  res.json({ success: true, user: sanitizeUser(user) });
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

// التقاط أخطاء الوعود المرفوضة من معالجات async وتحويلها إلى معالج الأخطاء بدل إسقاط العملية
wrapRouterAsyncErrors(authRouter);
