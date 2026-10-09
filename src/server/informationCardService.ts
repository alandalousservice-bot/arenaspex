import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './prismaClient.js';
import { assignmentTransaction } from './assignmentTransferService.js';
import { appendAudit } from './auditService.js';
import { canInspectorAccessTeacher } from './assignmentService.js';
import { currentAcademicYearId } from './accountAccess.js';
import { isAccountAccessExpired } from './accountAccess.js';
import { CARD_SECTIONS, ADMINISTRATIVE_STATUSES, type CardSnapshot, type CardExtra } from '../types/informationCard.js';
import { durationMinutes, WEEKDAYS } from '../services/weeklyTimetable.js';

type Db = Prisma.TransactionClient;
export type CardActor = { id: string; role: string };
export class CardError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const date = z.string().refine((value) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), 'تاريخ غير صالح');
const fields: Record<string, z.ZodTypeAny> = {};
for (const section of CARD_SECTIONS) for (const [key, , type] of section.fields as readonly (readonly [string, string, string?])[]) {
  fields[key] = (type === 'date' ? date : z.string().trim().max(key === 'otherInformation' ? 450 : key === 'address' ? 240 : 100)).optional();
}
fields.institutionEmail = z.union([z.literal(''), z.string().email().max(100)]).optional();
fields.inspectionMark = z.string().refine((value) => !value || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0 && Number(value) <= 20), 'النقطة بين 0 و20').optional();
fields.administrativeStatus = z.union([z.literal(''), z.enum(ADMINISTRATIVE_STATUSES)]).optional();
fields.qualifications = z.array(z.object({ certificate: z.string().trim().max(60), issuer: z.string().trim().max(60), date }).strict()).max(5).default([]);
export const cardSaveSchema = z.object({
  revision: z.number().int().nonnegative(),
  identity: z.object({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100), birthDate: date, phone: z.string().trim().max(40) }).strict(),
  extra: z.object(fields).strict(),
}).strict();

async function authorize(db: Db, actor: CardActor, teacherId: string, edit = false) {
  if (actor.role === 'teacher' && actor.id === teacherId) return;
  if (!edit && actor.role === 'inspector' && await canInspectorAccessTeacher(actor.id, teacherId, db)) return;
  // Existing Admin account administration remains unchanged. This feature adds
  // no new Admin personal-data editing or card review privilege.
  throw new CardError(403, 'لا تملك صلاحية الوصول إلى بطاقة هذا الأستاذ.');
}
async function currentSnapshot(db: Db, teacherId: string): Promise<CardSnapshot> {
  const user = await db.user.findUnique({ where: { id: teacherId }, include: { eduSchool: true, eduDirectorate: true, eduDistrict: true } });
  if (!user || user.role !== 'teacher') throw new CardError(404, 'الأستاذ غير موجود.');
  const [card, school, directorate, district] = await Promise.all([
    db.teacherInformationCard.findUnique({ where: { teacherId } }),
    user.institutionId ? db.school.findUnique({ where: { id: user.institutionId } }) : null,
    user.directorateId ? db.directorate.findUnique({ where: { id: user.directorateId } }) : null,
    user.districtId ? db.inspectionDistrict.findUnique({ where: { id: user.districtId } }) : null,
  ]);
  return {
    identity: { id: user.id, firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate?.toISOString().slice(0, 10) || '', phone: user.phone || '', email: user.email,
      avatar: user.avatar || '', institution: school?.name || user.eduSchool?.name || user.schoolName || '', directorate: directorate?.name || user.eduDirectorate?.name || '', district: district?.name || user.eduDistrict?.name || '', academicYear: currentAcademicYearId() },
    extra: (card?.extra as unknown as CardExtra) || { qualifications: [] },
  };
}
export function missingCardFields(snapshot: CardSnapshot) {
  // Minimal submission contract: identity + institution + cadre/status. Other
  // fillable fields remain optional (e.g. maiden surname, tenure for trainees).
  return [!snapshot.identity.firstName && 'الاسم', !snapshot.identity.lastName && 'اللقب', !snapshot.identity.birthDate && 'تاريخ الازدياد', !snapshot.identity.institution && 'المؤسسة الأم', !snapshot.extra.cadre && 'الإطار', !snapshot.extra.administrativeStatus && 'الوضعية الإدارية'].filter(Boolean) as string[];
}
async function readInDb(db: Db, actor: CardActor, teacherId: string) {
  await authorize(db, actor, teacherId);
  const current = await currentSnapshot(db, teacherId);
  const card = await db.teacherInformationCard.findUnique({ where: { teacherId } });
  const history = await db.teacherInformationCardSubmission.findMany({ where: { teacherId }, orderBy: { submittedAt: 'desc' } });
  return { current, revision: card?.revision || 0, status: card?.status || 'DRAFT', missingRequired: missingCardFields(current), submission: history.find((row) => row.id === card?.latestSubmissionId) || null, history };
}
export const readCard = (actor: CardActor, teacherId: string) => assignmentTransaction((db) => readInDb(db, actor, teacherId), 'informationCardService.readCard');
export async function saveCard(actor: CardActor, teacherId: string, input: z.infer<typeof cardSaveSchema>) {
  return assignmentTransaction(async (db) => {
    await authorize(db, actor, teacherId, true);
    const card = await db.teacherInformationCard.findUnique({ where: { teacherId } });
    if ((card?.revision || 0) !== input.revision) throw new CardError(409, 'تغيرت البطاقة. حدّث الصفحة قبل الحفظ.');
    if (card?.status === 'SUBMITTED') throw new CardError(409, 'البطاقة قيد المراجعة. يمكن تعديلها عند طلب التصحيح.');
    await db.user.update({ where: { id: teacherId }, data: { firstName: input.identity.firstName, lastName: input.identity.lastName, birthDate: input.identity.birthDate ? new Date(input.identity.birthDate) : null, phone: input.identity.phone || null } });
    const data = { extra: input.extra as Prisma.InputJsonValue, revision: input.revision + 1, status: card?.status === 'NEEDS_CORRECTION' ? 'NEEDS_CORRECTION' : 'DRAFT' };
    await db.teacherInformationCard.upsert({ where: { teacherId }, create: { teacherId, ...data }, update: data });
    return readInDb(db, actor, teacherId);
  }, 'informationCardService.saveCard');
}
export async function submitCard(actor: CardActor, teacherId: string, revision: number) {
  return assignmentTransaction(async (db) => {
    await authorize(db, actor, teacherId, true);
    const card = await db.teacherInformationCard.findUnique({ where: { teacherId } });
    if (!card || card.revision !== revision || !['DRAFT', 'NEEDS_CORRECTION'].includes(card.status)) throw new CardError(409, 'احفظ المسودة أولاً أو حدّث حالة البطاقة.');
    const snapshot = await currentSnapshot(db, teacherId);
    const missing = missingCardFields(snapshot);
    if (missing.length) throw new CardError(400, `حقول مطلوبة: ${missing.join('، ')}`);
    const head = await db.inspectorAssignment.findUnique({ where: { teacherId } });
    if (!head?.inspectorId || !['Active', 'Changed'].includes(head.status)) throw new CardError(409, 'يلزم إسناد حالي مقبول قبل إرسال البطاقة للمفتش.');
    const supervisor = await db.user.findUnique({where:{id:head.inspectorId}});
    if(!supervisor || supervisor.role!=='inspector' || supervisor.status!=='active' || !supervisor.isApprovedByAdmin || isAccountAccessExpired(supervisor.accessExpiresAt))
      throw new CardError(409,'المفتش الحالي غير مفعّل؛ لا يمكن إرسال البطاقة حتى اعتماد الإشراف الحالي.');
    const submission = await db.teacherInformationCardSubmission.create({ data: { teacherId, revision, snapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue, submittedInspectorId: head.inspectorId } });
    await db.teacherInformationCard.update({ where: { teacherId }, data: { status: 'SUBMITTED', latestSubmissionId: submission.id } });
    await appendAudit(db, { eventType: card.status === 'NEEDS_CORRECTION' ? 'INFORMATION_CARD_RESUBMITTED' : 'INFORMATION_CARD_SUBMITTED', actorUserId: actor.id, entityType: 'INFORMATION_CARD', entityId: submission.id, affectedUserId: teacherId, before: { status: card.status }, after: { status: 'SUBMITTED', revision, submittedInspectorId: head.inspectorId }, key: `CARD_SUBMIT:${submission.id}` });
    return readInDb(db, actor, teacherId);
  }, 'informationCardService.submitCard');
}
export async function reviewCard(actor: CardActor, teacherId: string, id: string, decision: 'VERIFIED' | 'NEEDS_CORRECTION', reason?: string) {
  return assignmentTransaction(async (db) => {
    if (actor.role !== 'inspector') throw new CardError(403, 'المراجعة متاحة للمفتش الحالي فقط.');
    await authorize(db, actor, teacherId);
    const card = await db.teacherInformationCard.findUnique({ where: { teacherId } });
    const submission = await db.teacherInformationCardSubmission.findUnique({ where: { id } });
    if (!submission || submission.teacherId !== teacherId || card?.latestSubmissionId !== id || card.status !== 'SUBMITTED' || submission.status !== 'SUBMITTED') throw new CardError(409, 'تغيرت حالة الإرسال أو تمت مراجعته مسبقًا.');
    if (decision === 'NEEDS_CORRECTION' && !reason?.trim()) throw new CardError(400, 'يجب توضيح سبب التصحيح.');
    await db.teacherInformationCardSubmission.update({ where: { id }, data: { status: decision, reviewedAt: new Date(), reviewedById: actor.id, correctionReason: decision === 'NEEDS_CORRECTION' ? reason!.trim() : null } });
    await db.teacherInformationCard.update({ where: { teacherId }, data: { status: decision } });
    await appendAudit(db, { eventType: decision === 'VERIFIED' ? 'INFORMATION_CARD_VERIFIED' : 'INFORMATION_CARD_CORRECTION_REQUESTED', actorUserId: actor.id, entityType: 'INFORMATION_CARD', entityId: id, affectedUserId: teacherId, before: { status: 'SUBMITTED' }, after: { status: decision }, reason, key: `CARD_REVIEW:${id}` });
    return readInDb(db, actor, teacherId);
  }, 'informationCardService.reviewCard');
}
export async function readDossier(actor: CardActor, teacherId: string, academicYearId: string) {
  if (actor.role !== 'inspector') throw new CardError(403, 'ملف الإشراف متاح للمفتش الحالي فقط.');
  return assignmentTransaction(async (db) => {
    const card = await readInDb(db, actor, teacherId);
    const [classes, pupilCounts, slots, annualPlans] = await Promise.all([
      db.studentClass.findMany({ where: { teacherId }, select: { id: true, name: true, levelId: true } }),
      db.student.groupBy({ by: ['classId'], where: { teacherId }, _count: { _all: true } }),
      db.teacherWeeklySlot.findMany({ where: { teacherId, academicYearId }, include: { class: { select: { name: true, levelId: true } } }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] }),
      db.annualPlan.findMany({ where: { teacherId, academicYearId, kind: 'annual_plan_new' }, orderBy: { updatedAt: 'desc' } }),
    ]);
    const groups = classes.map((group) => ({ ...group, pupilCount: pupilCounts.find((row) => row.classId === group.id)?._count._all || 0 }));
    const weeklySchedule = slots.map((slot) => ({ ...slot, className: slot.class.name, levelId: slot.class.levelId, day: WEEKDAYS[slot.weekday], timeSlot: `${slot.startTime} - ${slot.endTime}` }));
    return { card, academicYearId, groups, annualPlans, weeklySchedule, summary: { identity: card.current.identity, professionalStatus: card.current.extra.administrativeStatus || '', cardStatus: card.status, classCount: groups.length, totalPupils: pupilCounts.reduce((sum, row) => sum + row._count._all, 0), weeklyMinutes: slots.length ? weeklySchedule.reduce((sum, slot) => sum + durationMinutes(slot), 0) : null } };
  }, 'informationCardService.readDossier');
}
