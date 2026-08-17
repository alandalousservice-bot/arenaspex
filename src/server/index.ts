/**
 * SPEX - Production Server Entry Point
 * خادم الإنتاج: يقدّم الواجهة المبنية (dist) + واجهة API محمية، مع رؤوس أمان وتحديد معدل الطلبات
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { installProcessSafetyNet } from './processSafety.js';

// تُثبَّت قبل أي شيء آخر، ثم تُستورد الراوترات ديناميكياً لاحقاً —
// لأن استيرادات ESM الثابتة تُقيَّم كلها قبل تنفيذ جسم هذا الملف، فلو انفجر خطأ
// أثناء تهيئة وحدة مستوردة بشكل ثابت (كتحميل محرك Prisma) لسقط الخادم دون أي تغطية.
installProcessSafetyNet();

const { apiRouter } = await import('./apiRouter.js');
const { authRouter } = await import('./authRouter.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1); // خلف بروكسي Railway/Render (لأجل secure cookies و rate limiting الصحيح)

app.use(
  helmet({
    contentSecurityPolicy: false // يُفعَّل لاحقاً بعد ضبط مصادر السكربتات والخطوط بدقة لتفادي كسر الواجهة
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

// تحديد معدل الطلبات على تسجيل الدخول لمنع محاولات التخمين الآلية لكلمات المرور
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات دخول كثيرة جداً، يرجى المحاولة بعد قليل.' }
});
app.use('/api/auth/login', loginLimiter);

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً لإعادة تعيين كلمة المرور، يرجى المحاولة بعد قليل.' }
});
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

const bootstrapLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة جداً، يرجى المحاولة بعد قليل.' }
});
app.use('/api/auth/bootstrap-admin', bootstrapLimiter);

// تحديد عام أخف لبقية الـ API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// تقديم الواجهة الأمامية المبنية (نتاج vite build)
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// معالج أخطاء عام في آخر السلسلة — لا نسرّب تفاصيل الخطأ الداخلي للعميل
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم.' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SPEX server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
