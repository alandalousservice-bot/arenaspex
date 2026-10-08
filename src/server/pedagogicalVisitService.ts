import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { InspectionVisitRecord, Prisma } from '@prisma/client';
import { prisma } from './prismaClient.js';
import { assignmentTransaction } from './assignmentTransferService.js';
import { appendAudit } from './auditService.js';
import { canInspectorAccessTeacher } from './assignmentService.js';
import { isCanonicalAcademicYearId } from '../services/academicYear.js';
import { VISIT_TYPE_LABELS, VISIT_STATUS_LABELS, type VisitStatus } from '../types/pedagogicalVisit.js';

export class VisitError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function legacyVisitVisibleToTeacher(data: unknown) {
  const value = (data as { visitDate?: unknown } | null)?.visitDate;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return value.slice(0, 10) <= today;
}
const year = z.string().refine(isCanonicalAcademicYearId);
// Explicit offset is mandatory, with round-trip validation of the calendar date.
const dateTime = z.string().datetime({ offset: true }).refine((s) => Number.isFinite(new Date(s).getTime()));
const scheduleInput = z.object({ teacherId: z.string().min(1), visitType: z.enum(['GUIDANCE', 'TENURE', 'MONITORING']), scheduledAt: dateTime, academicYearId: year, classId: z.string().min(1).nullable().optional(), weeklySlotId: z.string().min(1).nullable().optional() }).strict();
const actionInput = z.object({ revision: z.number().int().nonnegative(), action: z.enum(['COMPLETE', 'POSTPONE', 'RESCHEDULE', 'CANCEL', 'COMMUNICATE']), reason: z.string().trim().max(1000).optional(), scheduledAt: dateTime.optional() }).strict();
type Actor = { id: string; role: string };
export async function lockVisitAssignmentHead(tx: Prisma.TransactionClient, teacherId: string) {
  try { await tx.$queryRaw`SELECT id FROM "InspectorAssignment" WHERE "teacherId"=${teacherId} FOR UPDATE`; }
  catch (error) {
    const raw = error as { code?: string; meta?: { code?: string } };
    // Prisma surfaces raw SELECT FOR UPDATE serialization/deadlock failures as
    // P2010, unlike ORM writes (P2034). Feed both into the existing retry loop.
    if (raw.code === 'P2010' && ['40001', '40P01'].includes(raw.meta?.code || '')) throw Object.assign(new Error('Assignment head changed during visit transaction'), { code: 'P2034' });
    throw error;
  }
}
async function authorize(tx: Prisma.TransactionClient, actor: Actor, teacherId: string) {
  if (actor.role !== 'inspector') throw new VisitError(403, 'مساحة المفتش فقط.');
  // Lock the current head until commit, so accepted transfer cannot overtake a
  // visit mutation authorized against the old head.
  await lockVisitAssignmentHead(tx, teacherId);
  if (actor.role !== 'inspector' || !await canInspectorAccessTeacher(actor.id, teacherId, tx)) throw new VisitError(403, 'لا تملك صلاحية إدارة زيارة لهذا الأستاذ.');
}
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new VisitError(400, 'بيانات الزيارة غير صالحة.');
  return result.data;
}
function validateTime(value: string, academicYearId: string) {
  const time = new Date(value);
  const [start, end] = academicYearId.split('-').map(Number);
  if (time < new Date(`${start}-09-01T00:00:00+01:00`) || time >= new Date(`${end}-09-01T00:00:00+01:00`)) throw new VisitError(400, 'التاريخ خارج السنة الدراسية المختارة.');
  if (time.getTime() < Date.now()) throw new VisitError(400, 'اختر موعدًا مستقبليًا للبرمجة.');
  return time;
}
export function inspectorVisitView(row: InspectionVisitRecord) {
  const { data: _legacyData, ...visit } = row;
  void _legacyData;
  return visit;
}
function teacherVisitView(row: InspectionVisitRecord) {
  return { id: row.id, visitType: row.visitType, status: row.status, scheduledAt: row.scheduledAt, academicYearId: row.academicYearId, completedAt: row.completedAt, teacherNotifiedAt: row.teacherNotifiedAt };
}
async function notify(tx: Prisma.TransactionClient, row: InspectionVisitRecord, actorId: string) {
  // One durable notification per appointment: subsequent state changes replace
  // stale appointment information, not create duplicate automatic notifications.
  const message = `${VISIT_TYPE_LABELS.TENURE} · ${VISIT_STATUS_LABELS[row.status!]} · ${new Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', dateStyle: 'medium', timeStyle: 'short' }).format(row.scheduledAt!)}`;
  const id = `visit_${row.id}`;
  const data = { visitId: row.id, type: 'visit_appointment', message, status: row.status, scheduledAt: row.scheduledAt!.toISOString() };
  await tx.communityNotification.upsert({ where: { id }, create: { id, userId: row.teacherId, senderId: actorId, type: 'visit_appointment', title: 'موعد زيارة التثبيت', message, data }, update: { userId: row.teacherId, senderId: actorId, type: 'visit_appointment', title: 'تحديث موعد زيارة التثبيت', message, data, read: false, readAt: null } });
}
export async function scheduleVisit(actor: Actor, value: unknown) {
  const input = parse(scheduleInput, value);
  const scheduledAt = validateTime(input.scheduledAt, input.academicYearId);
  return assignmentTransaction(async (tx) => {
    await authorize(tx, actor, input.teacherId);
    const teacher = await tx.user.findUniqueOrThrow({ where: { id: input.teacherId }, select: { institutionId: true, eduSchoolId: true } });
    let classId = input.classId || null;
    if (input.weeklySlotId) {
      const slot = await tx.teacherWeeklySlot.findFirst({ where: { id: input.weeklySlotId, teacherId: input.teacherId, academicYearId: input.academicYearId } });
      if (!slot || (classId && classId !== slot.classId)) throw new VisitError(400, 'الحصة الأسبوعية لا تخص الأستاذ أو الفوج المحدد.');
      classId = slot.classId;
    }
    if (classId && !await tx.studentClass.findFirst({ where: { id: classId, teacherId: input.teacherId } })) throw new VisitError(400, 'الفوج لا يخص الأستاذ.');
    const now = new Date();
    const row = await tx.inspectionVisitRecord.create({ data: { id: `pv_${randomUUID()}`, inspectorId: actor.id, teacherId: input.teacherId, institutionId: teacher.institutionId || teacher.eduSchoolId, visitType: input.visitType, status: 'SCHEDULED', scheduledAt, academicYearId: input.academicYearId, classId, weeklySlotId: input.weeklySlotId || null, updatedAt: now, data: { pedagogicalGrade: null, officialReportGenerated: false }, history: [{ action: 'SCHEDULE', actorId: actor.id, at: now.toISOString(), to: 'SCHEDULED', scheduledAt: scheduledAt.toISOString() }] } });
    await appendAudit(tx, { eventType: 'PEDAGOGICAL_VISIT_SCHEDULED', actorUserId: actor.id, entityType: 'PEDAGOGICAL_VISIT', entityId: row.id, affectedUserId: row.teacherId, after: { status: row.status, visitType: row.visitType, academicYearId: row.academicYearId, scheduledAt: row.scheduledAt }, key: `VISIT_SCHEDULE:${row.id}` });
    return inspectorVisitView(row);
  });
}
export async function actOnVisit(actor: Actor, id: string, value: unknown) {
  const input = parse(actionInput, value);
  return assignmentTransaction(async (tx) => {
    const row = await tx.inspectionVisitRecord.findUnique({ where: { id } });
    if (!row?.status) throw new VisitError(404, 'الزيارة غير متاحة في دورة البرمجة.');
    await authorize(tx, actor, row.teacherId);
    if (row.revision !== input.revision) throw new VisitError(409, 'تغيرت الزيارة؛ حدّث الصفحة قبل المحاولة.');
    const now = new Date();
    const update: Prisma.InspectionVisitRecordUpdateManyMutationInput = { revision: { increment: 1 }, updatedAt: now };
    let to: VisitStatus = row.status;
    if (input.action === 'COMMUNICATE') {
      if (row.visitType !== 'TENURE' || row.status !== 'SCHEDULED' || row.teacherNotifiedAt || row.scheduledAt! <= now) throw new VisitError(409, 'الإبلاغ متاح لزيارة تثبيت مستقبلية مبرمجة لم يتم إبلاغها.');
      update.teacherNotifiedAt = now; update.teacherNotifiedById = actor.id;
    } else if (input.action === 'RESCHEDULE') {
      if (!['POSTPONED', 'SCHEDULED'].includes(row.status)) throw new VisitError(409, 'لا يمكن إعادة برمجة هذه الحالة.');
      if (!input.scheduledAt) throw new VisitError(400, 'الموعد الجديد مطلوب.');
      const next = validateTime(input.scheduledAt, row.academicYearId!);
      if (row.status === 'SCHEDULED' && next.getTime() === row.scheduledAt!.getTime()) throw new VisitError(409, 'الموعد لم يتغير.');
      update.scheduledAt = next; to = 'SCHEDULED';
    } else if (input.action === 'CANCEL') {
      if (!['SCHEDULED', 'POSTPONED'].includes(row.status)) throw new VisitError(409, 'لا يمكن إلغاء هذه الحالة.');
      if (!input.reason) throw new VisitError(400, 'سبب الإلغاء مطلوب.');
      to = 'CANCELLED'; update.cancelledAt = now; update.cancelledById = actor.id; update.cancellationReason = input.reason;
    } else {
      if (row.status !== 'SCHEDULED') throw new VisitError(409, 'الإجراء متاح للزيارة المبرمجة فقط.');
      if (input.action === 'COMPLETE') {
        if (row.scheduledAt! > now) throw new VisitError(409, 'لا يمكن إتمام زيارة قبل موعدها.');
        to = 'COMPLETED'; update.completedAt = now;
      } else {
        if (!input.reason) throw new VisitError(400, 'سبب التأجيل مطلوب.');
        to = 'POSTPONED'; update.postponedAt = now; update.postponedById = actor.id; update.postponementReason = input.reason;
      }
    }
    update.status = to;
    const history = Array.isArray(row.history) ? row.history : [];
    update.history = [...history, { action: input.action, actorId: actor.id, at: now.toISOString(), from: row.status, to, scheduledAt: (update.scheduledAt instanceof Date ? update.scheduledAt : row.scheduledAt!).toISOString(), ...(input.reason ? { reason: input.reason } : {}) }] as Prisma.InputJsonValue;
    const changed = await tx.inspectionVisitRecord.updateMany({ where: { id, revision: input.revision, status: row.status }, data: update });
    if (changed.count !== 1) throw new VisitError(409, 'تعارض في تعديل الزيارة.');
    const result = await tx.inspectionVisitRecord.findUniqueOrThrow({ where: { id } });
    if (result.visitType === 'TENURE' && result.teacherNotifiedAt) await notify(tx, result, actor.id);
    const eventType = ({ COMPLETE: 'PEDAGOGICAL_VISIT_COMPLETED', POSTPONE: 'PEDAGOGICAL_VISIT_POSTPONED', CANCEL: 'PEDAGOGICAL_VISIT_CANCELLED', RESCHEDULE: 'PEDAGOGICAL_VISIT_RESCHEDULED', COMMUNICATE: 'TENURE_VISIT_COMMUNICATED' } as const)[input.action];
    await appendAudit(tx, { eventType, actorUserId: actor.id, entityType: 'PEDAGOGICAL_VISIT', entityId: id, affectedUserId: row.teacherId, before: { status: row.status, scheduledAt: row.scheduledAt }, after: { status: to, scheduledAt: result.scheduledAt, revision: result.revision, visitType: result.visitType }, reason: input.reason, key: `VISIT_ACTION:${id}:${result.revision}` });
    return inspectorVisitView(result);
  });
}
export async function listInspectorVisits(actor: Actor, teacherId?: string, academicYearId?: string) {
  return assignmentTransaction(async (tx) => {
    if (actor.role !== 'inspector') throw new VisitError(403, 'مساحة المفتش فقط.');
    if (teacherId) await authorize(tx, actor, teacherId);
    const assignments = await tx.inspectorAssignment.findMany({ where: { inspectorId: actor.id, status: { in: ['Active', 'Changed'] } }, select: { teacherId: true } });
    const rows = await tx.inspectionVisitRecord.findMany({ where: { teacherId: teacherId || { in: assignments.map((a) => a.teacherId) }, status: { not: null }, ...(academicYearId ? { academicYearId } : {}) }, orderBy: { scheduledAt: 'asc' } });
    return rows.map(inspectorVisitView);
  });
}
export async function listTeacherAppointments(actor: Actor, id?: string) {
  if (actor.role !== 'teacher') throw new VisitError(403, 'مساحة الأستاذ فقط.');
  const rows = await prisma.inspectionVisitRecord.findMany({ where: { ...(id ? { id } : {}), teacherId: actor.id, visitType: 'TENURE', status: { not: null }, teacherNotifiedAt: { not: null } }, orderBy: { scheduledAt: 'asc' } });
  if (id && !rows.length) throw new VisitError(404, 'الموعد غير متاح.');
  return rows.map(teacherVisitView);
}
