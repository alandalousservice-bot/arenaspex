import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, ViteDevServer } from 'vite';

// تُحمَّل مسارات الخادم (routers) عند الطلب فقط داخل hook التطوير configureServer،
// وليس عند تحميل ملف الإعداد أثناء `vite build`، لأنها تستورد auth.ts الذي يتحقق
// من JWT_SECRET في وضع الإنتاج وقد يُعطّل البناء.
async function loadServerRouters() {
  const express = (await import('express')).default;
  const cookieParser = (await import('cookie-parser')).default;
  const { apiRouter } = await import('./src/server/apiRouter.ts');
  const { authRouter } = await import('./src/server/authRouter.ts');
  const { assignmentRouter } = await import('./src/server/assignmentRouter.ts');
  const { geoRouter } = await import('./src/server/geoRouter.ts');
  const { requireAuth, requireOperationalAccount } =
    await import('./src/server/middleware/requireAuth.ts');
  const { mountApiRoutes } = await import('./src/server/apiAssembly.ts');
  return {
    express,
    cookieParser,
    apiRouter,
    authRouter,
    assignmentRouter,
    geoRouter,
    requireAuth,
    requireOperationalAccount,
    mountApiRoutes,
  };
}

// نفس مسارات الإنتاج بالضبط (مصادقة حقيقية + Postgres عبر Prisma) تعمل أيضاً في وضع التطوير،
// فقط موجّهة إلى قاعدة بيانات التطوير المحددة في DATABASE_URL بملف .env المحلي
function expressApiPlugin() {
  return {
    name: 'express-api-plugin',
    async configureServer(server: ViteDevServer) {
      const {
        express,
        cookieParser,
        apiRouter,
        authRouter,
        assignmentRouter,
        geoRouter,
        requireAuth,
        requireOperationalAccount,
        mountApiRoutes,
      } = await loadServerRouters();
      const app = express();
      app.use(cookieParser());
      app.use(express.json());
      mountApiRoutes({
        app,
        apiRouter,
        authRouter,
        assignmentRouter,
        geoRouter,
        requireAuth,
        requireOperationalAccount,
      });
      server.middlewares.use(app);
    },
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
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('docx')) {
                return 'vendor-docx';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              return 'vendor-framework';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // خادم تطوير فقط — السماح لأي مضيف حتى يعمل المعاين عبر نطاقات بروكسي متغيرة (e2b.app وغيرها)
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
