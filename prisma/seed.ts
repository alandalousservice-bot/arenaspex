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
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL?.trim() || 'admin@spex.dz').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';

  // منع إنشاء حساب مشرف بكلمة مرور افتراضية معروفة (admin@spex.dz / 12345678) في بيئة
  // الإنتاج — نفس مبدأ الحماية المطبَّق على JWT_SECRET في auth.ts. في بيئة التطوير فقط
  // يُسمح بالقيمة الافتراضية الضعيفة لتسهيل التجربة المحلية.
  if (!password || password.length < 8) {
    if (isProduction) {
      throw new Error(
        'FATAL: SUPER_ADMIN_PASSWORD غير معرّف أو أقصر من 8 أحرف في بيئة الإنتاج. ' +
          'عرّف SUPER_ADMIN_EMAIL و SUPER_ADMIN_PASSWORD بقيم حقيقية قوية قبل تشغيل npm run db:seed، ' +
          'أو استخدم مسار /api/auth/bootstrap-admin بدلاً من ذلك.'
      );
    }
    console.warn(
      '⚠️ SUPER_ADMIN_PASSWORD غير معرّف — سيُستخدم حساب تطوير محلي ضعيف (admin@spex.dz / 12345678). ' +
        'لا تستخدم هذا في الإنتاج.'
    );
  }
  const effectivePassword = password && password.length >= 8 ? password : '12345678';

  const firstName = process.env.SUPER_ADMIN_FIRST_NAME?.trim() || 'مشرف';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME?.trim() || 'المنظومة الرقمية';
  const directorateId = process.env.SUPER_ADMIN_DIRECTORATE_ID?.trim() || 'setif_de';
  const districtId = process.env.SUPER_ADMIN_DISTRICT_ID?.trim() || 'dist_setif_7';

  // تنظيف الحسابات التجريبية القديمة إن وجدت في قاعدة البيانات
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'usr_teacher_' } },
        { id: 'usr_inspector_1' },
        { id: 'usr_teacher_out_district' },
      ],
    },
  });

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { role: 'admin' }] },
  });

  if (existing) {
    console.log(`✅ حساب المشرف موجود بالفعل (${existing.email}) — جاهز للاستخدام.`);
    return;
  }

  const passwordHash = await hashPassword(effectivePassword);
  const spexId = 'SPX-99ADMIN';

  const admin = await prisma.user.create({
    data: {
      id: 'usr_admin_1',
      username: 'admin_spex',
      spexId,
      firstName,
      lastName,
      email,
      passwordHash,
      role: 'admin',
      directorateId,
      districtId,
      schoolName: 'مديرية التربية لولاية سطيف',
      municipality: 'سطيف / عين أزال',
      specialization: 'مشرف المنظومة الرقمية - المقاطعة 07 عين أزال ولاية سطيف',
      yearsExperience: 15,
      bio: 'إدارة وتأطير المنظومة الرقمية الذكية SPEX وإدارة حسابات الأساتذة والمفتشين.',
      status: 'active',
      isApprovedByAdmin: true,
    },
  });

  console.log(
    `✅ تم إنشاء حساب المشرف الوحيد للمنصة تلقائياً: ${admin.email} (الدور: ${admin.role})`
  );
}

/**
 * بيانات مرجعية أولية لمديرية سطيف (نفس البيانات كانت مضمّنة سابقاً كنص ثابت في الواجهة
 * الأمامية ضمن INITIAL_DIRECTORATES — الآن أصبحت سجلات حقيقية في قاعدة البيانات، وهو
 * ما يسمح لنظام الإسناد التلقائي بالعمل فعلياً بدل الاعتماد على inspectorId ثابت يدوياً).
 * آمنة لإعادة التشغيل: upsert على كل سجل.
 */
async function seedReferenceData() {
  const directorate = await prisma.directorate.upsert({
    where: { id: 'setif_de' },
    create: { id: 'setif_de', name: 'مديرية التربية لولاية سطيف', wilayaCode: '19' },
    update: {},
  });

  const districts: Array<{ id: string; number: number; name: string }> = [
    { id: 'dist_setif_1', number: 1, name: 'المقاطعة 01 - سطيف شرق' },
    { id: 'dist_setif_2', number: 2, name: 'المقاطعة 02 - سطيف غرب' },
    { id: 'dist_setif_3', number: 3, name: 'المقاطعة 03 - العلمة 1' },
    { id: 'dist_setif_4', number: 4, name: 'المقاطعة 04 - العلمة 2' },
    { id: 'dist_setif_5', number: 5, name: 'المقاطعة 05 - عين ولمان' },
    { id: 'dist_setif_6', number: 6, name: 'المقاطعة 06 - بوقاعة' },
    { id: 'dist_setif_7', number: 7, name: 'المقاطعة 07 - عين أزال' },
    { id: 'dist_setif_8', number: 8, name: 'المقاطعة 08 - عين الكبيرة' },
    { id: 'dist_setif_9', number: 9, name: 'المقاطعة 09 - بني ورتيلان' },
    // المقاطعة 10 — الاسم الرسمي يتطلب تأكيداً من مديرية التربية لولاية سطيف؛ النص الحالي احتياطي لإكمال الهيكلية حتى 10 مقاطعات
    { id: 'dist_setif_10', number: 10, name: 'المقاطعة 10 - (أكمل الاسم الرسمي)' },
  ];
  for (const d of districts) {
    await prisma.inspectionDistrict.upsert({
      where: { id: d.id },
      create: { id: d.id, name: d.name, directorateId: directorate.id, districtNumber: d.number },
      update: { name: d.name, districtNumber: d.number },
    });
  }

  const municipality = await prisma.municipality.upsert({
    where: { directorateId_name: { directorateId: directorate.id, name: 'عين أزال' } },
    create: { id: 'muni_ain_azel', name: 'عين أزال', directorateId: directorate.id },
    update: {},
  });

  const schools = [
    'مدرسة الشهيد بالخيري عبد القادر',
    'مدرسة الشهيد بلعياطي زبير',
    'مدرسة المجاهد لخضر بوعود',
  ];
  for (const name of schools) {
    await prisma.school.upsert({
      where: { municipalityId_name: { municipalityId: municipality.id, name } },
      create: { name, municipalityId: municipality.id },
      update: {},
    });
  }

  console.log(
    '✅ تم التأكد من وجود البيانات المرجعية الأساسية (مديرية سطيف، المقاطعات، بلدية عين أزال ومؤسساتها).'
  );
}

async function seedEducationalSituations() {
  const source = resolve(process.cwd(), 'arenaspex_situations_mapped_to_objectives (1).json');
  const situations = JSON.parse(await readFile(source, 'utf8')) as Array<any>;
  if (situations.length !== 150)
    throw new Error(`Expected 150 educational situations; found ${situations.length}.`);
  for (const item of situations) {
    await prisma.educationalSituation.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        externalId: item.id,
        name: item.name,
        grade: item.grade,
        fieldId: item.field_id,
        fieldName: item.field_name,
        objectiveIds: item.linked_objective_ids,
        objectiveTexts: item.linked_objectives,
        sourceGoal: item.source_goal,
        organization: item.organization,
        equipment: String(item.equipment || '')
          .split(/[،,]/)
          .map((v) => v.trim())
          .filter(Boolean),
        variations: item.variations || null,
        origin: 'REFERENCE_SEED',
        status: 'APPROVED',
      },
      update: {
        name: item.name,
        grade: item.grade,
        fieldId: item.field_id,
        fieldName: item.field_name,
        objectiveIds: item.linked_objective_ids,
        objectiveTexts: item.linked_objectives,
        sourceGoal: item.source_goal,
        organization: item.organization,
        equipment: String(item.equipment || '')
          .split(/[،,]/)
          .map((v) => v.trim())
          .filter(Boolean),
        variations: item.variations || null,
        origin: 'REFERENCE_SEED',
        status: 'APPROVED',
      },
    });
  }
  const count = await prisma.educationalSituation.count({ where: { origin: 'REFERENCE_SEED' } });
  if (count !== 150)
    throw new Error(`Reference educational situation count is ${count}, expected 150.`);
}

async function main() {
  await seedSuperAdmin();
  await seedReferenceData();
  await seedEducationalSituations();
}

main()
  .catch((err) => {
    console.error('❌ فشل تشغيل seed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // قد يرمي $disconnect نفسه إن لم يكن المحرك أقلع أصلاً (مثلاً عند تخطي الإنشاء) —
    // لا يجب أن يُفشل ذلك خطوة الإقلاع بأكملها بسبب تنظيف ختامي شكلي
    try {
      await prisma.$disconnect();
    } catch {
      // آمن تماماً للتجاهل
    }
  });
