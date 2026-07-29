/**
 * SPEX - Migration: legacy data_store.json  →  Postgres (via Prisma)
 * ترحيل بيانات الملف القديم إلى قاعدة البيانات الحقيقية، مع تشفير أي كلمات مرور نص عادي
 *
 * الاستخدام:
 *   1. انسخ نسخة data_store.json من خادم الإنتاج القديم إلى جذر المشروع
 *   2. تأكد أن DATABASE_URL في .env يشير إلى قاعدة البيانات الصحيحة (Neon)
 *   3. شغّل: npm run db:seed-from-json
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth.js';

const prisma = new PrismaClient();
const LEGACY_FILE = path.resolve(process.cwd(), 'data_store.json');

interface LegacyStore {
  users?: any[];
  lessonPlans?: any[];
  dailyNotebook?: any[];
  inspectorNotes?: any[];
  districtMessages?: any[];
  directMessages?: any[];
  communityResources?: any[];
  communityNotifications?: any[];
}

async function migrateUsers(users: any[]) {
  let migrated = 0;
  let skipped = 0;
  for (const u of users) {
    if (!u.id || !u.email) {
      skipped++;
      continue;
    }
    // المستخدمون القدامى قد يملكون كلمة مرور نص عادي (password) بدل passwordHash — نشفّرها الآن
    const plainPassword = u.password || '';
    if (!plainPassword) {
      console.warn(`⚠️  تخطي المستخدم ${u.email}: لا توجد كلمة مرور لتشفيرها. يجب إعادة تعيينها يدوياً بعد الترحيل.`);
      skipped++;
      continue;
    }
    const passwordHash = await hashPassword(String(plainPassword));

    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        username: u.username,
        spexId: u.spexId,
        firstName: u.firstName,
        lastName: u.lastName,
        email: String(u.email).toLowerCase().trim(),
        passwordHash,
        role: u.role || 'teacher',
        avatar: u.avatar,
        phone: u.phone,
        directorateId: u.directorateId || '',
        districtId: u.districtId || '',
        institutionId: u.institutionId,
        schoolName: u.schoolName,
        municipality: u.municipality,
        specialization: u.specialization,
        cycle: u.cycle,
        yearsExperience: u.yearsExperience,
        bio: u.bio,
        status: u.status || 'active',
        isApprovedByAdmin: u.isApprovedByAdmin ?? false,
        followingIds: u.followingIds || [],
        followersIds: u.followersIds || [],
        publishedResourcesCount: u.publishedResourcesCount || 0,
        approvedResourcesCount: u.approvedResourcesCount || 0,
        privacySettings: u.privacySettings || undefined,
        customApiKey: u.customApiKey,
        apiKeyStatus: u.apiKeyStatus
      },
      create: {
        id: u.id,
        username: u.username || `user_${u.id}`,
        spexId: u.spexId || `SPX-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: String(u.email).toLowerCase().trim(),
        passwordHash,
        role: u.role || 'teacher',
        avatar: u.avatar,
        phone: u.phone,
        directorateId: u.directorateId || '',
        districtId: u.districtId || '',
        institutionId: u.institutionId,
        schoolName: u.schoolName,
        municipality: u.municipality,
        specialization: u.specialization,
        cycle: u.cycle,
        yearsExperience: u.yearsExperience,
        bio: u.bio,
        status: u.status || 'active',
        isApprovedByAdmin: u.isApprovedByAdmin ?? false,
        followingIds: u.followingIds || [],
        followersIds: u.followersIds || [],
        publishedResourcesCount: u.publishedResourcesCount || 0,
        approvedResourcesCount: u.approvedResourcesCount || 0,
        privacySettings: u.privacySettings || undefined,
        customApiKey: u.customApiKey,
        apiKeyStatus: u.apiKeyStatus
      }
    });
    migrated++;
  }
  return { migrated, skipped };
}

async function migrateJsonCollection(model: any, items: any[], label: string) {
  let migrated = 0;
  for (const item of items) {
    if (!item.id) continue;
    await model.upsert({
      where: { id: item.id },
      create: { id: item.id, data: item },
      update: { data: item }
    });
    migrated++;
  }
  console.log(`  ${label}: ${migrated} سجل`);
}

async function main() {
  if (!fs.existsSync(LEGACY_FILE)) {
    console.error(`❌ لم يُعثر على data_store.json في ${LEGACY_FILE}`);
    console.error('   انسخ ملف قاعدة البيانات القديم من الخادم القديم إلى جذر المشروع أولاً.');
    process.exit(1);
  }

  const raw = fs.readFileSync(LEGACY_FILE, 'utf-8');
  const legacy: LegacyStore = JSON.parse(raw);

  console.log('🚚 بدء الترحيل إلى Postgres...\n');

  if (legacy.users?.length) {
    const { migrated, skipped } = await migrateUsers(legacy.users);
    console.log(`  المستخدمون: ${migrated} تم ترحيلهم، ${skipped} تم تخطيهم (بلا كلمة مرور صالحة)`);
  }

  if (legacy.lessonPlans?.length) await migrateJsonCollection(prisma.lessonPlan, legacy.lessonPlans, 'المذكرات');
  if (legacy.dailyNotebook?.length) await migrateJsonCollection(prisma.notebookEntry, legacy.dailyNotebook, 'الكراس اليومي');
  if (legacy.inspectorNotes?.length) await migrateJsonCollection(prisma.inspectorNote, legacy.inspectorNotes, 'ملاحظات التفتيش');
  if (legacy.districtMessages?.length) await migrateJsonCollection(prisma.districtMessage, legacy.districtMessages, 'رسائل المقاطعة');
  if (legacy.directMessages?.length) await migrateJsonCollection(prisma.directMessage, legacy.directMessages, 'الرسائل المباشرة');
  if (legacy.communityResources?.length) await migrateJsonCollection(prisma.communityResource, legacy.communityResources, 'موارد المجتمع');
  if (legacy.communityNotifications?.length) await migrateJsonCollection(prisma.communityNotification, legacy.communityNotifications, 'الإشعارات');

  console.log('\n✅ اكتمل الترحيل.');
  console.log('⚠️  تذكير: احذف data_store.json من الخادم القديم بعد التأكد من نجاح الترحيل، ولا ترفعه إلى Git أبداً.');
}

main()
  .catch((e) => {
    console.error('❌ فشل الترحيل:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
