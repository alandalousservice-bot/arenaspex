import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { defineConfig } from 'vite';
import { installProcessSafetyNet } from './src/server/processSafety.ts';

// نفس مسارات الإنتاج بالضبط (مصادقة حقيقية + Postgres عبر Prisma) تعمل أيضاً في وضع التطوير،
// فقط موجّهة إلى قاعدة بيانات التطوير المحددة في DATABASE_URL بملف .env المحلي
//
// ملاحظة مهمة: تُستورد مسارات الخادم ديناميكياً هنا (وليس استيراداً ثابتاً في أعلى الملف)
// لأن vite.config.ts يُحمَّل أيضاً أثناء `vite build` حيث تكون NODE_ENV=production —
// والاستيراد الثابت كان يجبر وحدات الخادم (auth.ts مثلاً) على التحقق من متغيرات بيئة
// الإنتاج (JWT_SECRET وغيرها) أثناء البناء فيُفشله، رغم أن البناء لا علاقة له بالخادم.
function expressApiPlugin() {
  return {
    name: 'express-api-plugin',
    async configureServer(server: any) {
      // تُثبَّت قبل استيراد وحدات الخادم: تهيئة Prisma قد ترفض وعداً في الخلفية
      // (مثلاً تعذر الوصول لقاعدة البيانات) ولا يجب أن يُسقط ذلك خادم التطوير كله
      installProcessSafetyNet();

      const { authRouter } = await import('./src/server/authRouter.ts');
      const { apiRouter } = await import('./src/server/apiRouter.ts');

      const app = express();
      app.use(cookieParser());
      app.use(express.json());
      app.use('/api/auth', authRouter);
      app.use('/api', apiRouter);

      // معالج أخطاء عام مثل خادم الإنتاج — لا نسرّب تفاصيل الخطأ الداخلي للعميل
      app.use((err: any, _req: any, res: any, _next: any) => {
        console.error('Unhandled dev API error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم.' });
        }
      });

      server.middlewares.use(app);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // خادم تطوير فقط (الإنتاج يعمل عبر src/server/index.ts) — السماح لأي مضيف
      // حتى يعمل معاين عبر نطاقات بروكسي متغيرة (e2b.app وغيرها)
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
