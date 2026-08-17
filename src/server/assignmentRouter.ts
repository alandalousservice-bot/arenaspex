/**
 * SPEX - مسارات نظام الإسناد التلقائي للأساتذة إلى المفتشين
 * (الهيكل الإداري: مديريات / بلديات / مؤسسات / مقاطعات تفتيشية + الاقتراحات + الإسناد)
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from './prismaClient.js';
import { sanitizeUser } from './auth.js';
import { requireRole } from './middleware/requireAuth.js';
import { reassignTeacher, bulkReassignAll, removeAssignment } from './assignmentService.js';

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
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, municipalities });
});

assignmentRouter.get('/locations/directorates/:id/districts', async (req, res) => {
  const districts = await prisma.inspectionDistrict.findMany({
    where: { directorateId: req.params.id },
    orderBy: { districtNumber: 'asc' }
  });
  res.json({ success: true, districts });
});

assignmentRouter.get('/locations/municipalities/:id/schools', async (req, res) => {
  const schools = await prisma.school.findMany({
    where: { municipalityId: req.params.id },
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, schools });
});

// -----------------------------------------------------------------------
// 2. اقتراحات إضافة بلدية/مؤسسة غير موجودة — أي مستخدم يمكنه الاقتراح، ولا تظهر
//    لبقية المستخدمين حتى تعتمدها الإدارة
// -----------------------------------------------------------------------

const suggestMunicipalitySchema = z.object({
  name: z.string().trim().min(2, 'اسم البلدية قصير جداً'),
  directorateId: z.string().min(1)
});

assignmentRouter.post('/locations/municipalities/suggest', async (req, res) => {
  const parsed = suggestMunicipalitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const directorate = await prisma.directorate.findUnique({ where: { id: parsed.data.directorateId } });
  if (!directorate) {
    return res.status(404).json({ error: 'مديرية التربية المحددة غير موجودة.' });
  }
  const suggestion = await prisma.municipalitySuggestion.create({
    data: { name: parsed.data.name, directorateId: parsed.data.directorateId, suggestedBy: req.user!.id }
  });
  res.json({
    success: true,
    suggestion,
    message: 'تم إرسال اقتراحك بنجاح، وسيتم إسناد إشرافك تلقائياً بمجرد اعتماد الإدارة له.'
  });
});

const suggestSchoolSchema = z.object({
  name: z.string().trim().min(2, 'اسم المؤسسة قصير جداً'),
  municipalityId: z.string().min(1)
});

assignmentRouter.post('/locations/schools/suggest', async (req, res) => {
  const parsed = suggestSchoolSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const municipality = await prisma.municipality.findUnique({ where: { id: parsed.data.municipalityId } });
  if (!municipality) {
    return res.status(404).json({ error: 'البلدية المحددة غير موجودة.' });
  }
  const suggestion = await prisma.schoolSuggestion.create({
    data: { name: parsed.data.name, municipalityId: parsed.data.municipalityId, suggestedBy: req.user!.id }
  });
  res.json({
    success: true,
    suggestion,
    message: 'تم إرسال اقتراحك بنجاح، وسيتم إسناد إشرافك تلقائياً بمجرد اعتماد الإدارة له.'
  });
});

// -----------------------------------------------------------------------
// 3. استكمال البيانات المهنية للأستاذ — الخطوة التي تُطلق الإسناد التلقائي
// -----------------------------------------------------------------------

const professionalDataSchema = z.object({
  directorateId: z.string().min(1, 'يجب اختيار مديرية التربية'),
  municipalityId: z.string().min(1, 'يجب اختيار بلدية العمل'),
  institutionId: z.string().min(1, 'يجب اختيار المؤسسة التعليمية'),
  districtId: z.string().min(1, 'يجب اختيار المقاطعة التفتيشية')
});

assignmentRouter.put('/teacher/professional-data', requireRole('teacher'), async (req, res) => {
  const parsed = professionalDataSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const { directorateId, municipalityId, institutionId, districtId } = parsed.data;

  const [directorate, municipality, school, district] = await Promise.all([
    prisma.directorate.findUnique({ where: { id: directorateId } }),
    prisma.municipality.findUnique({ where: { id: municipalityId } }),
    prisma.school.findUnique({ where: { id: institutionId } }),
    prisma.inspectionDistrict.findUnique({ where: { id: districtId } })
  ]);

  if (!directorate) return res.status(404).json({ error: 'مديرية التربية غير موجودة.' });
  if (!municipality || municipality.directorateId !== directorateId) {
    return res.status(400).json({ error: 'البلدية المحددة لا تتبع مديرية التربية المختارة.' });
  }
  if (!school || school.municipalityId !== municipalityId) {
    return res.status(400).json({ error: 'المؤسسة المحددة لا تتبع البلدية المختارة.' });
  }
  if (!district || district.directorateId !== directorateId) {
    return res.status(400).json({ error: 'المقاطعة التفتيشية المحددة لا تتبع مديرية التربية المختارة.' });
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      directorateId,
      municipalityId,
      municipality: municipality.name,
      institutionId,
      schoolName: school.name,
      districtId
    }
  });

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
      assignment?.status === 'Active' || assignment?.status === 'Changed'
        ? 'تم استكمال بياناتك وربطك تلقائياً بمفتش التربية البدنية والرياضية المختص.'
        : 'تم حفظ بياناتك بنجاح. لا يوجد حالياً مفتش مسجَّل لمقاطعتك، وسيتم الإسناد تلقائياً بمجرد توفره.'
  });
});

// -----------------------------------------------------------------------
// 4. صلاحيات الأستاذ: معرفة المفتش المشرف عليه
// -----------------------------------------------------------------------

assignmentRouter.get('/teacher/assignment', requireRole('teacher'), async (req, res) => {
  const assignment = await prisma.inspectorAssignment.findUnique({ where: { teacherId: req.user!.id } });
  if (!assignment) {
    return res.json({ success: true, assignment: null, inspector: null });
  }
  let inspector = null;
  if (assignment.inspectorId) {
    const insp = await prisma.user.findUnique({ where: { id: assignment.inspectorId } });
    if (insp) inspector = sanitizeUser(insp);
  }
  res.json({ success: true, assignment, inspector });
});

// -----------------------------------------------------------------------
// 5. صلاحيات المفتش: قائمة الأساتذة التابعين له فقط
// -----------------------------------------------------------------------

assignmentRouter.get('/inspector/teachers', requireRole('inspector'), async (req, res) => {
  const { municipalityId, institutionId } = req.query;

  const assignments = await prisma.inspectorAssignment.findMany({
    where: { inspectorId: req.user!.id, status: { in: ['Active', 'Changed'] } }
  });
  const teacherIds = assignments.map((a) => a.teacherId);

  const teachers = await prisma.user.findMany({
    where: {
      id: { in: teacherIds },
      ...(municipalityId ? { municipalityId: String(municipalityId) } : {}),
      ...(institutionId ? { institutionId: String(institutionId) } : {})
    },
    orderBy: { firstName: 'asc' }
  });

  res.json({ success: true, teachers: teachers.map(sanitizeUser) });
});

// -----------------------------------------------------------------------
// 6. صلاحيات الإدارة: إدارة الهيكل الإداري + اعتماد الاقتراحات + الإسناد الجماعي
// -----------------------------------------------------------------------

assignmentRouter.use(requireRole('admin'));

const directorateSchema = z.object({ id: z.string().min(1), name: z.string().trim().min(2), wilayaCode: z.string().optional() });
assignmentRouter.post('/admin/directorates', async (req, res) => {
  const parsed = directorateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  const { id, name, wilayaCode } = parsed.data;
  const directorate = await prisma.directorate.upsert({
    where: { id },
    create: { id, name, wilayaCode },
    update: { name, wilayaCode }
  });
  res.json({ success: true, directorate });
});

const municipalitySchema = z.object({ name: z.string().trim().min(2), directorateId: z.string().min(1) });
assignmentRouter.post('/admin/municipalities', async (req, res) => {
  const parsed = municipalitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  try {
    const { name, directorateId } = parsed.data;
    const municipality = await prisma.municipality.create({ data: { name, directorateId } });
    res.json({ success: true, municipality });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') return res.status(409).json({ error: 'هذه البلدية موجودة بالفعل ضمن هذه المديرية.' });
    res.status(500).json({ error: 'تعذر إنشاء البلدية.' });
  }
});

const schoolSchema = z.object({ name: z.string().trim().min(2), municipalityId: z.string().min(1) });
assignmentRouter.post('/admin/schools', async (req, res) => {
  const parsed = schoolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  try {
    const { name, municipalityId } = parsed.data;
    const school = await prisma.school.create({ data: { name, municipalityId } });
    res.json({ success: true, school });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') return res.status(409).json({ error: 'هذه المؤسسة موجودة بالفعل ضمن هذه البلدية.' });
    res.status(500).json({ error: 'تعذر إنشاء المؤسسة.' });
  }
});

const districtSchema = z.object({
  name: z.string().trim().min(2),
  directorateId: z.string().min(1),
  districtNumber: z.number().int().optional()
});
assignmentRouter.post('/admin/districts', async (req, res) => {
  const parsed = districtSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
  try {
    const { name, directorateId, districtNumber } = parsed.data;
    const district = await prisma.inspectionDistrict.create({ data: { name, directorateId, districtNumber } });
    // اعتماد مقاطعة جديدة هو أحد نقاط إعادة الاحتساب المذكورة في المواصفة
    await bulkReassignAll();
    res.json({ success: true, district });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') return res.status(409).json({ error: 'هذه المقاطعة موجودة بالفعل ضمن هذه المديرية.' });
    res.status(500).json({ error: 'تعذر إنشاء المقاطعة.' });
  }
});

assignmentRouter.delete('/admin/directorates/:id', async (req, res) => {
  try {
    await prisma.directorate.delete({ where: { id: req.params.id } });
  } catch {
    /* غير موجودة مسبقاً */
  }
  res.json({ success: true });
});
assignmentRouter.delete('/admin/municipalities/:id', async (req, res) => {
  try {
    await prisma.municipality.delete({ where: { id: req.params.id } });
  } catch {
    /* غير موجودة مسبقاً */
  }
  res.json({ success: true });
});
assignmentRouter.delete('/admin/schools/:id', async (req, res) => {
  try {
    await prisma.school.delete({ where: { id: req.params.id } });
  } catch {
    /* غير موجودة مسبقاً */
  }
  res.json({ success: true });
});
assignmentRouter.delete('/admin/districts/:id', async (req, res) => {
  try {
    await prisma.inspectionDistrict.delete({ where: { id: req.params.id } });
  } catch {
    /* غير موجودة مسبقاً */
  }
  await bulkReassignAll();
  res.json({ success: true });
});

// اعتماد/رفض الاقتراحات
assignmentRouter.get('/admin/suggestions', async (req, res) => {
  const [municipalities, schools] = await Promise.all([
    prisma.municipalitySuggestion.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } }),
    prisma.schoolSuggestion.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } })
  ]);
  res.json({ success: true, municipalities, schools });
});

assignmentRouter.post('/admin/suggestions/municipalities/:id/approve', async (req, res) => {
  const suggestion = await prisma.municipalitySuggestion.findUnique({ where: { id: req.params.id } });
  if (!suggestion || suggestion.status !== 'pending') {
    return res.status(404).json({ error: 'الاقتراح غير موجود أو تمت مراجعته بالفعل.' });
  }
  const municipality = await prisma.municipality.upsert({
    where: { directorateId_name: { directorateId: suggestion.directorateId, name: suggestion.name } },
    create: { name: suggestion.name, directorateId: suggestion.directorateId },
    update: {}
  });
  await prisma.municipalitySuggestion.update({
    where: { id: suggestion.id },
    data: { status: 'approved', reviewedBy: req.user!.id, reviewedAt: new Date(), approvedMunicipalityId: municipality.id }
  });
  res.json({ success: true, municipality });
});

assignmentRouter.post('/admin/suggestions/municipalities/:id/reject', async (req, res) => {
  const suggestion = await prisma.municipalitySuggestion.update({
    where: { id: req.params.id },
    data: { status: 'rejected', reviewedBy: req.user!.id, reviewedAt: new Date() }
  }).catch(() => null);
  if (!suggestion) return res.status(404).json({ error: 'الاقتراح غير موجود.' });
  res.json({ success: true });
});

assignmentRouter.post('/admin/suggestions/schools/:id/approve', async (req, res) => {
  const suggestion = await prisma.schoolSuggestion.findUnique({ where: { id: req.params.id } });
  if (!suggestion || suggestion.status !== 'pending') {
    return res.status(404).json({ error: 'الاقتراح غير موجود أو تمت مراجعته بالفعل.' });
  }
  const school = await prisma.school.upsert({
    where: { municipalityId_name: { municipalityId: suggestion.municipalityId, name: suggestion.name } },
    create: { name: suggestion.name, municipalityId: suggestion.municipalityId },
    update: {}
  });
  await prisma.schoolSuggestion.update({
    where: { id: suggestion.id },
    data: { status: 'approved', reviewedBy: req.user!.id, reviewedAt: new Date(), approvedSchoolId: school.id }
  });
  res.json({ success: true, school });
});

assignmentRouter.post('/admin/suggestions/schools/:id/reject', async (req, res) => {
  const suggestion = await prisma.schoolSuggestion.update({
    where: { id: req.params.id },
    data: { status: 'rejected', reviewedBy: req.user!.id, reviewedAt: new Date() }
  }).catch(() => null);
  if (!suggestion) return res.status(404).json({ error: 'الاقتراح غير موجود.' });
  res.json({ success: true });
});

// عرض جميع سجلات الإسناد (لوحة تحكم الإدارة)
assignmentRouter.get('/admin/assignments', async (req, res) => {
  const { status } = req.query;
  const assignments = await prisma.inspectorAssignment.findMany({
    where: status ? { status: String(status) } : undefined,
    orderBy: { updatedAt: 'desc' }
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
      inspector: a.inspectorId ? userMap.get(a.inspectorId) || null : null
    }))
  });
});

// إعادة تنفيذ الإسناد الجماعي عند الحاجة
assignmentRouter.post('/admin/assignments/reassign-all', async (req, res) => {
  const result = await bulkReassignAll();
  res.json({ success: true, ...result });
});

// إلغاء إسناد أستاذ يدوياً (أداة إدارية استثنائية فقط)
assignmentRouter.post('/admin/assignments/:teacherId/remove', async (req, res) => {
  const assignment = await removeAssignment(req.params.teacherId);
  if (!assignment) return res.status(404).json({ error: 'لا يوجد سجل إسناد لهذا الأستاذ.' });
  res.json({ success: true, assignment });
});

// إعادة إسناد يدوية استثنائية لأستاذ واحد (بدل الانتظار للاحتساب التلقائي)
assignmentRouter.post('/admin/assignments/:teacherId/reassign', async (req, res) => {
  const assignment = await reassignTeacher(req.params.teacherId);
  if (!assignment) return res.status(404).json({ error: 'لم يتم العثور على أستاذ ببيانات مهنية مكتملة بهذا المعرّف.' });
  res.json({ success: true, assignment });
});
