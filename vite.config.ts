import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { defineConfig } from 'vite';
import { apiRouter } from './src/server/apiRouter.ts';
import { authRouter } from './src/server/authRouter.ts';

// نفس مسارات الإنتاج بالضبط (مصادقة حقيقية + Postgres عبر Prisma) تعمل أيضاً في وضع التطوير،
// فقط موجّهة إلى قاعدة بيانات التطوير المحددة في DATABASE_URL بملف .env المحلي
function expressApiPlugin() {
  return {
    name: 'express-api-plugin',
    configureServer(server: any) {
      const app = express();
      app.use(cookieParser());
      app.use(express.json());
      app.use('/api/auth', authRouter);
      app.use('/api', apiRouter);
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
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
