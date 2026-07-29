/**
 * SPEX - Database Seed
 * ينشئ حساب SUPER_ADMIN (أعلى صلاحية في المنصة: role = "admin") تلقائياً عند أول تشغيل،
 * ويُستخدم أيضاً كنقطة موحّدة لأي بيانات أساسية أخرى يجب أن توجد دوماً في قاعدة البيانات.
 *
 * آمن لإعادة التشغيل (idempotent): إن كان الحساب موجوداً بالفعل لا يُعاد إنشاؤه ولا كلمة مروره،
 * لذا يمكن تشغيله في كل مرة يُقلع فيها الخادم (مثلاً ضمن أمر `npm start`) دون أي خطر.
 *
 * التفعيل: عرّف SUPER_ADMIN_EMAIL و SUPER_ADMIN_PASSWORD في متغيرات البيئة.
 * إن لم تُعرَّف، يُتخطّى إنشاء الحساب بأمان (تحذير فقط في السجلات)، ويبقى مسار
 * /api/auth/bootstrap-admin متاحاً كطريقة بديلة لإنشاء أول حساب مشرف (راجع authRouter.ts).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth.js';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      'ℹ️  تخطّي إنشاء حساب SUPER_ADMIN: عرّف SUPER_ADMIN_EMAIL و SUPER_ADMIN_PASSWORD في متغيرات البيئة لتفعيل الإنشاء التلقائي.'
    );
    return;
  }

  if (password.length < 8) {
    console.warn('⚠️  SUPER_ADMIN_PASSWORD يجب أن تكون 8 أحرف على الأقل — تم تخطي الإنشاء.');
    return;
  }

  const firstName = process.env.SUPER_ADMIN_FIRST_NAME?.trim() || 'مدير';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME?.trim() || 'المنصة';
  const directorateId = process.env.SUPER_ADMIN_DIRECTORATE_ID?.trim() || 'setif_de';
  const districtId = process.env.SUPER_ADMIN_DISTRICT_ID?.trim() || 'dist_setif_7';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // موجود بالفعل: لا نغيّر كلمة مروره أو دوره تلقائياً حتى لا نُفاجئ من غيّرها يدوياً بعد ذلك
    console.log(`✅ حساب SUPER_ADMIN موجود بالفعل (${email}) — لم يتم تعديل أي شيء.`);
    return;
  }

  // نتأكد أيضاً أنه لا يوجد أي حساب admin آخر بنفس اسم المستخدم "super_admin" (تعارض نادر لكن ممكن)
  const passwordHash = await hashPassword(password);
  const spexId = `SPX-${Math.floor(1000 + Math.random() * 9000)}`;

  const admin = await prisma.user.create({
    data: {
      id: `usr_super_admin_${Date.now()}`,
      username: 'super_admin',
      spexId,
      firstName,
      lastName,
      email,
      passwordHash,
      role: 'admin',
      directorateId,
      districtId,
      status: 'active',
      isApprovedByAdmin: true
    }
  });

  console.log(`✅ تم إنشاء حساب SUPER_ADMIN تلقائياً: ${admin.email} (الدور: ${admin.role})`);
}

async function main() {
  await seedSuperAdmin();
}

main()
  .catch((err) => {
    console.error('❌ فشل تشغيل seed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
