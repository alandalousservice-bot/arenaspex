/**
 * SPEX - Unified Server Entry Point
 * خادم موحّد للإنتاج والتطوير: يدمج Express + Vite Middleware مع حماية وأداء عالٍ
 */
import 'dotenv/config';
import path from 'path';
import express from 'express';
// يحوّل أي رفض (rejection) من معالجات Express غير المتزامنة إلى معالج الأخطاء
// العام بدل إسقاط عملية الخادم بأكملها (مشكلة معروفة في Express 4).
import 'express-async-errors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';

import { apiRouter } from './src/server/apiRouter.js';
import { authRouter } from './src/server/authRouter.js';
import { assignmentRouter } from './src/server/assignmentRouter.js';
import { geoRouter } from './src/server/geoRouter.js';
import { requireAuth } from './src/server/middleware/requireAuth.js';

// شبكة أمان أخيرة: انقطاع مؤقت لقاعدة البيانات أو أي خطأ غير متوقع لا يجب أن
// يُسقط المنصة كاملة — نُسجّل الخطأ ونبقى نخدم بقية الطلبات.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ SPEX unhandledRejection (kept server alive):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ SPEX uncaughtException (kept server alive):', err);
});

const rootDir = process.cwd();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));

  // Render health check: lightweight and does not require authentication or a DB round-trip.
  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'spex',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  // Rate Limiting
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'محاولات دخول كثيرة جداً، يرجى المحاولة بعد قليل.' },
  });
  app.use('/api/auth/login', loginLimiter);
  // نفس حدّ تسجيل الدخول ينطبق على الدخول عبر Google (منع محاولات التخمين/التشغيل الآلي للرموز)
  app.use('/api/auth/google', loginLimiter);

  const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'طلبات كثيرة جداً لإعادة تعيين كلمة المرور، يرجى المحاولة بعد قليل.' },
  });
  app.use('/api/auth/forgot-password', forgotPasswordLimiter);

  const bootstrapLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'محاولات كثيرة جداً، يرجى المحاولة بعد قليل.' },
  });
  app.use('/api/auth/bootstrap-admin', bootstrapLimiter);

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  // API Routes - geoRouter عام قبل حارس الجلسة (PART A)
  app.use('/api/geo', geoRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter);
  app.use('/api', requireAuth, assignmentRouter);

  // Frontend Serving (Vite dev middleware vs Production static)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(rootDir, 'dist');
    // السماح بملفات النقطية (dotfiles) لأن Digital Asset Links يُقدَّم من
    // /.well-known/assetlinks.json وقد تجاهله express.static افتراضياً.
    app.use(express.static(distPath, { dotfiles: 'allow' }));

    // Digital Asset Links للـ Trusted Web Activity (مطلوب لخفاء شريط العنوان في تطبيق أندرويد)
    app.get('/.well-known/assetlinks.json', (_req, res) => {
      res.type('application/json').sendFile(path.join(distPath, '.well-known', 'assetlinks.json'));
    });

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error Handler — مع معالجة خاصة لأخطاء Neon E57P01 (terminating connection due to administrator command)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const msg: string = (err?.message || '').toString();
    const isNeonTerminating =
      msg.includes('terminating connection due to administrator command') ||
      msg.includes('E57P01') ||
      msg.includes('57P01') ||
      err?.code === 'P1001' ||
      err?.code === 'P1008' ||
      err?.code === 'P1017';

    if (isNeonTerminating) {
      console.warn(
        '⚠️ SPEX DB: Transient Neon termination (E57P01) caught in error handler — responding 503 to trigger client retry, server stays alive:',
        msg.slice(0, 200)
      );
      return res.status(503).json({
        error:
          'قاعدة البيانات تعيد التشغيل مؤقتاً (Neon scale-to-zero). يرجى إعادة المحاولة بعد لحظات.',
        code: 'DB_RETRYABLE',
        retryable: true,
      });
    }

    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `✅ SPEX server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
    );
    verifyDatabaseConnection();
  });
}

// فحص اتصال قاعدة البيانات عند بدء التشغيل (غير مميت — الخادم يبقى يخدم /health،
// مع رسالة واضحة عند وجود خلل في DATABASE_URL بدل أخطاء "Closed" غامضة عند أول طلب).
// ويكتشف أيضاً حالة "قاعدة تعمل لكن الجداول لم تُهجَّر بعد" — أشهر لغط نشراً —
// فيرشد فوراً إلى الحل بدل ظهور أخطاء P2021/P2022 عند أول تسجيل دخول.
async function verifyDatabaseConnection() {
  try {
    const prisma = (await import('./src/server/prismaClient.js')).prisma;
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ SPEX DB: PostgreSQL connection verified.');

    // فحص جاهزية المخطط: بدون جدول User لا يعمل أي تسجيل دخول — لكننا لا نهجّر تلقائياً
    // هنا. تُطبّق الهجرات مرة واحدة أثناء نشر Render عبر render:build.
    try {
      await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    } catch (schemaErr: unknown) {
      const code = (schemaErr as { code?: string })?.code;
      if (code === 'P2021' || code === 'P2022') {
        console.error(
          '⚠️ SPEX DB: الجداول/الأعمدة غير مكتملة — هجرات Prisma لم تُطبَّق على هذه القاعدة بعد.\n' +
            '   الحل: اضبط Build Command على: npm run render:build (يُهجّر أثناء البناء)، ثم أعد النشر.'
        );
      }
    }

    try {
      await prisma.$queryRaw`SELECT 1 FROM "Student" LIMIT 1`;
      await prisma.$queryRaw`SELECT 1 FROM "StudentClass" LIMIT 1`;
      console.log('✅ SPEX DB: Student roster schema ready.');
    } catch (rosterErr: unknown) {
      const rosterCode = (rosterErr as { code?: string })?.code;
      if (rosterCode === 'P2021' || rosterCode === 'P2022') {
        console.error('⚠️ SPEX DB: Student roster schema missing — run Prisma migrations.');
      } else {
        console.error('⚠️ SPEX DB: Student roster schema diagnostic failed:', rosterErr);
      }
    }
  } catch (err) {
    console.error(
      '❌ SPEX DB: تعذّر الاتصال بقاعدة البيانات. تحقق من DATABASE_URL في Render Dashboard → Environment ' +
        '(تأكد من ضبط DATABASE_URL كرابط Neon pooled صالح).',
      (err as Error).message || err
    );
  }
}

startServer();
