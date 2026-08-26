# SPEX (arenaspex) — المنصة الرقمية الذكية للتربية البدنية والرياضية (الطور الابتدائي)

منظومة جزائرية متكاملة لأستاذ ومفتش التربية البدنية: مولّد المذكرات البيداغوجية بالذكاء
الاصطناعي (Gemini ومزودون آخرون)، قمرة قيادة الحصة، الكراس اليومي، دفتر التقويم،
المحور المهني، إسناد الأساتذة للمفتشين، تسجيل الدخول بالبريد وكلمة المرور أو عبر
Google، وبوابات المفتش والمدير والمشرف — **بواجهة متعددة الصفحات بروابط URL حقيقية**
(كل أداة تُفتح برابطها في تبويب مستقل).

## التقنيات

- **الواجهة**: React 19 + Vite 6 + Tailwind 4 + React Router 7 (روابط حقيقية لكل أداة)
- **الخادم**: Express 4 (ملف `server.ts` موحّد للتطوير والإنتاج) + JWT في كوكيز httpOnly
- **قاعدة البيانات**: PostgreSQL (Neon موصى به) عبر Prisma 6 — هجرات مُدارة
- **جودة**: TypeScript + ESLint + Prettier + Vitest (35 اختباراً) + Husky

## التشغيل المحلي

```bash
npm install                     # أول مرة (يشغّل prisma generate تلقائياً)
cp .env.example .env            # املأ DATABASE_URL و DIRECT_DATABASE_URL و JWT_SECRET
npx prisma migrate deploy       # تطبيق مخطط قاعدة البيانات
npm run db:seed                 # إنشاء SUPER_ADMIN (إن عرّفت SUPER_ADMIN_EMAIL/PASSWORD)
npm run dev                     # http://localhost:3000
```

## أوامر رئيسية

| الأمر | الوظيفة |
| --- | --- |
| `npm run dev` | خادم التطوير الموحّد (خادم + واجهة) |
| `npm test` | تشغيل اختبارات Vitest |
| `npm run typecheck` · `npm run lint` | فحص الأنواع + ESLint |
| `npm run build` | بناء الواجهة + حزم الخادم (`dist/server.cjs`) |
| `npm start` | تشغيل الإنتاج من `dist/server.cjs` |

## النشر (Render + Neon)

ملف `render.yaml` جاهز كنظام Blueprint: الأمران هما
`npm run render:build` (تثبيت + prisma generate + migrate deploy + seed + build)
و`npm run render:start`. المتغيرات الإلزامية: `DATABASE_URL` و`DIRECT_DATABASE_URL` و`JWT_SECRET`.

في Render/Neon، اضبط `DATABASE_URL` على رابط Neon pooled الذي يحتوي على `-pooler` لتشغيل
Prisma أثناء الطلبات، واضبط `DIRECT_DATABASE_URL` على رابط Neon direct الصريح بدون `-pooler`
للهجرات والوصول الإداري. لا يُعاد اشتقاق أي رابط تلقائياً.

> ⚠️ **إن أنشأت الخدمة يدوياً (بدون Blueprint)** فاضبط Build Command على
> `npm run render:build` (وليس `npm run build`) — فالأخير لا يطبّق هجرات قاعدة
> البيانات فيفشل كل دخول بأخطاء `P2021/P2022`. لا تُشغّل الهجرات عند كل إقلاع؛ اجعل
> خطوة البناء هي مسار الهجرة الوحيد.
> حساب المشرف الأول يُنشأ آلياً من `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD` أثناء البناء.
الاختيارية وآثارها موثقة تفصيلياً في `.env.example` (الذكاء الاصطناعي متعدد المزودين
مع تشفير المفاتيح في القاعدة، بريد Resend لاسترجاع كلمة المرور، Google OAuth…).

## ملاحظات أمنية

- لا جلسات في المتصفح: المصادقة عبر كوكي httpOnly موقّع، وكلمات المرور bcrypt فقط.
- كل مسارات `/api` محمية، وصلاحيات الملكية/المقاطعة مفروضة خادمياً (`collectionAuth`).
- الدخول عبر Google يعمل فقط بعد ضبط `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID`
  ولا ينشئ حسابات جديدة (الحسابات يفتحها المشرف حصراً).
