import { Prisma, type InspectionVisitRecord } from '@prisma/client';
import { z } from 'zod';
import { assignmentTransaction } from './assignmentTransferService.js';
import { appendAudit } from './auditService.js';
import { canInspectorAccessTeacher } from './assignmentService.js';
import { lockVisitAssignmentHead } from './pedagogicalVisitService.js';
import {
  GUIDANCE_SECTIONS,
  TENURE_SECTIONS,
  TENURE_LEGAL_TEXT,
  type ReportContext,
  type ReportType,
  type ReportContent,
} from '../types/visitReport.js';

type Actor = { id: string; role: string };
type Db = Prisma.TransactionClient;
export class ReportError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
const calendarDate = z
  .string()
  .refine(
    (s) =>
      !s ||
      (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
        !Number.isNaN(Date.parse(s)) &&
        new Date(s).toISOString().slice(0, 10) === s)
  );
export const lessonSchema = z
  .object({
    level: z.string().trim().max(100),
    className: z.string().trim().max(100),
    domain: z.string().trim().max(200),
    objective: z.string().trim().max(500),
  })
  .strict();
function contentSchema(type: ReportType) {
  const fields: Record<string, z.ZodTypeAny> = {};
  for (const section of type === 'GUIDANCE' ? GUIDANCE_SECTIONS : TENURE_SECTIONS)
    for (const [key, , kind] of section.fields)
      fields[key] = (
        kind === 'number'
          ? z.number().finite().positive().max(1440).nullable()
          : kind === 'date'
            ? calendarDate
            : z
                .string()
                .trim()
                .max(kind === 'long' ? 5000 : 300)
      ).optional();
  if (type === 'TENURE') {
    fields.practicalLessons = z.array(lessonSchema).max(2).optional();
    fields.decision = z.enum(['ACCEPT', 'POSTPONE', 'REJECT']).optional();
  }
  return z.object(fields).strict();
}
export function validateReportContent(type: ReportType, value: unknown): ReportContent {
  const result = contentSchema(type).safeParse(value);
  if (!result.success)
    throw new ReportError(400, 'حقول التقرير غير صالحة أو تتضمن حقولًا غير معتمدة.');
  return result.data as ReportContent;
}
export function assertReportComplete(
  type: ReportType,
  content: ReportContent,
  mark: number | null
) {
  const required =
    type === 'GUIDANCE'
      ? ['domain', 'objective', 'conclusion', 'generalAssessment']
      : [
          'directorName',
          'directorSchool',
          'teacherMemberName',
          'teacherMemberSchool',
          'oralExamination',
          'culturalValue',
          'pedagogicalValue',
          'observations',
          'finalAssessment',
          'decision',
        ];
  if (required.some((key) => typeof content[key] !== 'string' || !String(content[key]).trim()))
    throw new ReportError(400, 'أكمل الحقول الرسمية الأساسية قبل الاعتماد.');
  if (type === 'TENURE') {
    const lessons = content.practicalLessons || [];
    if (
      lessons.length < 1 ||
      lessons.length > 2 ||
      lessons.some((l) => !l.level || !l.domain || !l.objective)
    )
      throw new ReportError(
        400,
        'التثبيت يتطلب حصة أو حصتين عمليتين محددتين للتربية البدنية والرياضية.'
      );
    if (mark === null)
      throw new ReportError(400, 'أدخل العلامة النهائية /20 صراحةً قبل اعتماد المحضر.');
  }
}
const revisionSchema = z.object({ revision: z.number().int().nonnegative() }).strict();
const saveSchema = revisionSchema
  .extend({ content: z.unknown(), mark: z.number().finite().min(0).max(20).nullable() })
  .strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ReportError(400, 'بيانات التقرير غير صالحة.');
  return parsed.data;
}
function requireInspector(actor: Actor) {
  if (actor.role !== 'inspector') throw new ReportError(403, 'التقارير متاحة للمفتش المخول فقط.');
}
export function completionActor(visit: Pick<InspectionVisitRecord, 'history' | 'inspectorId'>) {
  const history = Array.isArray(visit.history) ? visit.history : [];
  const entry = [...history]
    .reverse()
    .find(
      (item) =>
        !!item && typeof item === 'object' && !Array.isArray(item) && item.action === 'COMPLETE'
    );
  return entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    typeof entry.actorId === 'string'
    ? entry.actorId
    : visit.inspectorId;
}
async function visitInDb(db: Db, actor: Actor, id: string) {
  requireInspector(actor);
  const visit = await db.inspectionVisitRecord.findUnique({ where: { id } });
  if (!visit?.status) throw new ReportError(404, 'الزيارة غير متاحة لمسار التقارير الجديد.');
  await lockVisitAssignmentHead(db, visit.teacherId);
  return visit;
}
async function canRead(db: Db, actor: Actor, visit: InspectionVisitRecord) {
  if (await canInspectorAccessTeacher(actor.id, visit.teacherId, db)) return true;
  if (completionActor(visit) !== actor.id || !visit.completedAt) return false;
  return !!(await db.inspectorAssignmentTransfer.findFirst({
    where: {
      teacherId: visit.teacherId,
      sourceInspectorId: actor.id,
      status: 'Accepted',
      effectiveAt: { gte: visit.completedAt },
    },
  }));
}
async function assertEdit(db: Db, actor: Actor, visit: InspectionVisitRecord, owner: string) {
  if (actor.id !== owner || !(await canInspectorAccessTeacher(actor.id, visit.teacherId, db)))
    throw new ReportError(403, 'التعديل والاعتماد لصاحب التقرير ضمن الإسناد المقبول الحالي فقط.');
  if (visit.status !== 'COMPLETED')
    throw new ReportError(409, 'التقرير متاح بعد إنجاز الزيارة فقط.');
}
function requireTeacher(actor: Actor) {
  if (actor.role !== 'teacher')
    throw new ReportError(403, 'هذه التقارير مخصصة للأستاذ المعني فقط.');
}
function teacherReportPayload(report: Awaited<ReturnType<Db['visitReport']['findUniqueOrThrow']>>) {
  if (report.status !== 'FINAL' || !report.finalSnapshot || !report.sharedWithTeacherAt)
    throw new ReportError(404, 'التقرير غير متاح.');
  const snapshot = report.finalSnapshot as unknown as {
    context: ReportContext;
    content: ReportContent;
    mark: number | null;
    sourceVersion: string;
    legalText: string | null;
  };
  if (
    !snapshot.context ||
    !snapshot.content ||
    !snapshot.context.inspector ||
    !snapshot.context.visit
  )
    throw new ReportError(404, 'التقرير غير متاح.');
  return {
    report: {
      id: report.id,
      visitId: report.visitId,
      reportType: report.reportType,
      status: report.status,
      authorId: report.authorId,
      content: snapshot.content,
      mark: snapshot.mark,
      revision: report.revision,
      finalSnapshot: snapshot,
      finalizedAt: report.finalizedAt,
      finalizedById: report.finalizedById,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      sharedWithTeacherAt: report.sharedWithTeacherAt,
      sharedWithTeacherById: report.sharedWithTeacherById,
      teacherAcknowledgedAt: report.teacherAcknowledgedAt,
      teacherAcknowledgedById: report.teacherAcknowledgedById,
    },
    context: snapshot.context,
  };
}
const date = (d: Date | null | undefined) =>
  d
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Algiers',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
    : '';
const string = (value: unknown) => (typeof value === 'string' ? value : '');
async function resolveContext(
  db: Db,
  visit: InspectionVisitRecord,
  owner: string
): Promise<ReportContext> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: visit.teacherId },
    include: { eduSchool: true, eduDirectorate: true, eduDistrict: true },
  });
  const [card, school, directorate, district, group, slot, inspector] = await Promise.all([
    db.teacherInformationCard.findUnique({ where: { teacherId: user.id } }),
    user.institutionId ? db.school.findUnique({ where: { id: user.institutionId } }) : null,
    user.directorateId || user.eduDirectorateId
      ? db.directorate.findUnique({ where: { id: user.directorateId || user.eduDirectorateId! } })
      : null,
    user.districtId || user.eduDistrictId
      ? db.inspectionDistrict.findUnique({ where: { id: user.districtId || user.eduDistrictId! } })
      : null,
    visit.classId
      ? db.studentClass.findFirst({
          where: { id: visit.classId, teacherId: user.id },
          select: { id: true, name: true, levelId: true },
        })
      : null,
    visit.weeklySlotId
      ? db.teacherWeeklySlot.findFirst({ where: { id: visit.weeklySlotId, teacherId: user.id } })
      : null,
    db.user.findUniqueOrThrow({
      where: { id: owner },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  const extra = (card?.extra || {}) as Record<string, unknown>;
  const qualification = Array.isArray(extra.qualifications)
    ? extra.qualifications
        .map((q: unknown) =>
          q && typeof q === 'object' ? string((q as { certificate?: unknown }).certificate) : ''
        )
        .filter(Boolean)
        .join('، ')
    : '';
  const pupilCount = group
    ? await db.student.count({ where: { teacherId: user.id, classId: group.id } })
    : null;
  const minute = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  return {
    teacher: {
      name: `${user.firstName} ${user.lastName}`.trim(),
      birthDate: date(user.birthDate),
      birthPlace: string(extra.birthPlace),
      maidenSurname: string(extra.maidenSurname),
      qualification,
      cadre: string(extra.cadre),
      administrativeStatus: string(extra.administrativeStatus),
      category: string(extra.category),
      grade: string(extra.grade),
      effectiveDate: string(extra.effectiveDate),
      appointmentDate:
        string(extra.institutionAppointmentDate) || string(extra.firstAppointmentDate),
      appointmentNumber: string(extra.appointmentNumber) || string(extra.firstAppointmentNumber),
      lastInspectionDate: string(extra.lastInspectionDate),
      historicalMark: string(extra.inspectionMark),
      probationDate: string(extra.probationDate),
      financialVisaNumber: string(extra.financialVisaNumber),
    },
    location: {
      school: school?.name || user.eduSchool?.name || user.schoolName || '',
      directorate: directorate?.name || user.eduDirectorate?.name || '',
      district: district?.name || user.eduDistrict?.name || '',
      municipality: user.municipality || '',
    },
    inspector: { id: inspector.id, name: `${inspector.firstName} ${inspector.lastName}`.trim() },
    visit: {
      id: visit.id,
      date: date(visit.completedAt),
      academicYear: visit.academicYearId || '',
      subject: 'التربية البدنية والرياضية',
      className: group?.name || '',
      level: group?.levelId || '',
      pupilCount,
      durationMinutes: slot ? minute(slot.endTime) - minute(slot.startTime) : null,
    },
  };
}
export async function readVisitReport(actor: Actor, visitId: string) {
  return assignmentTransaction(async (db) => {
    const visit = await visitInDb(db, actor, visitId);
    if (!(await canRead(db, actor, visit)))
      throw new ReportError(403, 'لا تملك صلاحية قراءة تقرير هذه الزيارة.');
    const report = await db.visitReport.findUnique({ where: { visitId } });
    const current = await canInspectorAccessTeacher(actor.id, visit.teacherId, db);
    const owner = report?.authorId || completionActor(visit);
    // Historical draft reading never loads the current Teacher identity/card.
    const context =
      report?.status === 'FINAL'
        ? (report.finalSnapshot as unknown as { context: ReportContext }).context
        : current
          ? await resolveContext(db, visit, owner)
          : null;
    return {
      report,
      context,
      canEdit: !!report && report.status === 'DRAFT' && current && owner === actor.id,
      canShare:
        !!report &&
        report.status === 'FINAL' &&
        current &&
        owner === actor.id &&
        visit.status === 'COMPLETED',
      canCreate:
        !report &&
        current &&
        owner === actor.id &&
        visit.status === 'COMPLETED' &&
        visit.visitType !== 'MONITORING',
      unsupported: visit.visitType === 'MONITORING',
    };
  });
}
export async function listOwnedVisitReports(actor: Actor, teacherId?: string) {
  requireInspector(actor);
  return assignmentTransaction(async (db) => {
    const [reports, assignments, transfers] = await Promise.all([
      db.visitReport.findMany({
        where: { authorId: actor.id, ...(teacherId ? { visit: { teacherId } } : {}) },
        select: {
          id: true,
          visitId: true,
          reportType: true,
          status: true,
          createdAt: true,
          finalizedAt: true,
          sharedWithTeacherAt: true,
          sharedWithTeacherById: true,
          teacherAcknowledgedAt: true,
          teacherAcknowledgedById: true,
          visit: { select: { teacherId: true, completedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.inspectorAssignment.findMany({
        where: { inspectorId: actor.id, status: { in: ['Active', 'Changed'] } },
        select: { teacherId: true },
      }),
      db.inspectorAssignmentTransfer.findMany({
        where: { sourceInspectorId: actor.id, status: 'Accepted' },
        select: { teacherId: true, effectiveAt: true },
      }),
    ]);
    const current = new Set(assignments.map((a) => a.teacherId));
    return reports
      .filter(
        (r) =>
          current.has(r.visit.teacherId) ||
          transfers.some(
            (t) =>
              t.teacherId === r.visit.teacherId &&
              t.effectiveAt &&
              r.visit.completedAt &&
              r.visit.completedAt <= t.effectiveAt
          )
      )
      .map(({ visit: _visit, ...report }) => {
        void _visit;
        return report;
      });
  });
}
export async function shareVisitReportWithTeacher(actor: Actor, reportId: string) {
  return assignmentTransaction(async (db) => {
    requireInspector(actor);
    const report = await db.visitReport.findUnique({ where: { id: reportId } });
    if (!report) throw new ReportError(404, 'التقرير غير موجود.');
    const visit = await visitInDb(db, actor, report.visitId);
    await assertEdit(db, actor, visit, report.authorId);
    if (report.status !== 'FINAL' || !report.finalSnapshot)
      throw new ReportError(409, 'لا يمكن إرسال مسودة أو تقرير دون نسخة نهائية محفوظة.');
    if (report.sharedWithTeacherAt) return report;
    const now = new Date();
    const changed = await db.visitReport.updateMany({
      where: {
        id: report.id,
        authorId: actor.id,
        status: 'FINAL',
        sharedWithTeacherAt: null,
        teacherAcknowledgedAt: null,
      },
      data: { sharedWithTeacherAt: now, sharedWithTeacherById: actor.id },
    });
    if (changed.count !== 1) {
      const current = await db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
      if (current.sharedWithTeacherAt) return current;
      throw new ReportError(409, 'تغيرت حالة التقرير؛ حدّث الصفحة وحاول مجددًا.');
    }
    const visitDate = (report.finalSnapshot as unknown as { context: ReportContext }).context.visit
      .date;
    await db.communityNotification.create({
      data: {
        id: `visit_report_shared_${report.id}`,
        userId: visit.teacherId,
        senderId: actor.id,
        type: 'visit_report_shared',
        title: 'تقرير زيارة جديد',
        message: `أرسل المفتش التقرير النهائي للزيارة${visitDate ? ` بتاريخ ${visitDate}` : ''}.`,
        data: { type: 'visit_report_shared', reportId: report.id, visitId: visit.id },
      },
    });
    await appendAudit(db, { eventType: 'VISIT_REPORT_SHARED', actorUserId: actor.id, entityType: 'VISIT_REPORT', entityId: report.id, affectedUserId: visit.teacherId, after: { status: 'FINAL', sharedWithTeacherAt: now }, key: `REPORT_SHARE:${report.id}` });
    return db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
  });
}
export async function listTeacherSharedVisitReports(actor: Actor) {
  requireTeacher(actor);
  return assignmentTransaction(async (db) => {
    const reports = await db.visitReport.findMany({
      where: {
        status: 'FINAL',
        sharedWithTeacherAt: { not: null },
        visit: { teacherId: actor.id },
      },
      orderBy: { sharedWithTeacherAt: 'desc' },
    });
    return reports.map((report) => teacherReportPayload(report));
  });
}
export async function readTeacherSharedVisitReport(actor: Actor, reportId: string) {
  requireTeacher(actor);
  return assignmentTransaction(async (db) => {
    const report = await db.visitReport.findFirst({
      where: {
        id: reportId,
        status: 'FINAL',
        sharedWithTeacherAt: { not: null },
        visit: { teacherId: actor.id },
      },
    });
    if (!report) throw new ReportError(404, 'التقرير غير متاح.');
    return teacherReportPayload(report);
  });
}
export async function acknowledgeTeacherVisitReport(actor: Actor, reportId: string) {
  requireTeacher(actor);
  return assignmentTransaction(async (db) => {
    const report = await db.visitReport.findFirst({
      where: {
        id: reportId,
        status: 'FINAL',
        sharedWithTeacherAt: { not: null },
        visit: { teacherId: actor.id },
      },
    });
    if (!report) throw new ReportError(404, 'التقرير غير متاح.');
    if (report.teacherAcknowledgedAt) return report;
    const now = new Date();
    const changed = await db.visitReport.updateMany({
      where: {
        id: report.id,
        status: 'FINAL',
        sharedWithTeacherAt: { not: null },
        teacherAcknowledgedAt: null,
      },
      data: { teacherAcknowledgedAt: now, teacherAcknowledgedById: actor.id },
    });
    if (!changed.count) return db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
    await appendAudit(db, { eventType: 'VISIT_REPORT_ACKNOWLEDGED', actorUserId: actor.id, entityType: 'VISIT_REPORT', entityId: report.id, affectedUserId: actor.id, after: { teacherAcknowledgedAt: now }, key: `REPORT_ACK:${report.id}` });
    return db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
  });
}
export async function createVisitReport(actor: Actor, visitId: string, value: unknown) {
  parse(z.object({}).strict(), value);
  return assignmentTransaction(async (db) => {
    const visit = await visitInDb(db, actor, visitId);
    await assertEdit(db, actor, visit, completionActor(visit));
    if (visit.visitType !== 'GUIDANCE' && visit.visitType !== 'TENURE')
      throw new ReportError(409, 'نموذج التقرير الرسمي لزيارة المراقبة غير مهيأ بعد.');
    if (await db.visitReport.findUnique({ where: { visitId } }))
      throw new ReportError(409, 'يوجد تقرير لهذه الزيارة بالفعل.');
    return db.visitReport.create({
      data: { visitId, reportType: visit.visitType, authorId: actor.id, content: {}, mark: null },
    });
  });
}
export async function saveVisitReport(actor: Actor, reportId: string, value: unknown) {
  const input = parse(saveSchema, value);
  return assignmentTransaction(async (db) => {
    requireInspector(actor);
    const report = await db.visitReport.findUnique({ where: { id: reportId } });
    if (!report) throw new ReportError(404, 'التقرير غير موجود.');
    const visit = await visitInDb(db, actor, report.visitId);
    await assertEdit(db, actor, visit, report.authorId);
    if (report.status !== 'DRAFT' || report.revision !== input.revision)
      throw new ReportError(409, 'التقرير معتمد أو تغيرت المسودة؛ حدّث الصفحة.');
    const content = validateReportContent(report.reportType, input.content);
    const changed = await db.visitReport.updateMany({
      where: { id: report.id, revision: input.revision, status: 'DRAFT' },
      data: {
        content: content as Prisma.InputJsonValue,
        mark: input.mark,
        revision: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    if (changed.count !== 1) throw new ReportError(409, 'تعارض في حفظ المسودة.');
    return db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
  });
}
export async function finalizeVisitReport(actor: Actor, reportId: string, value: unknown) {
  const input = parse(revisionSchema, value);
  return assignmentTransaction(async (db) => {
    requireInspector(actor);
    const report = await db.visitReport.findUnique({ where: { id: reportId } });
    if (!report) throw new ReportError(404, 'التقرير غير موجود.');
    const visit = await visitInDb(db, actor, report.visitId);
    await assertEdit(db, actor, visit, report.authorId);
    if (report.status !== 'DRAFT' || report.revision !== input.revision)
      throw new ReportError(409, 'التقرير معتمد أو تغيرت المسودة.');
    const content = validateReportContent(report.reportType, report.content);
    assertReportComplete(report.reportType, content, report.mark);
    const context = await resolveContext(db, visit, report.authorId);
    if (!context.teacher.name || !context.location.school || !context.inspector.name)
      throw new ReportError(400, 'الهوية والمؤسسة وصاحب التقرير مطلوبة للاعتماد.');
    const now = new Date();
    const snapshot = {
      sourceVersion: '2026-10-07-guidance-tenure-pe-1',
      context,
      content,
      mark: report.mark,
      legalText: report.reportType === 'TENURE' ? TENURE_LEGAL_TEXT : null,
    };
    const changed = await db.visitReport.updateMany({
      where: { id: report.id, revision: input.revision, status: 'DRAFT' },
      data: {
        status: 'FINAL',
        finalSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        finalizedAt: now,
        finalizedById: actor.id,
        revision: { increment: 1 },
        updatedAt: now,
      },
    });
    if (changed.count !== 1) throw new ReportError(409, 'تعارض في اعتماد التقرير.');
    await appendAudit(db, { eventType: 'VISIT_REPORT_FINALIZED', actorUserId: actor.id, entityType: 'VISIT_REPORT', entityId: report.id, affectedUserId: visit.teacherId, before: { status: 'DRAFT' }, after: { status: 'FINAL', reportType: report.reportType, revision: report.revision + 1 }, key: `REPORT_FINAL:${report.id}` });
    return db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
  });
}
