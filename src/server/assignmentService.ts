/**
 * SPEX - نظام الإسناد اليدوي بقبول المفتش (PART B - سياسة نهائية صارمة)
 *
 * المنطق النهائي:
 * - لا تفعيل آلياً على الإطلاق — أي مطابقة تنتهي بـ Pending موجه للمفتش المطابق (inspectorId معبأ, assignedAt=null)
 * - إلا إن كان بنفس المفتش وActive بالفعل (فلا نعيد إخضاعه)
 * - قبول/رفض المفتش عبر acceptAssignment / rejectAssignment مع أكواد NOT_FOUND/FORBIDDEN/ALREADY_HANDLED
 */

import { prisma } from './prismaClient.js';
import type { Prisma } from '@prisma/client';
import { assignmentTransaction, TransferError } from './assignmentTransferService.js';
import { isAccountAccessExpired } from './accountAccess.js';
import { appendAudit } from './auditService.js';

type AssignmentDb = Prisma.TransactionClient | typeof prisma;

export type AssignmentStatus = 'Pending' | 'Active' | 'Changed' | 'Removed';
export const ACCEPTED_ASSIGNMENT_STATUSES: AssignmentStatus[] = ['Active', 'Changed'];

/**
 * Canonical server-side authorization check for Inspector → Teacher access.
 * Only currently accepted assignments authorize access to Teacher documents.
 */
export async function canInspectorAccessTeacher(
  inspectorId: string,
  teacherId: string,
  db: Pick<typeof prisma, 'inspectorAssignment'> = prisma
): Promise<boolean> {
  const assignment = await db.inspectorAssignment.findFirst({
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
async function findMatchingInspector(
  directorateId: string,
  districtId: string,
  db: AssignmentDb = prisma
) {
  if (!directorateId || !districtId) return null;
  return db.user.findFirst({
    where: {
      role: 'inspector',
      status: 'active',
      isApprovedByAdmin: true,
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
export async function reassignTeacher(teacherId: string, db: AssignmentDb = prisma, actorUserId?: string) {
  if (db === prisma) return assignmentTransaction((tx) => reassignTeacherInDb(teacherId, tx, actorUserId), 'assignmentService.reassignTeacher');
  return reassignTeacherInDb(teacherId, db, actorUserId);
}

async function reassignTeacherInDb(teacherId: string, db: AssignmentDb, actorUserId?: string) {
  const teacher = await db.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== 'teacher') return null;

  const { directorateId, districtId } = getTeacherDirectorateAndDistrict(teacher);

  // بيانات مهنية غير مكتملة بعد (لم يختر المديرية أو المقاطعة) — لا يوجد ما يُسنَد
  if (!directorateId || !districtId) return null;

  const existing = await db.inspectorAssignment.findUnique({ where: { teacherId } });
  // Recalculation may create an initial request, never revoke current ownership.
  // Explicit cross-district changes use the persisted transfer lifecycle.
  if (existing && (existing.status === 'Active' || existing.status === 'Changed')) return existing;
  const inspector = await findMatchingInspector(directorateId, districtId, db);

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

  const saved = await db.inspectorAssignment.upsert({
    where: { teacherId },
    create: { teacherId, inspectorId, status, assignedAt },
    update: { inspectorId, status, assignedAt },
  });
  if (actorUserId && (!existing || existing.status !== saved.status || existing.inspectorId !== saved.inspectorId))
    await appendAudit(db, { eventType:'TEACHER_ASSIGNMENT_REQUESTED',actorUserId,entityType:'TEACHER_ASSIGNMENT',entityId:saved.id,affectedUserId:teacherId,before:existing || undefined,after:saved,key:`ASSIGN_RECALCULATE:${saved.id}:${saved.updatedAt.toISOString()}` });
  return saved;
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
export async function bulkReassignAll(actorUserId?: string) {
  return prisma.$transaction(
    async (tx) => {
      const teachers = await tx.user.findMany({
        where: { role: 'teacher' },
        select: { id: true },
      });

      let active = 0;
      let pending = 0;
      let changed = 0;
      for (const t of teachers) {
        const result = await reassignTeacher(t.id, tx, actorUserId);
        if (!result) continue;
        if (result.status === 'Active') active++;
        else if (result.status === 'Pending') pending++;
        else if (result.status === 'Changed') changed++;
      }
      return { total: teachers.length, active, pending, changed };
    },
    { isolationLevel: 'Serializable' }
  );
}

/**
 * إلغاء إسناد أستاذ يدوياً (أداة إدارية خاصة)
 */
export async function removeAssignment(teacherId: string, actorUserId?: string) {
  return assignmentTransaction(async (db) => {
    const pending = await db.inspectorAssignmentTransfer.findUnique({
      where: { pendingTeacherId: teacherId },
    });
    if (pending)
      throw new TransferError('CONFLICT', 'يوجد طلب نقل معلّق؛ يبقى الإسناد الحالي حتى البت فيه.');
    const existing = await db.inspectorAssignment.findUnique({ where: { teacherId } });
    if (!existing) return null;
    const saved = await db.inspectorAssignment.update({
      where: { teacherId },
      data: { status: 'Removed', inspectorId: null, assignedAt: null },
    });
    if (actorUserId && (existing.status !== 'Removed' || existing.inspectorId))
      await appendAudit(db,{eventType:'TEACHER_ASSIGNMENT_REMOVED',actorUserId,entityType:'TEACHER_ASSIGNMENT',entityId:existing.id,affectedUserId:teacherId,before:existing,after:saved,key:`ASSIGN_REMOVE:${existing.id}:${existing.updatedAt.toISOString()}`});
    return saved;
  }, 'assignmentService.removeAssignment');
}

/**
 * قبول الإسناد من طرف المفتش — يقبل فقط سجلاً Pending بنفس المفتش
 * أكواد: NOT_FOUND / FORBIDDEN / ALREADY_HANDLED
 */
export async function acceptAssignment(teacherId: string, inspectorId: string) {
  return assignmentTransaction(async (db) => {
    const existing = await db.inspectorAssignment.findUnique({ where: { teacherId } });
    if (!existing) {
      throw new AssignmentError('NOT_FOUND', 'سجل الإسناد غير موجود.');
    }
    if (existing.inspectorId !== inspectorId) {
      throw new AssignmentError('FORBIDDEN', 'لا تملك صلاحية قبول هذا الإسناد.');
    }
    if (existing.status !== 'Pending') {
      throw new AssignmentError('ALREADY_HANDLED', 'تمت معالجة هذا الإسناد مسبقاً.');
    }

    const [teacher, inspector] = await Promise.all([
      db.user.findUnique({ where: { id: teacherId } }),
      db.user.findUnique({ where: { id: inspectorId } }),
    ]);
    if (!teacher || teacher.role !== 'teacher' || !inspector || inspector.role !== 'inspector' ||
        inspector.status !== 'active' || !inspector.isApprovedByAdmin || isAccountAccessExpired(inspector.accessExpiresAt)) {
      throw new AssignmentError('FORBIDDEN', 'الانتساب أو اعتماد المفتش لم يعد صالحاً.');
    }
    const source = getTeacherDirectorateAndDistrict(teacher);
    const target = getInspectorDirectorateAndDistrict(inspector);
    const district = target.districtId ? await db.inspectionDistrict.findUnique({ where: { id: target.districtId } }) : null;
    if (!district || district.directorateId !== target.directorateId || source.directorateId !== target.directorateId || source.districtId !== target.districtId) {
      throw new AssignmentError('FORBIDDEN', 'المفتش غير مخوّل للمقاطعة الحالية للأستاذ.');
    }

    const changed = await db.inspectorAssignment.updateMany({
      where: { teacherId, inspectorId, status: 'Pending', updatedAt: existing.updatedAt },
      data: { status: 'Active', assignedAt: new Date() },
    });
    if (changed.count !== 1)
      throw new AssignmentError('ALREADY_HANDLED', 'تغير هذا الإسناد قبل تأكيد القبول.');
    await appendAudit(db, { eventType:'TEACHER_ASSIGNMENT_ACCEPTED',actorUserId:inspectorId,entityType:'TEACHER_ASSIGNMENT',entityId:existing.id,affectedUserId:teacherId,before:{status:'Pending',inspectorId},after:{status:'Active',inspectorId},key:`ASSIGN_ACCEPT:${existing.id}:${existing.updatedAt?.toISOString()}` });
    return db.inspectorAssignment.findUnique({ where: { teacherId } });
  }, 'assignmentService.acceptAssignment');
}

/**
 * رفض الإسناد من طرف المفتش — يقبل فقط سجلاً Pending بنفس المفتش
 * reason اختياري
 */
export async function rejectAssignment(teacherId: string, inspectorId: string, reason?: string) {
  return assignmentTransaction(async (db) => {
    const existing = await db.inspectorAssignment.findUnique({ where: { teacherId } });
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
      console.log(
        `Inspector ${inspectorId} rejected assignment for teacher ${teacherId}: ${reason}`
      );
    }

    const changed = await db.inspectorAssignment.updateMany({
      where: { teacherId, inspectorId, status: 'Pending', updatedAt: existing.updatedAt },
      data: { status: 'Removed', inspectorId: null, assignedAt: null },
    });
    if (changed.count !== 1)
      throw new AssignmentError('ALREADY_HANDLED', 'تغير هذا الإسناد قبل تأكيد الرفض.');
    await appendAudit(db, { eventType:'TEACHER_ASSIGNMENT_REJECTED',actorUserId:inspectorId,entityType:'TEACHER_ASSIGNMENT',entityId:existing.id,affectedUserId:teacherId,before:{status:'Pending',inspectorId},after:{status:'Removed',inspectorId:null},reason,key:`ASSIGN_REJECT:${existing.id}:${existing.updatedAt?.toISOString()}` });
    return db.inspectorAssignment.findUnique({ where: { teacherId } });
  }, 'assignmentService.rejectAssignment');
}
