/**
 * SPEX - مسارات نظام الإسناد اليدوي بقبول المفتش (PART B)
 * (الهيكل الإداري: مديريات / بلديات / مؤسسات / مقاطعات تفتيشية + الاقتراحات + الإسناد)
 * يتضمن:
 * - GET /api/inspector/pending-assignments (قبل بوابة admin)
 * - POST /api/inspector/assignments/:teacherId/accept
 * - POST /api/inspector/assignments/:teacherId/reject
 * - PUT /teacher/professional-data مع firstName/lastName/birthDate اختيارية و districtId اختيارية
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from './prismaClient.js';
import { appendAudit } from './auditService.js';
import { inspectorVisitView, legacyVisitVisibleToTeacher } from './pedagogicalVisitService.js';
import { VISIT_TYPE_LABELS } from '../types/pedagogicalVisit.js';
import { sanitizeUser } from './auth.js';
import { requireRole } from './middleware/requireAuth.js';
import {
  requestTeacherTransfer, decideTeacherTransfer, updateTeacherProfile, createInitialAssignmentRequest, TransferError,
} from './assignmentTransferService.js';
import {
  reassignTeacher,
  bulkReassignAll,
  removeAssignment,
  acceptAssignment,
  rejectAssignment,
  AssignmentError,
} from './assignmentService.js';

export const assignmentRouter = Router();

// كل هذه المسارات تتطلب جلسة صالحة (requireAuth مطبَّق مسبقاً في index.ts قبل التوصيل)

// -----------------------------------------------------------------------
// 1. الهيكل الإداري — قراءة عامة لأي مستخدم مسجَّل دخول (يحتاجها الأستاذ أثناء استكمال بياناته)
// -----------------------------------------------------------------------

assignmentRouter.get('/locations/directorates', async (req, res) => {
  const directorates = await prisma.directorate.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, directorates });
});

assignmentRouter.get('/locations/directorates/:id/municipalities', async (req, res) => {
  const municipalities = await prisma.municipality.findMany({
    where: { directorateId: req.params.id },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, municipalities });
});

assignmentRouter.get('/locations/directorates/:id/districts', async (req, res) => {
  const districts = await prisma.inspectionDistrict.findMany({
    where: { directorateId: req.params.id },
    orderBy: { districtNumber: 'asc' },
  });
  res.json({ success: true, districts });
});

assignmentRouter.get('/locations/municipalities/:id/schools', async (req, res) => {
  const schools = await prisma.school.findMany({
    where: { municipalityId: req.params.id },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, schools });
});

const inspectorDistrictSchema = z.object({
  directorateId: z.string().trim().min(1),
  name: z.string().trim().min(2, 'اسم المقاطعة التفتيشية مطلوب.'),
  districtNumber: z.number().int().positive().optional(),
});

assignmentRouter.post(
  '/inspector/districts',
  requireRole('inspector', 'admin'),
  async (req, res) => {
    const parsed = inspectorDistrictSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });

    const { directorateId, name, districtNumber } = parsed.data;
    const directorate = await prisma.directorate.findUnique({ where: { id: directorateId } });
    if (!directorate) return res.status(404).json({ error: 'مديرية التربية المحددة غير موجودة.' });

    if (req.user!.role === 'inspector') {
      const inspector = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          eduDirectorateId: true,
          directorateId: true,
          eduDistrictId: true,
          districtId: true,
        },
      });
      const inspectorDirectorate = inspector?.eduDirectorateId || inspector?.directorateId;
      if (!inspectorDirectorate || inspectorDirectorate !== directorateId) {
        return res.status(403).json({ error: 'لا يمكنك إنشاء مقاطعة خارج مديريتك.' });
      }
      if (inspector?.eduDistrictId || inspector?.districtId) {
        return res
          .status(409)
          .json({ error: 'لديك مقاطعة مسجلة بالفعل. يمكنك تعديل تسميتها فقط.' });
      }
    }

    const normalizedName = name.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const existing = await prisma.inspectionDistrict.findMany({
      where: { directorateId },
      select: { id: true, name: true, districtNumber: true },
    });
    if (
      existing.some(
        (district) =>
          district.name.replace(/\s+/g, ' ').trim().toLocaleLowerCase() === normalizedName
      )
    ) {
      return res.status(409).json({ error: 'هذه المقاطعة موجودة بالفعل ضمن هذه المديرية.' });
    }
    if (
      districtNumber !== undefined &&
      existing.some((district) => district.districtNumber === districtNumber)
    ) {
      return res.status(409).json({ error: 'رقم المقاطعة مستخدم بالفعل ضمن هذه المديرية.' });
    }

    try {
      const district = await prisma.$transaction(
        async (tx) => {
          if (req.user!.role === 'inspector') {
            const inspector = await tx.user.findUnique({
              where: { id: req.user!.id },
              select: {
                eduDirectorateId: true,
                directorateId: true,
                eduDistrictId: true,
                districtId: true,
              },
            });
            if (
              !inspector ||
              (inspector.eduDirectorateId || inspector.directorateId) !== directorateId
            ) {
              throw new Error('لا يمكنك إنشاء مقاطعة خارج مديريتك.');
            }
            if (inspector.eduDistrictId || inspector.districtId) {
              throw new Error('لديك مقاطعة مسجلة بالفعل. يمكنك تعديل تسميتها فقط.');
            }
          }
          const created = await tx.inspectionDistrict.create({
            data: { name, directorateId, districtNumber },
          });
          if (req.user!.role === 'inspector') {
            await tx.user.update({
              where: { id: req.user!.id },
              data: {
                eduDirectorateId: directorateId,
                eduDistrictId: created.id,
                districtId: created.id,
              },
            });
            await appendAudit(tx, { eventType: 'INSPECTOR_DISTRICT_ASSIGNED', actorUserId: req.user!.id, entityType: 'INSPECTOR_DISTRICT', entityId: created.id, affectedUserId: req.user!.id, after: { districtId: created.id, directorateId }, key: `DISTRICT_ASSIGN:${created.id}:${req.user!.id}` });
          }
          return created;
        },
        { isolationLevel: 'Serializable' }
      );
      await bulkReassignAll();
      return res.status(201).json({ success: true, district });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('لديك مقاطعة مسجلة')) {
        return res.status(409).json({ error: err.message });
      }
      if (err instanceof Error && err.message.includes('خارج مديريتك')) {
        return res.status(403).json({ error: err.message });
      }
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return res.status(409).json({ error: 'هذه المقاطعة موجودة بالفعل ضمن هذه المديرية.' });
      }
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2034'
      ) {
        return res.status(409).json({ error: 'تم تسجيل مقاطعتك في طلب آخر. حدّث الصفحة لتظهر.' });
      }
      return res.status(500).json({ error: 'تعذر إنشاء المقاطعة.' });
    }
  }
);

const updateInspectorDistrictSchema = z.object({
  name: z.string().trim().min(2, 'اسم المقاطعة التفتيشية مطلوب.').max(160),
});

assignmentRouter.put('/inspector/districts/:id', requireRole('inspector'), async (req, res) => {
  const parsed = updateInspectorDistrictSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });

  const inspector = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { eduDirectorateId: true, directorateId: true, eduDistrictId: true, districtId: true },
  });
  const ownedDistrictId = inspector?.eduDistrictId || inspector?.districtId;
  if (ownedDistrictId !== req.params.id) {
    return res.status(403).json({ error: 'يمكنك تعديل تسمية مقاطعتك المسجلة فقط.' });
  }

  try {
    const district = await prisma.inspectionDistrict.update({
      where: {
        id: req.params.id,
        directorateId: inspector?.eduDirectorateId || inspector?.directorateId || undefined,
      },
      data: { name: parsed.data.name.replace(/\s+/g, ' ').trim() },
    });
    return res.json({ success: true, district });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'P2002') {
        return res.status(409).json({ error: 'اسم المقاطعة مستخدم بالفعل في هذه المديرية.' });
      }
      if (code === 'P2025') return res.status(404).json({ error: 'المقاطعة غير موجودة.' });
    }
    return res.status(500).json({ error: 'تعذر تعديل تسمية المقاطعة.' });
  }
});

// -----------------------------------------------------------------------
// 2. اقتراحات إضافة بلدية/مؤسسة غير موجودة — أي مستخدم يمكنه الاقتراح، ولا تظهر
//    لبقية المستخدمين حتى تعتمدها الإدارة
// -----------------------------------------------------------------------

const suggestMunicipalitySchema = z.object({
  name: z.string().trim().min(2, 'اسم البلدية قصير جداً'),
  directorateId: z.string().min(1),
});

assignmentRouter.post('/locations/municipalities/suggest', async (req, res) => {
  const parsed = suggestMunicipalitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const directorate = await prisma.directorate.findUnique({
    where: { id: parsed.data.directorateId },
  });
  if (!directorate) {
    return res.status(404).json({ error: 'مديرية التربية المحددة غير موجودة.' });
  }
  const suggestion = await prisma.municipalitySuggestion.create({
    data: {
      name: parsed.data.name,
      directorateId: parsed.data.directorateId,
      suggestedBy: req.user!.id,
    },
  });
  res.json({
    success: true,
    suggestion,
    message: 'تم إرسال اقتراحك بنجاح، وسيتم إسناد إشرافك تلقائياً بمجرد اعتماد الإدارة له.',
  });
});

const suggestSchoolSchema = z.object({
  name: z.string().trim().min(2, 'اسم المؤسسة قصير جداً'),
  municipalityId: z.string().min(1),
});

assignmentRouter.post('/locations/schools/suggest', async (req, res) => {
  const parsed = suggestSchoolSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const municipality = await prisma.municipality.findUnique({
    where: { id: parsed.data.municipalityId },
  });
  if (!municipality) {
    return res.status(404).json({ error: 'البلدية المحددة غير موجودة.' });
  }
  const suggestion = await prisma.schoolSuggestion.create({
    data: {
      name: parsed.data.name,
      municipalityId: parsed.data.municipalityId,
      suggestedBy: req.user!.id,
    },
  });
  res.json({
    success: true,
    suggestion,
    message: 'تم إرسال اقتراحك بنجاح، وسيتم إسناد إشرافك تلقائياً بمجرد اعتماد الإدارة له.',
  });
});

// -----------------------------------------------------------------------
// 3. استكمال البيانات المهنية للأستاذ — PART B/B3
//    تقبل firstName/lastName/birthDate(YYYY-MM-DD) اختيارية و districtId اختيارية
//    (بلا مقاطعة ⇒ لا سجل إسناد إطلاقاً ورسالة «لم تطلب الإسناد بعد»)
//    وتملأ عندما تُملأ: eduDirectorateId=edu, eduSchoolId=institutionId, eduDistrictId و districtId القديم للتوافق
// -----------------------------------------------------------------------

const professionalDataSchema = z.object({
  directorateId: z.string().min(1, 'يجب اختيار مديرية التربية'),
  municipalityId: z.string().min(1, 'يجب اختيار بلدية العمل'),
  institutionId: z.string().min(1, 'يجب اختيار المؤسسة التعليمية'),
  districtId: z.string().optional(),
  firstName: z.string().trim().min(2).optional(),
  lastName: z.string().trim().min(2).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الميلاد يجب أن يكون بصيغة YYYY-MM-DD')
    .optional(),
});

function remapHistoricDirectorateId(id?: string | null): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (trimmed === 'de_19') return 'setif_de';
  return trimmed;
}

assignmentRouter.put('/teacher/professional-data', requireRole('teacher'), async (req, res) => {
  const parsed = professionalDataSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const {
    directorateId: rawDirectorateId,
    municipalityId,
    institutionId,
    districtId,
    firstName,
    lastName,
    birthDate,
  } = parsed.data;

  const directorateId = remapHistoricDirectorateId(rawDirectorateId) || rawDirectorateId;

  const [directorate, municipality, school, district] = await Promise.all([
    prisma.directorate.findUnique({ where: { id: directorateId } }),
    prisma.municipality.findUnique({ where: { id: municipalityId } }),
    prisma.school.findUnique({ where: { id: institutionId } }),
    districtId
      ? prisma.inspectionDistrict.findUnique({ where: { id: districtId } })
      : Promise.resolve(null),
  ]);

  if (!directorate) return res.status(404).json({ error: 'مديرية التربية غير موجودة.' });
  if (!municipality || municipality.directorateId !== directorateId) {
    return res.status(400).json({ error: 'البلدية المحددة لا تتبع مديرية التربية المختارة.' });
  }
  if (!school || school.municipalityId !== municipalityId) {
    return res.status(400).json({ error: 'المؤسسة المحددة لا تتبع البلدية المختارة.' });
  }
  if (districtId && district && district.directorateId !== directorateId) {
    return res
      .status(400)
      .json({ error: 'المقاطعة التفتيشية المحددة لا تتبع مديرية التربية المختارة.' });
  }
  if (districtId && !district) {
    return res.status(404).json({ error: 'المقاطعة التفتيشية غير موجودة.' });
  }

  const current = await prisma.inspectorAssignment.findUnique({ where: { teacherId: req.user!.id } });
  const owner = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (current && ['Active', 'Changed'].includes(current.status) && owner &&
      (directorateId !== (owner.directorateId || owner.eduDirectorateId) || (districtId || '') !== (owner.districtId || owner.eduDistrictId || ''))) {
    if (!districtId) return res.status(409).json({ error: 'لا يمكن إزالة المقاطعة الحالية أثناء الإشراف. استخدم طلب النقل.' });
    const destinationInspector = await prisma.user.findFirst({ where: {
      role: 'inspector', status: 'active', isApprovedByAdmin: true,
      OR: [{ directorateId, districtId }, { eduDirectorateId: directorateId, eduDistrictId: districtId }],
    } });
    if (!destinationInspector) return res.status(400).json({ error: 'لا يوجد مفتش معتمد للمقاطعة الوجهة.' });
    try {
      const transfer = await requestTeacherTransfer({ teacherId: owner.id, requestedById: req.user!.id,
        destinationInspectorId: destinationInspector.id, destinationDistrictId: districtId, destinationInstitutionId: institutionId });
      return res.json({ success: true, user: sanitizeUser(owner), assignment: current, transfer,
        message: 'تم إرسال طلب النقل. يبقى انتسابك وإشراف المفتش الحالي قائمين حتى قبول المفتش الوجهة.' });
    } catch (error) { return transferFailure(res, error); }
  }

  // بناء بيانات التحديث: الحقول الأساسية + الحقول الجغرافية الجديدة + البطاقة الشخصية
  const updateData: any = {
    directorateId,
    municipalityId,
    municipality: municipality.name,
    institutionId,
    schoolName: school.name,
    eduDirectorateId: directorateId,
    eduSchoolId: institutionId,
    // eduDistrictId و districtId القديم للتوافق — يملأ عندما تُملأ المقاطعة
  };

  if (districtId) {
    updateData.districtId = districtId;
    updateData.eduDistrictId = districtId;
  } else {
    // بلا مقاطعة ⇒ لا نملأ districtId؟ نحتفظ بـ districtId فارغ ليعكس عدم طلب الإسناد
    // حسب المواصفة: بلا مقاطعة ⇒ لا سجل إسناد إطلاقاً
    updateData.districtId = '';
    updateData.eduDistrictId = null;
  }

  if (firstName) updateData.firstName = firstName.trim();
  if (lastName) updateData.lastName = lastName.trim();
  if (birthDate) {
    try {
      updateData.birthDate = new Date(birthDate);
    } catch {
      return res.status(400).json({ error: 'تاريخ الميلاد غير صالح.' });
    }
  }

  let updated;
  try { updated = await updateTeacherProfile(req.user!.id, updateData); }
  catch (error) { return transferFailure(res, error); }

  // إذا لم يطلب المقاطعة ⇒ لا سجل إسناد إطلاقاً
  if (!districtId) {
    // احذف أي سجل إسناد سابق إن وجد (حتى لا يبقى مرتبطاً بمفتش قديم)
    try {
      await prisma.inspectorAssignment.delete({ where: { teacherId: updated.id } });
    } catch {
      // لا يوجد سجل مسبق — طبيعي
    }
    return res.json({
      success: true,
      user: sanitizeUser(updated),
      assignment: null,
      inspector: null,
      message: 'لم تطلب الإسناد بعد',
    });
  }

  // عند وجود مقاطعة: إعادة احتساب الإسناد بنظام Pending الجديد
  const assignment = await reassignTeacher(updated.id);

  let inspector = null;
  if (assignment?.inspectorId) {
    const insp = await prisma.user.findUnique({ where: { id: assignment.inspectorId } });
    if (insp) inspector = sanitizeUser(insp);
  }

  res.json({
    success: true,
    user: sanitizeUser(updated),
    assignment,
    inspector,
    message:
      assignment?.status === 'Active'
        ? 'تم استكمال بياناتك وربطك بمفتشك (مقبول سابقاً).'
        : assignment?.inspectorId
          ? 'تم حفظ بياناتك وإرسال طلب الإسناد إلى المفتش المختص بانتظار موافقته.'
          : 'تم حفظ بياناتك بنجاح. لا يوجد حالياً مفتش مسجَّل لمقاطعتك، وسيتم الإسناد تلقائياً بمجرد توفره.',
  });
});

// -----------------------------------------------------------------------
// 4. صلاحيات الأستاذ: معرفة المفتش المشرف عليه
// -----------------------------------------------------------------------

assignmentRouter.get('/teacher/assignment', requireRole('teacher'), async (req, res) => {
  const assignment = await prisma.inspectorAssignment.findUnique({
    where: { teacherId: req.user!.id },
  });
  if (!assignment) {
    return res.json({ success: true, assignment: null, inspector: null });
  }
  let inspector = null;
  if (assignment.inspectorId) {
    const insp = await prisma.user.findUnique({ where: { id: assignment.inspectorId } });
    if (insp) inspector = sanitizeUser(insp);
  }
  const transfer = await prisma.inspectorAssignmentTransfer.findUnique({ where: { pendingTeacherId: req.user!.id } });
  res.json({ success: true, assignment, inspector, transfer });
});

function transferFailure(res: import('express').Response, error: unknown) {
  if (!(error instanceof TransferError)) throw error;
  const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID' ? 400 : 409;
  return res.status(status).json({ success: false, error: error.message, code: error.code });
}

assignmentRouter.get('/inspector/transfers', requireRole('inspector'), async (req, res) => {
  const transfers = await prisma.inspectorAssignmentTransfer.findMany({
    where: { destinationInspectorId: req.user!.id, status: 'Pending' }, orderBy: { requestedAt: 'asc' },
  });
  res.json({ success: true, transfers });
});
assignmentRouter.post('/inspector/transfers/:id/:decision', requireRole('inspector'), async (req, res) => {
  if (!['accept', 'reject'].includes(req.params.decision)) return res.status(400).json({ error: 'قرار غير صالح.' });
  if (req.body?.reason !== undefined && (typeof req.body.reason !== 'string' || req.body.reason.length > 1000)) return res.status(400).json({ error: 'سبب الرفض غير صالح.' });
  try {
    const transfer = await decideTeacherTransfer(req.params.id, req.user!.id,
      req.params.decision === 'accept' ? 'Accepted' : 'Rejected', req.body?.reason);
    res.json({ success: true, transfer });
  } catch (error) { return transferFailure(res, error); }
});

// Archive authorization is by persisted actor ownership and transfer cutoff.
// No current Teacher profile, schedule, memo or dossier is loaded by this route.
assignmentRouter.get('/inspector/archive', requireRole('inspector'), async (req, res) => {
  const transfers = await prisma.inspectorAssignmentTransfer.findMany({ where: { sourceInspectorId: req.user!.id, status: 'Accepted' }, orderBy: { effectiveAt: 'desc' } });
  const cutoff = new Map<string, number>();
  for (const t of transfers) if (t.effectiveAt) cutoff.set(t.teacherId, Math.max(cutoff.get(t.teacherId) || 0, t.effectiveAt.getTime()));
  const [visits, notes] = await Promise.all([
    prisma.inspectionVisitRecord.findMany({ where: { inspectorId: req.user!.id, teacherId: { in: [...cutoff.keys()] } }, orderBy: { createdAt: 'desc' } }),
    prisma.inspectorNote.findMany({ where: { authorId: req.user!.id }, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ success: true, transfers,
    visits: visits.filter(v => {
      const at = cutoff.get(v.teacherId) || 0;
      if (v.createdAt.getTime() > at) return false;
      if (!v.status) return true; // Legacy meaning remains unchanged.
      return (v.status === 'COMPLETED' && !!v.completedAt && v.completedAt.getTime() <= at) || (v.status === 'CANCELLED' && !!v.cancelledAt && v.cancelledAt.getTime() <= at);
    }).map(v => ({ id: v.id, teacherId: v.teacherId, inspectorId: v.inspectorId, createdAt: v.createdAt, data: v.status ? { ...inspectorVisitView(v), visitType: VISIT_TYPE_LABELS[v.visitType!], visitDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit' }).format(v.scheduledAt!), pedagogicalGrade: null, officialReportGenerated: false } : v.data })),
    notes: notes.filter(n => { const teacherId = (n.data as Record<string, unknown>)?.teacherId; return typeof teacherId === 'string' && n.createdAt.getTime() <= (cutoff.get(teacherId) || 0); }).map(n => ({ id: n.id, authorId: n.authorId, createdAt: n.createdAt, data: n.data })),
  });
});

// Read model for the teacher's inspection relationship. The assignment row is
// authoritative; no client-provided teacherId, districtId or inspectorId is
// accepted here.
assignmentRouter.get('/teacher/inspection-feed', requireRole('teacher'), async (req, res) => {
  const assignment = await prisma.inspectorAssignment.findUnique({
    where: { teacherId: req.user!.id },
  });
  const inspector =
    assignment?.inspectorId && ['Active', 'Changed'].includes(assignment.status)
      ? await prisma.user.findFirst({
          where: { id: assignment.inspectorId, role: 'inspector', status: 'active' },
        })
      : null;
  if (!inspector) {
    return res.json({
      success: true,
      inspector: null,
      guidance: [],
      visits: [],
      counts: { guidance: 0, visits: 0, interactions: 0 },
    });
  }

  const teacher = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { districtId: true },
  });
  const [notes, visits] = await Promise.all([
    prisma.inspectorNote.findMany({
      where: { authorId: inspector.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inspectionVisitRecord.findMany({
      where: { teacherId: req.user!.id, inspectorId: inspector.id, status: null },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const guidance = notes
    .filter((row) => {
      const data = (row.data || {}) as Record<string, unknown>;
      return (
        data.teacherId === req.user!.id ||
        (teacher?.districtId && data.districtId === teacher.districtId)
      );
    })
    .map((row) => row.data);
  const displayName =
    `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim() ||
    inspector.username ||
    'المفتش';
  const visibleVisits = visits.filter((row) => legacyVisitVisibleToTeacher(row.data));
  return res.json({
    success: true,
    inspector: { id: inspector.id, displayName },
    guidance,
    visits: visibleVisits.map((row) => row.data),
    counts: {
      guidance: guidance.length,
      visits: visibleVisits.length,
      interactions: guidance.length + visibleVisits.length,
    },
  });
});

// -----------------------------------------------------------------------
// 5. صلاحيات المفتش: قائمة الأساتذة التابعين له فقط + الطلبات المعلقة (PART B)
// -----------------------------------------------------------------------

assignmentRouter.get('/inspector/teachers', requireRole('inspector'), async (req, res) => {
  const { municipalityId, institutionId } = req.query;

  const assignments = await prisma.inspectorAssignment.findMany({
    where: { inspectorId: req.user!.id, status: { in: ['Active', 'Changed'] } },
  });
  const teacherIds = assignments.map((a) => a.teacherId);

  const teachers = await prisma.user.findMany({
    where: {
      id: { in: teacherIds },
      ...(municipalityId ? { municipalityId: String(municipalityId) } : {}),
      ...(institutionId ? { institutionId: String(institutionId) } : {}),
    },
    orderBy: { firstName: 'asc' },
  });
  const acceptedIds = teachers.map((teacher) => teacher.id);
  const [visits, notes, classes, students] = await Promise.all([
    prisma.inspectionVisitRecord.findMany({
      where: { inspectorId: req.user!.id, teacherId: { in: acceptedIds }, OR: [{ status: null }, { status: 'COMPLETED' }] },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inspectorNote.findMany({ where: { authorId: req.user!.id } }),
    prisma.studentClass.findMany({
      where: { teacherId: { in: acceptedIds } },
      select: { teacherId: true },
    }),
    prisma.student.findMany({
      where: { teacherId: { in: acceptedIds } },
      select: { teacherId: true },
    }),
  ]);
  const visitsByTeacher = new Map<string, typeof visits>();
  for (const visit of visits) {
    const rows = visitsByTeacher.get(visit.teacherId) || [];
    rows.push(visit);
    visitsByTeacher.set(visit.teacherId, rows);
  }
  const classCounts = new Map<string, number>();
  for (const item of classes)
    classCounts.set(item.teacherId, (classCounts.get(item.teacherId) || 0) + 1);
  const noteCounts = new Map<string, number>();
  const studentCounts = new Map<string, number>();
  for (const student of students)
    studentCounts.set(student.teacherId, (studentCounts.get(student.teacherId) || 0) + 1);
  for (const note of notes) {
    const teacherId =
      typeof (note.data as Record<string, unknown>)?.teacherId === 'string'
        ? String((note.data as Record<string, unknown>).teacherId)
        : '';
    if (acceptedIds.includes(teacherId))
      noteCounts.set(teacherId, (noteCounts.get(teacherId) || 0) + 1);
  }
  res.json({
    success: true,
    teachers: teachers.map((teacher) => ({
      ...sanitizeUser(teacher),
      assignmentId:
        assignments.find((assignment) => assignment.teacherId === teacher.id)?.id || null,
      assignmentStatus: 'ACCEPTED',
      assignmentDate:
        assignments.find((assignment) => assignment.teacherId === teacher.id)?.assignedAt || null,
      classCount: classCounts.get(teacher.id) || 0,
      studentCount: studentCounts.get(teacher.id) || 0,
      visitCount: visitsByTeacher.get(teacher.id)?.length || 0,
      noteCount: noteCounts.get(teacher.id) || 0,
      lastVisitAt: visitsByTeacher.get(teacher.id)?.[0]?.completedAt || visitsByTeacher.get(teacher.id)?.[0]?.createdAt || null,
      followUpStatus: visitsByTeacher.get(teacher.id)?.length
        ? 'متابعة مستمرة'
        : 'لم تتم الزيارة بعد',
    })),
  });
});

assignmentRouter.get(
  '/inspector/teachers/:teacherId/follow-up',
  requireRole('inspector'),
  async (req, res) => {
    const teacherId = req.params.teacherId;
    const assignment = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
    if (
      !assignment ||
      assignment.inspectorId !== req.user!.id ||
      !['Active', 'Changed'].includes(assignment.status)
    ) {
      return res.status(404).json({ error: 'الأستاذ غير موجود ضمن إسناداتك المقبولة.' });
    }
    const academicYearId = /^\d{4}-\d{4}$/.test(String(req.query.academicYearId || ''))
      ? String(req.query.academicYearId)
      : null;
    const [teacher, classes, students, visits, notes, plans, annualPlans, operationalSessions] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: teacherId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            schoolName: true,
            institutionId: true,
            status: true,
          },
        }),
        prisma.studentClass.findMany({
          where: { teacherId },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, teacherId: true },
        }),
        prisma.student.findMany({
          where: { teacherId },
          select: { id: true, classId: true },
        }),
        prisma.inspectionVisitRecord.findMany({
          where: { teacherId, inspectorId: req.user!.id, status: null },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.inspectorNote.findMany({
          where: { authorId: req.user!.id },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.lessonPlan.findMany({
          where: { ownerId: teacherId },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        }),
        academicYearId
          ? prisma.annualPlan.findMany({
              where: { teacherId, academicYearId },
              select: {
                id: true,
                levelId: true,
                kind: true,
                status: true,
                data: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: 'desc' },
            })
          : Promise.resolve([]),
        academicYearId
          ? prisma.classPlannedSession.findMany({
              where: { teacherId, academicYearId },
              select: {
                id: true,
                classId: true,
                academicYearId: true,
                referenceSessionId: true,
                plannedDate: true,
                durationMinutes: true,
                status: true,
                startTime: true,
                venue: true,
                operationalNote: true,
              },
              orderBy: { plannedDate: 'asc' },
            })
          : Promise.resolve([]),
      ]);
    const guidance = notes
      .filter((note) => (note.data as Record<string, unknown>)?.teacherId === teacherId)
      .map((note) => note.data);
    res.json({
      success: true,
      teacher,
      assignment,
      classes,
      students,
      visits: visits.map((row) => row.data),
      guidance,
      reports: visits.filter((row) => (row.data as Record<string, unknown>)?.officialReportGenerated === true).map((row) => row.data),
      lessonPlans: plans.map((row) => ({ id: row.id, data: row.data, updatedAt: row.updatedAt })),
      academicYearId,
      annualPlans,
      operationalSessions,
    });
  }
);

assignmentRouter.get('/inspector/visits', requireRole('inspector'), async (req, res) => {
  const assignments = await prisma.inspectorAssignment.findMany({
    where: { inspectorId: req.user!.id, status: { in: ['Active', 'Changed'] } },
    select: { teacherId: true },
  });
  const teacherIds = assignments.map((assignment) => assignment.teacherId);
  const visits = await prisma.inspectionVisitRecord.findMany({
    where: { inspectorId: req.user!.id, teacherId: { in: teacherIds }, status: null },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, visits: visits.map((row) => row.data) });
});

assignmentRouter.get('/inspector/summary', requireRole('inspector'), async (req, res) => {
  const inspectorId = req.user!.id;
  const [accepted, pending, visits, notes, messages, broadcasts, pendingTransfers] = await Promise.all([
    prisma.inspectorAssignment.count({
      where: { inspectorId, status: { in: ['Active', 'Changed'] } },
    }),
    prisma.inspectorAssignment.count({ where: { inspectorId, status: 'Pending' } }),
    prisma.inspectionVisitRecord.count({ where: { inspectorId } }),
    prisma.inspectorNote.count({ where: { authorId: inspectorId } }),
    prisma.directMessage.count({ where: { recipientId: inspectorId, readAt: null } }),
    prisma.districtMessage.count({ where: { authorId: inspectorId } }),
    prisma.inspectorAssignmentTransfer.count({ where: { destinationInspectorId: inspectorId, status: 'Pending' } }),
  ]);
  res.json({
    success: true,
    summary: {
      teachersCount: accepted,
      pendingAssignmentsCount: pending + pendingTransfers,
      visitsCount: visits,
      guidanceCount: notes + broadcasts,
      unreadMessagesCount: messages,
      pendingApprovalsCount: null,
    },
  });
});

// PART B/B2 — قبل بوابة requireRole('admin') مباشرة: مسارات المفتش لقبول/رفض الإسناد
assignmentRouter.get(
  '/inspector/pending-assignments',
  requireRole('inspector'),
  async (req, res) => {
    try {
      const pending = await prisma.inspectorAssignment.findMany({
        where: { inspectorId: req.user!.id, status: 'Pending' },
        orderBy: { createdAt: 'desc' },
      });

      const teacherIds = pending.map((p) => p.teacherId);
      const teachers = await prisma.user.findMany({ where: { id: { in: teacherIds } } });
      const teacherMap = new Map(teachers.map((t) => [t.id, t]));

      const result = pending.map((a) => {
        const teacher = teacherMap.get(a.teacherId) as any;
        // الكيان المعقم للأستاذ: الاسم، schoolName، municipality، الهاتف، البريد، تاريخ الطلب
        const sterilized = teacher
          ? {
              id: teacher.id,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              schoolName: teacher.schoolName,
              municipality: teacher.municipality,
              phone: teacher.phone,
              email: teacher.email,
              birthDate: teacher.birthDate || null,
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
            }
          : null;
        return {
          ...a,
          teacher: sterilized ? sanitizeUser(sterilized as any) : null,
        };
      });

      res.json({ success: true, assignments: result });
    } catch (err) {
      console.error('pending-assignments error:', err);
      res.status(500).json({ success: false, error: 'تعذر جلب طلبات الإسناد المعلقة.' });
    }
  }
);

assignmentRouter.post(
  '/inspector/assignments/:teacherId/accept',
  requireRole('inspector'),
  async (req, res) => {
    const { teacherId } = req.params;
    try {
      const assignment = await acceptAssignment(teacherId, req.user!.id);
      res.json({ success: true, assignment });
    } catch (err: any) {
      if (err instanceof AssignmentError) {
        if (err.code === 'NOT_FOUND')
          return res.status(404).json({ success: false, error: err.message, code: err.code });
        if (err.code === 'FORBIDDEN')
          return res.status(403).json({ success: false, error: err.message, code: err.code });
        if (err.code === 'ALREADY_HANDLED')
          return res.status(409).json({ success: false, error: err.message, code: err.code });
      }
      console.error('accept assignment error:', err);
      res.status(500).json({ success: false, error: 'تعذر قبول الإسناد.' });
    }
  }
);

assignmentRouter.post(
  '/inspector/assignments/:teacherId/reject',
  requireRole('inspector'),
  async (req, res) => {
    const { teacherId } = req.params;
    const { reason } = req.body as { reason?: string };
    try {
      const assignment = await rejectAssignment(teacherId, req.user!.id, reason);
      res.json({ success: true, assignment });
    } catch (err: any) {
      if (err instanceof AssignmentError) {
        if (err.code === 'NOT_FOUND')
          return res.status(404).json({ success: false, error: err.message, code: err.code });
        if (err.code === 'FORBIDDEN')
          return res.status(403).json({ success: false, error: err.message, code: err.code });
        if (err.code === 'ALREADY_HANDLED')
          return res.status(409).json({ success: false, error: err.message, code: err.code });
      }
      console.error('reject assignment error:', err);
      res.status(500).json({ success: false, error: 'تعذر رفض الإسناد.' });
    }
  }
);

// -----------------------------------------------------------------------
// 6. صلاحيات الإدارة: إدارة الهيكل الإداري + اعتماد الاقتراحات + الإسناد الجماعي
// -----------------------------------------------------------------------

assignmentRouter.use(requireRole('admin'));

const directorateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2),
  wilayaCode: z.string().optional(),
});
assignmentRouter.post('/admin/directorates', async (req, res) => {
  const parsed = directorateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  const { id, name, wilayaCode } = parsed.data;
  const directorate = await prisma.directorate.upsert({
    where: { id },
    create: { id, name, wilayaCode },
    update: { name, wilayaCode },
  });
  res.json({ success: true, directorate });
});

const municipalitySchema = z.object({
  name: z.string().trim().min(2),
  directorateId: z.string().min(1),
});
assignmentRouter.post('/admin/municipalities', async (req, res) => {
  const parsed = municipalitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  try {
    const { name, directorateId } = parsed.data;
    const directorate = await prisma.directorate.findUnique({
      where: { id: directorateId },
      select: { id: true },
    });
    if (!directorate) return res.status(400).json({ error: 'المديرية المحددة غير موجودة.' });
    const municipality = await prisma.municipality.create({ data: { name, directorateId } });
    res.json({ success: true, municipality });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    )
      return res.status(409).json({ error: 'هذه البلدية موجودة بالفعل ضمن هذه المديرية.' });
    res.status(500).json({ error: 'تعذر إنشاء البلدية.' });
  }
});

const schoolSchema = z.object({
  name: z.string().trim().min(2),
  municipalityId: z.string().min(1),
});
assignmentRouter.post('/admin/schools', async (req, res) => {
  const parsed = schoolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  try {
    const { name, municipalityId } = parsed.data;
    const municipality = await prisma.municipality.findUnique({
      where: { id: municipalityId },
      select: { id: true },
    });
    if (!municipality) return res.status(400).json({ error: 'البلدية المحددة غير موجودة.' });
    const school = await prisma.school.create({ data: { name, municipalityId } });
    res.json({ success: true, school });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    )
      return res.status(409).json({ error: 'هذه المؤسسة موجودة بالفعل ضمن هذه البلدية.' });
    res.status(500).json({ error: 'تعذر إنشاء المؤسسة.' });
  }
});

const districtSchema = z.object({
  name: z.string().trim().min(2),
  directorateId: z.string().min(1),
  districtNumber: z.number().int().optional(),
});
assignmentRouter.post('/admin/districts', async (req, res) => {
  const parsed = districtSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  try {
    const { name, directorateId, districtNumber } = parsed.data;
    const district = await prisma.inspectionDistrict.create({
      data: { name, directorateId, districtNumber },
    });
    // اعتماد مقاطعة جديدة هو أحد نقاط إعادة الاحتساب المذكورة في المواصفة
    await bulkReassignAll();
    res.json({ success: true, district });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    )
      return res.status(409).json({ error: 'هذه المقاطعة موجودة بالفعل ضمن هذه المديرية.' });
    res.status(500).json({ error: 'تعذر إنشاء المقاطعة.' });
  }
});

assignmentRouter.delete('/admin/directorates/:id', async (req, res) => {
  try {
    const existing = await prisma.directorate.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        _count: { select: { districts: true, municipalities: true, eduUsers: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: 'المديرية غير موجودة.' });
    if (existing._count.districts || existing._count.municipalities || existing._count.eduUsers)
      return res.status(409).json({ error: 'لا يمكن حذف مديرية مرتبطة ببيانات أخرى.' });
    await prisma.directorate.delete({ where: { id: existing.id } });
  } catch {
    return res.status(409).json({ error: 'تعذر حذف المديرية بسبب تبعيات مرتبطة.' });
  }
  res.json({ success: true });
});
assignmentRouter.delete('/admin/municipalities/:id', async (req, res) => {
  try {
    const existing = await prisma.municipality.findUnique({
      where: { id: req.params.id },
      select: { id: true, _count: { select: { schools: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'البلدية غير موجودة.' });
    if (existing._count.schools)
      return res.status(409).json({ error: 'لا يمكن حذف بلدية مرتبطة ببيانات أخرى.' });
    await prisma.municipality.delete({ where: { id: existing.id } });
  } catch {
    return res.status(409).json({ error: 'تعذر حذف البلدية بسبب تبعيات مرتبطة.' });
  }
  res.json({ success: true });
});
assignmentRouter.delete('/admin/schools/:id', async (req, res) => {
  try {
    const existing = await prisma.school.findUnique({
      where: { id: req.params.id },
      select: { id: true, _count: { select: { eduUsers: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'المؤسسة غير موجودة.' });
    if (existing._count.eduUsers)
      return res.status(409).json({ error: 'لا يمكن حذف مؤسسة مرتبطة بحسابات.' });
    await prisma.school.delete({ where: { id: existing.id } });
  } catch {
    return res.status(409).json({ error: 'تعذر حذف المؤسسة بسبب تبعيات مرتبطة.' });
  }
  res.json({ success: true });
});
assignmentRouter.delete('/admin/districts/:id', async (req, res) => {
  try {
    const existing = await prisma.inspectionDistrict.findUnique({
      where: { id: req.params.id },
      select: { id: true, _count: { select: { eduUsers: true, schools: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'المقاطعة غير موجودة.' });
    if (existing._count.eduUsers || existing._count.schools)
      return res.status(409).json({ error: 'لا يمكن حذف مقاطعة مرتبطة ببيانات.' });
    await prisma.inspectionDistrict.delete({ where: { id: existing.id } });
  } catch {
    return res.status(409).json({ error: 'تعذر حذف المقاطعة بسبب تبعيات مرتبطة.' });
  }
  await bulkReassignAll();
  res.json({ success: true });
});

// اعتماد/رفض الاقتراحات
assignmentRouter.get('/admin/suggestions', async (req, res) => {
  const [municipalities, schools] = await Promise.all([
    prisma.municipalitySuggestion.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.schoolSuggestion.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  res.json({ success: true, municipalities, schools });
});

assignmentRouter.post('/admin/suggestions/municipalities/:id/approve', async (req, res) => {
  const suggestion = await prisma.municipalitySuggestion.findUnique({
    where: { id: req.params.id },
  });
  if (!suggestion || suggestion.status !== 'pending') {
    return res.status(404).json({ error: 'الاقتراح غير موجود أو تمت مراجعته بالفعل.' });
  }
  const municipality = await prisma.municipality.upsert({
    where: {
      directorateId_name: { directorateId: suggestion.directorateId, name: suggestion.name },
    },
    create: { name: suggestion.name, directorateId: suggestion.directorateId },
    update: {},
  });
  await prisma.municipalitySuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: 'approved',
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
      approvedMunicipalityId: municipality.id,
    },
  });
  res.json({ success: true, municipality });
});

assignmentRouter.post('/admin/suggestions/municipalities/:id/reject', async (req, res) => {
  const suggestion = await prisma.municipalitySuggestion
    .update({
      where: { id: req.params.id },
      data: { status: 'rejected', reviewedBy: req.user!.id, reviewedAt: new Date() },
    })
    .catch(() => null);
  if (!suggestion) return res.status(404).json({ error: 'الاقتراح غير موجود.' });
  res.json({ success: true });
});

assignmentRouter.post('/admin/suggestions/schools/:id/approve', async (req, res) => {
  const suggestion = await prisma.schoolSuggestion.findUnique({ where: { id: req.params.id } });
  if (!suggestion || suggestion.status !== 'pending') {
    return res.status(404).json({ error: 'الاقتراح غير موجود أو تمت مراجعته بالفعل.' });
  }
  const school = await prisma.school.upsert({
    where: {
      municipalityId_name: { municipalityId: suggestion.municipalityId, name: suggestion.name },
    },
    create: { name: suggestion.name, municipalityId: suggestion.municipalityId },
    update: {},
  });
  await prisma.schoolSuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: 'approved',
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
      approvedSchoolId: school.id,
    },
  });
  res.json({ success: true, school });
});

assignmentRouter.post('/admin/suggestions/schools/:id/reject', async (req, res) => {
  const suggestion = await prisma.schoolSuggestion
    .update({
      where: { id: req.params.id },
      data: { status: 'rejected', reviewedBy: req.user!.id, reviewedAt: new Date() },
    })
    .catch(() => null);
  if (!suggestion) return res.status(404).json({ error: 'الاقتراح غير موجود.' });
  res.json({ success: true });
});

// Consolidated Inspector administration read model and validated Admin assignment creation.
assignmentRouter.get('/admin/inspectors/workspace', requireRole('admin'), async (_req, res) => {
  const [inspectors, districts, teachers, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'inspector' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        directorateId: true,
        districtId: true,
        eduDirectorateId: true,
        eduDistrictId: true,
        createdAt: true,
        isPlatformOwner: true,
        eduDirectorate: { select: { id: true, name: true } },
        eduDistrict: { select: { id: true, name: true } },
      },
    }),
    prisma.inspectionDistrict.findMany({
      orderBy: [{ directorateId: 'asc' }, { districtNumber: 'asc' }, { name: 'asc' }],
      include: { directorate: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'teacher' },
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        directorateId: true,
        districtId: true,
        eduDirectorateId: true,
        eduDistrictId: true,
        schoolName: true,
        createdAt: true,
        teacherAssignment: {
          select: { status: true, inspectorId: true, assignedAt: true, createdAt: true },
        },
      },
    }),
    prisma.inspectorAssignment.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            directorateId: true,
            districtId: true,
            eduDirectorateId: true,
            eduDistrictId: true,
            schoolName: true,
          },
        },
        inspector: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            directorateId: true,
            districtId: true,
            eduDirectorateId: true,
            eduDistrictId: true,
          },
        },
      },
    }),
  ]);
  const countByInspector = new Map<string, { accepted: number; pending: number }>();
  for (const row of assignments) {
    if (!row.inspectorId) continue;
    const counts = countByInspector.get(row.inspectorId) || { accepted: 0, pending: 0 };
    if (['Active', 'Changed'].includes(row.status)) counts.accepted += 1;
    if (row.status === 'Pending') counts.pending += 1;
    countByInspector.set(row.inspectorId, counts);
  }
  const inspectorByDistrict = new Map<string, (typeof inspectors)[number]>();
  for (const inspector of inspectors) {
    const districtId = inspector.districtId || inspector.eduDistrictId;
    if (districtId && inspector.status === 'active') inspectorByDistrict.set(districtId, inspector);
  }
  const districtRows = districts.map((district) => {
    const inspector = inspectorByDistrict.get(district.id);
    const counts = inspector
      ? countByInspector.get(inspector.id) || { accepted: 0, pending: 0 }
      : { accepted: 0, pending: 0 };
    return {
      id: district.id,
      name: district.name,
      districtNumber: district.districtNumber,
      directorate: district.directorate,
      inspector: inspector ? sanitizeUser(inspector) : null,
      acceptedTeacherCount: counts.accepted,
      pendingAssignmentCount: counts.pending,
    };
  });
  res.json({
    success: true,
    inspectors: inspectors.map((inspector) => ({
      ...sanitizeUser(inspector),
      acceptedTeacherCount: countByInspector.get(inspector.id)?.accepted || 0,
      pendingAssignmentCount: countByInspector.get(inspector.id)?.pending || 0,
    })),
    districts: districtRows,
    teachers: teachers.map((teacher) => sanitizeUser(teacher)),
    assignments: assignments.map((assignment) => ({
      ...assignment,
      teacher: assignment.teacher ? sanitizeUser(assignment.teacher) : null,
      inspector: assignment.inspector ? sanitizeUser(assignment.inspector) : null,
    })),
  });
});

const adminAssignmentSchema = z.object({
  teacherId: z.string().min(1),
  inspectorId: z.string().min(1),
});
assignmentRouter.post('/admin/assignments', requireRole('admin'), async (req, res) => {
  const parsed = adminAssignmentSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ success: false, error: 'الأستاذ والمفتش مطلوبان.' });
  const { teacherId, inspectorId } = parsed.data;
  const [teacher, inspector] = await Promise.all([
    prisma.user.findUnique({ where: { id: teacherId } }),
    prisma.user.findUnique({ where: { id: inspectorId } }),
  ]);
  if (!teacher || teacher.role !== 'teacher')
    return res.status(404).json({ success: false, error: 'الأستاذ غير موجود.' });
  if (!inspector || inspector.role !== 'inspector' || inspector.status !== 'active')
    return res.status(400).json({ success: false, error: 'يجب اختيار مفتش نشط.' });
  const currentAssignment = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  if (currentAssignment && ['Active', 'Changed'].includes(currentAssignment.status)) {
    if (currentAssignment.inspectorId === inspectorId) return res.json({ success: true, assignment: currentAssignment });
    try {
      const transfer = await requestTeacherTransfer({ teacherId, destinationInspectorId: inspectorId, requestedById: req.user!.id });
      return res.json({ success: true, assignment: currentAssignment, transfer });
    } catch (error) { return transferFailure(res, error); }
  }
  const teacherDirectorate = teacher.directorateId || teacher.eduDirectorateId || '';
  const teacherDistrict = teacher.districtId || teacher.eduDistrictId || '';
  const inspectorDirectorate = inspector.directorateId || inspector.eduDirectorateId || '';
  const inspectorDistrict = inspector.districtId || inspector.eduDistrictId || '';
  if (!teacherDirectorate || !teacherDistrict)
    return res
      .status(400)
      .json({ success: false, error: 'لا يمكن تحديد مديرية أو مقاطعة الأستاذ.' });
  if (teacherDirectorate !== inspectorDirectorate || teacherDistrict !== inspectorDistrict)
    return res.status(400).json({
      success: false,
      error: 'لا يمكن إسناد الأستاذ إلى مفتش من مديرية أو مقاطعة مختلفة.',
    });
  const district = await prisma.inspectionDistrict.findUnique({
    where: { id: inspectorDistrict },
    select: { directorateId: true },
  });
  if (!district || district.directorateId !== inspectorDirectorate)
    return res
      .status(400)
      .json({ success: false, error: 'المقاطعة لا تنتمي إلى المديرية المحددة.' });
  const occupied = await prisma.user.findFirst({
    where: {
      role: 'inspector',
      status: 'active',
      id: { not: inspector.id },
      OR: [
        { districtId: inspectorDistrict, directorateId: inspectorDirectorate },
        { eduDistrictId: inspectorDistrict, eduDirectorateId: inspectorDirectorate },
        { districtId: inspectorDistrict, eduDirectorateId: inspectorDirectorate },
        { eduDistrictId: inspectorDistrict, directorateId: inspectorDirectorate },
      ],
    },
    select: { id: true },
  });
  if (occupied)
    return res.status(409).json({ success: false, error: 'المقاطعة مرتبطة بمفتش نشط آخر.' });
  try {
    const assignment = await createInitialAssignmentRequest(teacherId, inspectorId, req.user!.id);
    res.json({ success: true, assignment });
  } catch (error) { return transferFailure(res, error); }
});
// عرض جميع سجلات الإسناد (لوحة تحكم الإدارة)
assignmentRouter.get('/admin/assignments', async (req, res) => {
  const { status } = req.query;
  const assignments = await prisma.inspectorAssignment.findMany({
    where: status ? { status: String(status) } : undefined,
    orderBy: { updatedAt: 'desc' },
  });
  const userIds = Array.from(
    new Set(assignments.flatMap((a) => [a.teacherId, a.inspectorId].filter(Boolean) as string[]))
  );
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap = new Map(users.map((u) => [u.id, sanitizeUser(u)]));

  res.json({
    success: true,
    assignments: assignments.map((a) => ({
      ...a,
      teacher: userMap.get(a.teacherId) || null,
      inspector: a.inspectorId ? userMap.get(a.inspectorId) || null : null,
    })),
  });
});

// إعادة تنفيذ الإسناد الجماعي عند الحاجة
assignmentRouter.post('/admin/assignments/reassign-all', async (req, res) => {
  if (req.body?.confirm !== true)
    return res.status(400).json({ error: 'يجب تأكيد إعادة إسناد جميع الأساتذة قبل التنفيذ.' });
  const result = await bulkReassignAll(req.user!.id);
  res.json({ success: true, ...result });
});

// إلغاء إسناد أستاذ يدوياً (أداة إدارية استثنائية فقط)
assignmentRouter.post('/admin/assignments/:teacherId/remove', async (req, res) => {
  try {
    const assignment = await removeAssignment(req.params.teacherId, req.user!.id);
    if (!assignment) return res.status(404).json({ error: 'لا يوجد سجل إسناد لهذا الأستاذ.' });
    res.json({ success: true, assignment });
  } catch (error) { return transferFailure(res, error); }
});

// إعادة إسناد يدوية استثنائية لأستاذ واحد (بدل الانتظار للاحتساب التلقائي)
assignmentRouter.post('/admin/assignments/:teacherId/reassign', async (req, res) => {
  const assignment = await reassignTeacher(req.params.teacherId, prisma, req.user!.id);
  if (!assignment)
    return res
      .status(404)
      .json({ error: 'لم يتم العثور على أستاذ ببيانات مهنية مكتملة بهذا المعرّف.' });
  res.json({ success: true, assignment });
});
