import { Prisma } from '@prisma/client';
import { retryTransaction } from './transactionRetry.js';
import { prisma } from './prismaClient.js';
import { isAccountAccessExpired } from './accountAccess.js';
import { appendAudit, auditAccountChange } from './auditService.js';

type Db = Prisma.TransactionClient;
export class TransferError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID',
    message: string,
    public retryable = false
  ) {
    super(message);
  }
}
const accepted = ['Active', 'Changed'];
const geography = (u: {
  directorateId: string;
  districtId: string;
  eduDirectorateId?: string | null;
  eduDistrictId?: string | null;
}) => ({
  directorateId: u.directorateId || u.eduDirectorateId || '',
  districtId: u.districtId || u.eduDistrictId || '',
});
const name = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();

// Serializable retries use the existing Prisma transaction mechanism. A failed
// CAS throws inside the transaction, rolling back the entire decision/switch.
export async function assignmentTransaction<T>(work: (db: Db) => Promise<T>, operation = 'assignment'): Promise<T> {
  try {
    return await retryTransaction(operation, () => prisma.$transaction(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'P2034' || code === 'P2002')
      throw new TransferError('CONFLICT', code === 'P2034'
        ? 'تعذر الحفظ بسبب تعارض مؤقت. تغييراتك لم تُحفظ؛ أعد المحاولة.'
        : 'تغيرت حالة الإسناد أو يوجد طلب معلّق. حدّث الصفحة.', code === 'P2034');
    throw error;
  }
}

export function transferConflictPayload(error: TransferError) {
  return { error: error.message, ...(error.retryable ? { code: 'TRANSACTION_CONFLICT', retryable: true } : {}) };
}

export async function assertTeacherGeographyUnchanged(
  db: Db,
  teacher: Parameters<typeof geography>[0] & { id: string },
  data: Record<string, unknown>
) {
  const current = await db.inspectorAssignment.findUnique({ where: { teacherId: teacher.id } });
  if (!current || !accepted.includes(current.status)) return;
  const geo = geography(teacher);
  for (const [field, expected] of Object.entries({
    directorateId: geo.directorateId,
    eduDirectorateId: geo.directorateId,
    districtId: geo.districtId,
    eduDistrictId: geo.districtId,
  })) {
    if (field in data && data[field] !== undefined && (data[field] || '') !== expected) {
      throw new TransferError(
        'CONFLICT',
        'تغيير مقاطعة أستاذ مسند يتطلب طلب نقل وقبول المفتش الوجهة.'
      );
    }
  }
}

export async function updateTeacherProfile(
  id: string,
  data: Record<string, unknown>,
  include?: Prisma.UserInclude,
  actorUserId?: string
) {
  return assignmentTransaction(async (db) => {
    const teacher = await db.user.findUnique({ where: { id } });
    if (!teacher || teacher.role !== 'teacher')
      throw new TransferError('NOT_FOUND', 'الأستاذ غير موجود.');
    if(teacher.status==='archived')throw new TransferError('FORBIDDEN','الحساب مؤرشف وللقراءة فقط.');
    await assertTeacherGeographyUnchanged(db, teacher, data);
    const saved = await db.user.update({
      where: { id },
      data: data as Prisma.UserUpdateInput,
      ...(include ? { include } : {}),
    });
    if (actorUserId) await auditAccountChange(db, actorUserId, teacher, saved);
    return saved;
  }, 'assignmentTransferService.updateTeacherProfile');
}

async function destination(db: Db, inspectorId: string, expectedDistrict?: string) {
  const inspector = await db.user.findUnique({ where: { id: inspectorId } });
  if (
    !inspector ||
    inspector.role !== 'inspector' ||
    inspector.status !== 'active' ||
    !inspector.isApprovedByAdmin ||
    isAccountAccessExpired(inspector.accessExpiresAt)
  ) {
    throw new TransferError('INVALID', 'المفتش الوجهة غير نشط أو غير معتمد.');
  }
  const geo = geography(inspector);
  const district = await db.inspectionDistrict.findUnique({ where: { id: geo.districtId } });
  if (
    !district ||
    district.directorateId !== geo.directorateId ||
    (expectedDistrict && geo.districtId !== expectedDistrict)
  ) {
    throw new TransferError('INVALID', 'المفتش الوجهة غير مخوّل للمقاطعة المطلوبة.');
  }
  const duplicate = await db.user.findFirst({
    where: {
      id: { not: inspector.id },
      role: 'inspector',
      status: 'active',
      OR: [{ districtId: geo.districtId }, { eduDistrictId: geo.districtId }],
    },
  });
  if (duplicate)
    throw new TransferError('CONFLICT', 'المقاطعة مرتبطة بأكثر من مفتش نشط؛ يلزم تصحيح الانتساب.');
  return { inspector, district, ...geo };
}

async function schoolForDestination(
  db: Db,
  institutionId: string | null | undefined,
  directorateId: string,
  districtId: string
) {
  if (!institutionId) return null;
  const school = await db.school.findUnique({
    where: { id: institutionId },
    include: { municipality: true },
  });
  if (
    !school ||
    school.municipality.directorateId !== directorateId ||
    (school.inspectionDistrictId && school.inspectionDistrictId !== districtId)
  ) {
    throw new TransferError('INVALID', 'المؤسسة الوجهة لا تتبع المديرية أو المقاطعة المطلوبة.');
  }
  return school;
}

export async function requestTeacherTransfer(input: {
  teacherId: string;
  destinationInspectorId: string;
  requestedById: string;
  destinationDistrictId?: string;
  destinationInstitutionId?: string;
}) {
  return assignmentTransaction(async (db) => {
    const [teacher, current, actor] = await Promise.all([
      db.user.findUnique({ where: { id: input.teacherId } }),
      db.inspectorAssignment.findUnique({ where: { teacherId: input.teacherId } }),
      db.user.findUnique({ where: { id: input.requestedById } }),
    ]);
    if (
      !teacher ||
      teacher.role !== 'teacher' || teacher.status === 'archived' ||
      !current?.inspectorId ||
      !accepted.includes(current.status)
    )
      throw new TransferError('CONFLICT', 'لا يوجد إسناد حالي مقبول لنقله.');
    if (
      !actor ||
      actor.status !== 'active' ||
      !actor.isApprovedByAdmin ||
      isAccountAccessExpired(actor.accessExpiresAt) ||
      !(actor.role === 'admin' || (actor.role === 'teacher' && actor.id === teacher.id))
    ) {
      throw new TransferError('FORBIDDEN', 'بدء هذا الطلب متاح للأستاذ صاحب الحساب أو المشرف فقط.');
    }
    const target = await destination(db, input.destinationInspectorId, input.destinationDistrictId);
    const source = geography(teacher);
    if (target.inspector.id === current.inspectorId || target.districtId === source.districtId)
      throw new TransferError('INVALID', 'الأستاذ تحت إشراف المقاطعة الحالية بالفعل.');
    await schoolForDestination(
      db,
      input.destinationInstitutionId,
      target.directorateId,
      target.districtId
    );
    const previous = await db.inspectorAssignmentTransfer.findUnique({
      where: { pendingTeacherId: teacher.id },
    });
    if (previous)
      throw new TransferError('CONFLICT', 'يوجد طلب نقل معلّق لهذا الأستاذ. يجب البت فيه أولاً.');
    const [sourceInspector, sourceDistrict] = await Promise.all([
      db.user.findUnique({ where: { id: current.inspectorId } }),
      db.inspectionDistrict.findUnique({ where: { id: source.districtId } }),
    ]);
    if (
      !sourceInspector ||
      !sourceDistrict ||
      sourceDistrict.directorateId !== source.directorateId
    )
      throw new TransferError('CONFLICT', 'الانتساب الحالي غير متسق؛ يلزم مراجعته قبل النقل.');
    const created = await db.inspectorAssignmentTransfer.create({
      data: {
        teacherId: teacher.id,
        pendingTeacherId: teacher.id,
        sourceAssignmentId: current.id,
        sourceAssignmentUpdatedAt: current.updatedAt,
        sourceAssignedAt: current.assignedAt,
        sourceInspectorId: current.inspectorId,
        sourceDirectorateId: source.directorateId,
        sourceDistrictId: source.districtId,
        destinationInspectorId: target.inspector.id,
        destinationDirectorateId: target.directorateId,
        destinationDistrictId: target.districtId,
        destinationInstitutionId: input.destinationInstitutionId || null,
        requestedById: actor.id,
        snapshot: {
          teacherName: name(teacher),
          institutionName: teacher.schoolName || '',
          sourceInspectorName: name(sourceInspector),
          sourceDistrictName: sourceDistrict.name,
          destinationInspectorName: name(target.inspector),
          destinationDistrictName: target.district.name,
        },
      },
    });
    await appendAudit(db, { eventType: 'TEACHER_TRANSFER_REQUESTED', actorUserId: actor.id, entityType: 'TEACHER_TRANSFER', entityId: created.id, affectedUserId: teacher.id, before: { inspectorId: current.inspectorId, districtId: source.districtId }, after: { status: 'Pending', inspectorId: target.inspector.id, districtId: target.districtId }, key: `TRANSFER_REQUEST:${created.id}` });
    return created;
  }, 'assignmentTransferService.requestTeacherTransfer');
}

// Initial requests also must not race with an accepted current assignment.
export async function createInitialAssignmentRequest(teacherId: string, inspectorId: string, actorUserId = teacherId) {
  return assignmentTransaction(async (db) => {
    const teacher = await db.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.role !== 'teacher')
      throw new TransferError('NOT_FOUND', 'الأستاذ غير موجود.');
    const current = await db.inspectorAssignment.findUnique({ where: { teacherId } });
    if (current && accepted.includes(current.status)) {
      if (current.inspectorId === inspectorId) return current;
      throw new TransferError(
        'CONFLICT',
        'تغير الإسناد الحالي؛ استخدم طلب النقل بعد تحديث الصفحة.'
      );
    }
    const geo = geography(teacher);
    const target = await destination(db, inspectorId, geo.districtId);
    if (!geo.districtId || target.directorateId !== geo.directorateId)
      throw new TransferError('INVALID', 'المفتش لا يتبع مقاطعة الأستاذ.');
    const saved = await db.inspectorAssignment.upsert({
      where: { teacherId },
      create: { teacherId, inspectorId, status: 'Pending', assignedAt: null },
      update: { inspectorId, status: 'Pending', assignedAt: null },
    });
    if (!current || current.status !== 'Pending' || current.inspectorId !== inspectorId)
      await appendAudit(db, { eventType: 'TEACHER_ASSIGNMENT_REQUESTED', actorUserId, entityType:'TEACHER_ASSIGNMENT',entityId:saved.id,affectedUserId:teacherId,before:current || undefined,after:saved,key:`INITIAL_ASSIGN:${saved.id}:${saved.updatedAt.toISOString()}` });
    return saved;
  }, 'assignmentTransferService.createInitialAssignmentRequest');
}

export async function decideTeacherTransfer(
  id: string,
  inspectorId: string,
  decision: 'Accepted' | 'Rejected',
  reason?: string
) {
  return assignmentTransaction(async (db) => {
    const request = await db.inspectorAssignmentTransfer.findUnique({ where: { id } });
    if (!request) throw new TransferError('NOT_FOUND', 'طلب النقل غير موجود.');
    if (request.destinationInspectorId !== inspectorId)
      throw new TransferError('FORBIDDEN', 'هذا الطلب موجّه إلى مفتش آخر.');
    if (request.status !== 'Pending')
      throw new TransferError('CONFLICT', 'تم البت في هذا الطلب مسبقاً.');
    const now = new Date();
    if (decision === 'Accepted') {
      const target = await destination(db, inspectorId, request.destinationDistrictId);
      if (target.directorateId !== request.destinationDirectorateId)
        throw new TransferError('CONFLICT', 'تغيرت مديرية المفتش الوجهة.');
      const teacher = await db.user.findUnique({ where: { id: request.teacherId } });
      if (
        !teacher ||
        teacher.role !== 'teacher' ||
        geography(teacher).districtId !== request.sourceDistrictId ||
        geography(teacher).directorateId !== request.sourceDirectorateId
      )
        throw new TransferError('CONFLICT', 'تغير الانتساب الحالي للأستاذ منذ إنشاء الطلب.');
      const school = await schoolForDestination(
        db,
        request.destinationInstitutionId,
        target.directorateId,
        target.districtId
      );
      const changed = await db.inspectorAssignment.updateMany({
        where: {
          id: request.sourceAssignmentId,
          teacherId: request.teacherId,
          inspectorId: request.sourceInspectorId,
          status: { in: accepted },
          updatedAt: request.sourceAssignmentUpdatedAt,
        },
        data: { inspectorId, status: 'Changed', assignedAt: now },
      });
      if (changed.count !== 1)
        throw new TransferError('CONFLICT', 'الإسناد الحالي تغير أو لم يعد مقبولاً.');
      await db.user.update({
        where: { id: teacher.id },
        data: {
          directorateId: target.directorateId,
          eduDirectorateId: target.directorateId,
          districtId: target.districtId,
          eduDistrictId: target.districtId,
          institutionId: school?.id || null,
          eduSchoolId: school?.id || null,
          municipalityId: school?.municipalityId || null,
          municipality: school?.municipality.name || null,
          schoolName: school?.name || null,
        },
      });
    }
    const decided = await db.inspectorAssignmentTransfer.updateMany({
      where: { id, status: 'Pending', pendingTeacherId: request.teacherId },
      data: {
        status: decision,
        pendingTeacherId: null,
        decidedAt: now,
        decidedById: inspectorId,
        effectiveAt: decision === 'Accepted' ? now : null,
        rejectionReason: decision === 'Rejected' ? reason?.trim() || null : null,
      },
    });
    if (decided.count !== 1) throw new TransferError('CONFLICT', 'تم البت في هذا الطلب مسبقاً.');
    await appendAudit(db, { eventType: decision === 'Accepted' ? 'TEACHER_TRANSFER_ACCEPTED' : 'TEACHER_TRANSFER_REJECTED', actorUserId: inspectorId, entityType: 'TEACHER_TRANSFER', entityId: id, affectedUserId: request.teacherId, before: { status: 'Pending', inspectorId: request.sourceInspectorId, districtId: request.sourceDistrictId, directorateId: request.sourceDirectorateId }, after: { status: decision, inspectorId: decision === 'Accepted' ? request.destinationInspectorId : request.sourceInspectorId, districtId: decision === 'Accepted' ? request.destinationDistrictId : request.sourceDistrictId, directorateId: decision === 'Accepted' ? request.destinationDirectorateId : request.sourceDirectorateId }, reason, key: `TRANSFER_DECISION:${id}` });
    return db.inspectorAssignmentTransfer.findUnique({ where: { id } });
  }, 'assignmentTransferService.decideTeacherTransfer');
}
