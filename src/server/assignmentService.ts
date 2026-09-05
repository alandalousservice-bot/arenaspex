/**
 * SPEX - نظام الإسناد اليدوي بقبول المفتش (PART B - سياسة نهائية صارمة)
 *
 * المنطق النهائي:
 * - لا تفعيل آلياً على الإطلاق — أي مطابقة تنتهي بـ Pending موجه للمفتش المطابق (inspectorId معبأ, assignedAt=null)
 * - إلا إن كان بنفس المفتش وActive بالفعل (فلا نعيد إخضاعه)
 * - قبول/رفض المفتش عبر acceptAssignment / rejectAssignment مع أكواد NOT_FOUND/FORBIDDEN/ALREADY_HANDLED
 */

import { prisma } from './prismaClient.js';

export type AssignmentStatus = 'Pending' | 'Active' | 'Changed' | 'Removed';
export const ACCEPTED_ASSIGNMENT_STATUSES: AssignmentStatus[] = ['Active', 'Changed'];

/**
 * Canonical server-side authorization check for Inspector → Teacher access.
 * Only currently accepted assignments authorize access to Teacher documents.
 */
export async function canInspectorAccessTeacher(
  inspectorId: string,
  teacherId: string
): Promise<boolean> {
  const assignment = await prisma.inspectorAssignment.findFirst({
    where: {
      inspectorId,
      teacherId,
      status: { in: ACCEPTED_ASSIGNMENT_STATUSES },
    },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function acceptedTeacherIdsForInspector(inspectorId: string): Promise<Set<string>> {
  const assignments = await prisma.inspectorAssignment.findMany({
    where: { inspectorId, status: { in: ACCEPTED_ASSIGNMENT_STATUSES } },
    select: { teacherId: true },
  });
  return new Set(assignments.map((assignment) => assignment.teacherId));
}

function getTeacherDirectorateAndDistrict(teacher: any): {
  directorateId: string | null;
  districtId: string | null;
} {
  // دعم الحقول القديمة والجديدة (edu) للتوافق
  const directorateId =
    (teacher.directorateId && String(teacher.directorateId).trim()) ||
    (teacher.eduDirectorateId && String(teacher.eduDirectorateId).trim()) ||
    null;
  const districtId =
    (teacher.districtId && String(teacher.districtId).trim()) ||
    (teacher.eduDistrictId && String(teacher.eduDistrictId).trim()) ||
    null;
  return { directorateId: directorateId || null, districtId: districtId || null };
}

function getInspectorDirectorateAndDistrict(inspector: any): {
  directorateId: string | null;
  districtId: string | null;
} {
  const directorateId =
    (inspector.directorateId && String(inspector.directorateId).trim()) ||
    (inspector.eduDirectorateId && String(inspector.eduDirectorateId).trim()) ||
    null;
  const districtId =
    (inspector.districtId && String(inspector.districtId).trim()) ||
    (inspector.eduDistrictId && String(inspector.eduDistrictId).trim()) ||
    null;
  return { directorateId: directorateId || null, districtId: districtId || null };
}

/**
 * يبحث عن أول مفتش نشط يطابق مديرية التربية والمقاطعة التفتيشية معاً
 */
async function findMatchingInspector(directorateId: string, districtId: string) {
  if (!directorateId || !districtId) return null;
  return prisma.user.findFirst({
    where: {
      role: 'inspector',
      status: 'active',
      // نبحث في الحقلين القديم والجديد معاً لضمان التوافق
      OR: [
        { directorateId, districtId },
        { eduDirectorateId: directorateId, eduDistrictId: districtId },
        { directorateId, eduDistrictId: districtId },
        { eduDirectorateId: directorateId, districtId },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
}

// Custom error with code for router mapping to 404/403/409
export class AssignmentError extends Error {
  code: 'NOT_FOUND' | 'FORBIDDEN' | 'ALREADY_HANDLED';
  constructor(code: 'NOT_FOUND' | 'FORBIDDEN' | 'ALREADY_HANDLED', message?: string) {
    super(message || code);
    this.code = code;
  }
}

/**
 * يعيد احتساب إسناد أستاذ واحد وفق بياناته الحالية (مديرية + مقاطعة)،
 * لكن السياسة الجديدة: لا تفعيل تلقائي إطلاقاً — أي مطابقة تنتهي بـ Pending موجه للمفتش المطابق
 * (inspectorId معبأ, assignedAt=null)؛ إلا إن كان بنفس المفتش وActive بالفعل (فلا نعيد إخضاعه).
 */
export async function reassignTeacher(teacherId: string) {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== 'teacher') return null;

  const { directorateId, districtId } = getTeacherDirectorateAndDistrict(teacher);

  // بيانات مهنية غير مكتملة بعد (لم يختر المديرية أو المقاطعة) — لا يوجد ما يُسنَد
  if (!directorateId || !districtId) return null;

  const existing = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  const inspector = await findMatchingInspector(directorateId, districtId);

  // الحالة الخاصة: نفس المفتش وActive بالفعل — لا نعيد إخضاعه
  if (
    inspector &&
    existing &&
    existing.inspectorId === inspector.id &&
    existing.status === 'Active'
  ) {
    return existing;
  }

  let status: AssignmentStatus = 'Pending';
  let inspectorId: string | null = null;
  let assignedAt: Date | null = null;

  if (inspector) {
    inspectorId = inspector.id;
    status = 'Pending';
    assignedAt = null;
  } else {
    inspectorId = null;
    status = 'Pending';
    assignedAt = null;
  }

  return prisma.inspectorAssignment.upsert({
    where: { teacherId },
    create: { teacherId, inspectorId, status, assignedAt },
    update: { inspectorId, status, assignedAt },
  });
}

/**
 * يعيد احتساب إسناد كل الأساتذة المرتبطين بمفتش معيّن أو الذين يفترض أن يرتبطوا به بعد
 * تسجيله أو تعديل بياناته أو نقله إلى مقاطعة أخرى.
 */
export async function reassignAllForInspector(inspectorId: string) {
  const inspector = await prisma.user.findUnique({ where: { id: inspectorId } });
  const affectedTeacherIds = new Set<string>();

  const currentlyAssigned = await prisma.inspectorAssignment.findMany({
    where: { inspectorId },
    select: { teacherId: true },
  });
  currentlyAssigned.forEach((a) => affectedTeacherIds.add(a.teacherId));

  if (inspector && inspector.role === 'inspector' && inspector.status === 'active') {
    const { directorateId, districtId } = getInspectorDirectorateAndDistrict(inspector);
    if (directorateId && districtId) {
      const matchingTeachers = await prisma.user.findMany({
        where: {
          role: 'teacher',
          OR: [
            { directorateId, districtId },
            { eduDirectorateId: directorateId, eduDistrictId: districtId },
            { directorateId, eduDistrictId: districtId },
            { eduDirectorateId: directorateId, districtId },
          ],
        },
        select: { id: true },
      });
      matchingTeachers.forEach((t) => affectedTeacherIds.add(t.id));
    }
  }

  for (const teacherId of affectedTeacherIds) {
    await reassignTeacher(teacherId);
  }

  return affectedTeacherIds.size;
}

/**
 * إعادة إسناد جماعي شامل لكل الأساتذة
 */
export async function bulkReassignAll() {
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    select: { id: true },
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
 * إلغاء إسناد أستاذ يدوياً (أداة إدارية خاصة)
 */
export async function removeAssignment(teacherId: string) {
  const existing = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  if (!existing) return null;
  return prisma.inspectorAssignment.update({
    where: { teacherId },
    data: { status: 'Removed', inspectorId: null, assignedAt: null },
  });
}

/**
 * قبول الإسناد من طرف المفتش — يقبل فقط سجلاً Pending بنفس المفتش
 * أكواد: NOT_FOUND / FORBIDDEN / ALREADY_HANDLED
 */
export async function acceptAssignment(teacherId: string, inspectorId: string) {
  const existing = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  if (!existing) {
    throw new AssignmentError('NOT_FOUND', 'سجل الإسناد غير موجود.');
  }
  if (existing.inspectorId !== inspectorId) {
    throw new AssignmentError('FORBIDDEN', 'لا تملك صلاحية قبول هذا الإسناد.');
  }
  if (existing.status !== 'Pending') {
    throw new AssignmentError('ALREADY_HANDLED', 'تمت معالجة هذا الإسناد مسبقاً.');
  }

  return prisma.inspectorAssignment.update({
    where: { teacherId },
    data: { status: 'Active', assignedAt: new Date() },
  });
}

/**
 * رفض الإسناد من طرف المفتش — يقبل فقط سجلاً Pending بنفس المفتش
 * reason اختياري
 */
export async function rejectAssignment(teacherId: string, inspectorId: string, reason?: string) {
  const existing = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  if (!existing) {
    throw new AssignmentError('NOT_FOUND', 'سجل الإسناد غير موجود.');
  }
  if (existing.inspectorId !== inspectorId) {
    throw new AssignmentError('FORBIDDEN', 'لا تملك صلاحية رفض هذا الإسناد.');
  }
  if (existing.status !== 'Pending') {
    throw new AssignmentError('ALREADY_HANDLED', 'تمت معالجة هذا الإسناد مسبقاً.');
  }

  // reason يُسجل في السجلات فقط حالياً (لا يوجد حقل reason في النموذج)
  if (reason) {
    console.log(`Inspector ${inspectorId} rejected assignment for teacher ${teacherId}: ${reason}`);
  }

  return prisma.inspectorAssignment.update({
    where: { teacherId },
    data: { status: 'Removed', inspectorId: null, assignedAt: null },
  });
}
