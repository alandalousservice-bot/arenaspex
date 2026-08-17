/**
 * SPEX - نظام الإسناد التلقائي للأساتذة إلى المفتشين
 *
 * منطق واحد موحّد لكل نقاط التشغيل الممكنة (تسجيل أستاذ جديد، تعديل بياناته، تسجيل مفتش
 * جديد، تعديل بياناته، نقل أستاذ أو مفتش، اعتماد بلدية/مؤسسة/مقاطعة جديدة، إعادة الإسناد
 * الجماعي اليدوي من طرف الإدارة). كل نقطة تشغيل تستدعي reassignTeacher أو
 * reassignAllForInspector بدل تكرار منطق البحث والمطابقة في كل مكان.
 */
import { prisma } from './prismaClient.js';

export type AssignmentStatus = 'Pending' | 'Active' | 'Changed' | 'Removed';

/**
 * يبحث عن أول مفتش نشط يطابق مديرية التربية والمقاطعة التفتيشية معاً (الشرطان الوحيدان
 * المعتمدان في الإسناد — لا علاقة للمادة لأن المنصة مخصصة حصراً للتربية البدنية والرياضية
 * في الطور الابتدائي).
 */
async function findMatchingInspector(directorateId: string, districtId: string) {
  if (!directorateId || !districtId) return null;
  return prisma.user.findFirst({
    where: {
      role: 'inspector',
      status: 'active',
      directorateId,
      districtId
    },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * يعيد احتساب إسناد أستاذ واحد وفق بياناته الحالية (مديرية + مقاطعة)، وينشئ أو يحدّث
 * سجل InspectorAssignment الخاص به. يُستدعى بعد أي تعديل قد يغيّر جهة إشرافه.
 */
export async function reassignTeacher(teacherId: string) {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== 'teacher') return null;

  // بيانات مهنية غير مكتملة بعد (لم يختر المديرية أو المقاطعة) — لا يوجد ما يُسنَد
  if (!teacher.directorateId || !teacher.districtId) return null;

  const existing = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  const inspector = await findMatchingInspector(teacher.directorateId, teacher.districtId);

  let status: AssignmentStatus;
  let inspectorId: string | null;
  let assignedAt: Date | null;

  if (inspector) {
    inspectorId = inspector.id;
    assignedAt = new Date();
    // إن كان مرتبطاً سابقاً بمفتش مختلف، فهذا تغيير تلقائي للمفتش (Changed) وليس ربطاً أولياً (Active)
    status = existing?.inspectorId && existing.inspectorId !== inspector.id ? 'Changed' : 'Active';
  } else {
    inspectorId = null;
    assignedAt = null;
    status = 'Pending';
  }

  const data = { inspectorId, status, assignedAt };

  return prisma.inspectorAssignment.upsert({
    where: { teacherId },
    create: { teacherId, ...data },
    update: data
  });
}

/**
 * يعيد احتساب إسناد كل الأساتذة المرتبطين بمفتش معيّن أو الذين يفترض أن يرتبطوا به بعد
 * تسجيله أو تعديل بياناته أو نقله إلى مقاطعة أخرى. يشمل أيضاً الأساتذة الذين كانوا
 * مرتبطين به سابقاً (حتى تُعاد مطابقتهم مع غيره أو تعود حالتهم إلى Pending إن غادر مقاطعته).
 */
export async function reassignAllForInspector(inspectorId: string) {
  const inspector = await prisma.user.findUnique({ where: { id: inspectorId } });

  const affectedTeacherIds = new Set<string>();

  const currentlyAssigned = await prisma.inspectorAssignment.findMany({
    where: { inspectorId },
    select: { teacherId: true }
  });
  currentlyAssigned.forEach((a) => affectedTeacherIds.add(a.teacherId));

  if (inspector && inspector.role === 'inspector' && inspector.status === 'active') {
    const matchingTeachers = await prisma.user.findMany({
      where: { role: 'teacher', directorateId: inspector.directorateId, districtId: inspector.districtId },
      select: { id: true }
    });
    matchingTeachers.forEach((t) => affectedTeacherIds.add(t.id));
  }

  for (const teacherId of affectedTeacherIds) {
    await reassignTeacher(teacherId);
  }

  return affectedTeacherIds.size;
}

/**
 * إعادة إسناد جماعي شامل لكل الأساتذة — تُستخدم من طرف الإدارة عند الحاجة (مثلاً بعد
 * استيراد بيانات جماعي، أو بعد إصلاح خطأ في بيانات مديرية/مقاطعة).
 */
export async function bulkReassignAll() {
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    select: { id: true }
  });

  let active = 0;
  let pending = 0;
  let changed = 0;

  for (const t of teachers) {
    const result = await reassignTeacher(t.id);
    if (!result) continue;
    if (result.status === 'Active') active++;
    else if (result.status === 'Pending') pending++;
    else if (result.status === 'Changed') changed++;
  }

  return { total: teachers.length, active, pending, changed };
}

/**
 * إلغاء إسناد أستاذ يدوياً (أداة إدارية خاصة عند الضرورة فقط — الإسناد العادي تلقائي بالكامل).
 */
export async function removeAssignment(teacherId: string) {
  const existing = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  if (!existing) return null;
  return prisma.inspectorAssignment.update({
    where: { teacherId },
    data: { status: 'Removed', inspectorId: null, assignedAt: null }
  });
}
