/**
 * SPEX - Express Server API Router (Production)
 * مسارات واجهة البرمجة: قاعدة بيانات Postgres حقيقية عبر Prisma، محمية بالمصادقة والصلاحيات
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  generatePELessonPlan,
  improvePELessonWording,
  suggestPEGames,
  generateAIChatResponse,
  getConfiguredAIProviders,
  testConfiguredAIProvider,
} from './aiService.js';
import {
  allAIProviderRecords,
  invalidateAIProviderCache,
  type AIProviderType,
} from './aiGateway.js';
import { prisma } from './prismaClient.js';
import { hashPassword, sanitizeUser, sanitizeOwnUser, encryptApiKey } from './auth.js';
import { requireAuth, requireRole } from './middleware/requireAuth.js';
import { reassignTeacher, reassignAllForInspector } from './assignmentService.js';
import { canWriteRecord, resolveOwnerFieldValue } from './collectionAuth.js';
import { canReadDistrictMessage, normalizeMessageText } from '../services/communicationRules.js';
import { providerIsUsable } from './generationAccess.policy.js';
import { teacherAttendanceRouter } from './attendanceRouter.js';
import { findActiveMedicalExemption } from './medicalExemption.service.js';
import {
  buildClassPlannedSessionSeeds,
  buildClassPlannedSessionSeedsFromCanonicalSessions,
  canonicalReferenceSessions,
  effectivePlanningObjective,
  generateAllPrimaryLevelDistributions,
  isValidPlanningDate,
  normalizePrimaryLevelId,
  type PlanningWordingOverrides,
} from '../services/teacherPlanning.service.js';
import { COMPLETE_ANNUAL_CURRICULUM } from '../data/algerianCurriculum.js';
import { isValidAcademicSchoolDate } from '../data/academicCalendars.js';
import {
  isCanonicalAcademicYearId,
  isPlanningStartDateConsistent,
} from '../services/academicYear.js';
import {
  resolveGenerationCredential,
  resolvePersonalGenerationCredential,
  resolvePlatformFallbackCredential,
  type GenerationFeature,
} from './generationAccess.js';
import { validateWeeklyTime, type WeeklyDay, WEEKDAYS } from '../services/weeklyTimetable.js';
import {
  canonicalClassIdentityKey,
  normalizeExcelMatricule,
  parseStudentRosterWorkbook,
  rosterPreviewSummary,
  type ParsedRosterStudent,
} from '../services/studentRosterImport.service.js';
import { deleteOwnedStudent, StudentDeletionError } from '../services/studentDeletion.service.js';
import { buildStudentRosterReadModel } from '../services/studentRosterReadModel.service.js';
import { persistStudentRosterRows } from '../services/studentRosterPersistence.service.js';
import {
  deleteOwnedStudentClass,
  StudentClassDeletionError,
} from '../services/studentClassDeletion.service.js';

// نظام الإسناد التلقائي للأساتذة إلى المفتشين: يُعاد احتساب جهة الإشراف تلقائياً
// عند تسجيل/تعديل أستاذ (يعاد ربطه بمفتشه) أو تسجيل/تعديل مفتش (يعاد ربط كل الأساتذة
// المطابقين له) — دون أي تدخل يدوي من الإدارة، تماماً كما ورد في المواصفة.
async function triggerAutoAssignment(savedUser: { id: string; role: string }) {
  try {
    if (savedUser.role === 'teacher') {
      await reassignTeacher(savedUser.id);
    } else if (savedUser.role === 'inspector') {
      await reassignAllForInspector(savedUser.id);
    }
  } catch (err) {
    console.error('Error running auto-assignment:', err);
  }
}

export const apiRouter = Router();

// Health Check (عام، بدون بيانات حساسة)
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'SPEX Platform',
    version: '2.0.0',
    aiProvidersConfigured: Boolean(
      process.env.NVIDIA_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
    ),
  });
});

// كل ما يلي يتطلب تسجيل دخول صالح
apiRouter.use(requireAuth);
apiRouter.use(teacherAttendanceRouter);

const academicYearIdSchema = z
  .string()
  .trim()
  .refine(isCanonicalAcademicYearId, 'السنة الدراسية يجب أن تكون بصيغة YYYY-YYYY متتالية.');

const classPlanningQuerySchema = z.object({
  academicYearId: academicYearIdSchema,
});

const classPlanningInitializeSchema = z
  .object({
    academicYearId: academicYearIdSchema,
    planningStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((value) => isPlanningStartDateConsistent(value.academicYearId, value.planningStartDate), {
    message: 'تاريخ بداية التوزيع يجب أن يقع ضمن السنة الدراسية المحددة.',
  })
  .refine((value) => isValidPlanningDate(value.planningStartDate), {
    message: 'تاريخ بداية التوزيع يجب أن يقع في يوم دراسي صالح.',
  });

const classPlanningUpdateSchema = z.object({
  plannedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startTime: z.string().trim().max(20).nullable().optional(),
  venue: z.string().trim().max(200).nullable().optional(),
  operationalNote: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['مبرمجة', 'منجزة', 'مؤجلة', 'غير منجزة']).optional(),
});

const weeklySlotSchema = z.object({
  classId: z.string().trim().min(1),
  academicYearId: academicYearIdSchema,
  weekday: z.union([z.number().int().min(0).max(4), z.enum(WEEKDAYS)]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

function weeklySlotView(row: any) {
  return {
    id: row.id,
    teacherId: row.teacherId,
    classId: row.classId,
    className: row.class?.name || 'قسم غير محدد',
    levelId: row.class?.levelId || null,
    academicYearId: row.academicYearId,
    weekday: row.weekday,
    day: WEEKDAYS[row.weekday] || WEEKDAYS[0],
    startTime: row.startTime,
    endTime: row.endTime,
    timeSlot: `${row.startTime} - ${row.endTime}`,
  };
}

function weeklyWeekday(value: number | WeeklyDay): number {
  return typeof value === 'number' ? value : WEEKDAYS.indexOf(value);
}

async function weeklySlotsForTeacher(teacherId: string, academicYearId: string) {
  return prisma.teacherWeeklySlot.findMany({
    where: { teacherId, academicYearId },
    include: { class: { select: { name: true, levelId: true } } },
    orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
  });
}

apiRouter.get('/teacher/weekly-timetable', requireRole('teacher'), async (req, res) => {
  const academicYearId = academicYearIdSchema.safeParse(req.query.academicYearId);
  if (!academicYearId.success) return res.status(400).json({ error: 'السنة الدراسية مطلوبة.' });
  const slots = await weeklySlotsForTeacher(req.user!.id, academicYearId.data);
  res.json({ success: true, slots: slots.map(weeklySlotView) });
});

apiRouter.get(
  '/inspector/teachers/:teacherId/weekly-timetable',
  requireRole('inspector'),
  async (req, res) => {
    const academicYearId = academicYearIdSchema.safeParse(req.query.academicYearId);
    if (!academicYearId.success) return res.status(400).json({ error: 'السنة الدراسية مطلوبة.' });
    const assignment = await prisma.inspectorAssignment.findUnique({
      where: { teacherId: req.params.teacherId },
    });
    if (
      !assignment ||
      assignment.inspectorId !== req.user!.id ||
      !['Active', 'Changed'].includes(assignment.status)
    ) {
      return res
        .status(403)
        .json({ error: 'لا تملك صلاحية الاطلاع على التوقيت الأسبوعي لهذا الأستاذ.' });
    }
    const teacher = await prisma.user.findUnique({
      where: { id: req.params.teacherId },
      select: { id: true, firstName: true, lastName: true, schoolName: true },
    });
    if (!teacher) return res.status(404).json({ error: 'الأستاذ غير موجود.' });
    const slots = await weeklySlotsForTeacher(teacher.id, academicYearId.data);
    res.json({ success: true, teacher, slots: slots.map(weeklySlotView) });
  }
);

apiRouter.post('/teacher/weekly-timetable', requireRole('teacher'), async (req, res) => {
  const parsed = weeklySlotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'بيانات الحصة الأسبوعية غير صحيحة.' });
  const { classId, academicYearId, startTime, endTime } = parsed.data;
  const weekday = weeklyWeekday(parsed.data.weekday);
  const timeError = validateWeeklyTime(startTime, endTime);
  if (timeError) return res.status(400).json({ error: timeError });
  const classRecord = await prisma.studentClass.findFirst({
    where: { id: classId, teacherId: req.user!.id },
  });
  if (!classRecord) return res.status(403).json({ error: 'القسم غير موجود ضمن أقسامك.' });
  const existing = await prisma.teacherWeeklySlot.findMany({
    where: { teacherId: req.user!.id, academicYearId, weekday },
  });
  const overlaps = existing.some((slot) => startTime < slot.endTime && endTime > slot.startTime);
  if (overlaps)
    return res.status(409).json({ error: 'لا يمكن إضافة حصة متداخلة مع حصة أخرى في اليوم نفسه.' });
  const saved = await prisma.teacherWeeklySlot.create({
    data: {
      id: `weekly_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teacherId: req.user!.id,
      classId,
      academicYearId,
      weekday,
      startTime,
      endTime,
    },
    include: { class: { select: { name: true, levelId: true } } },
  });
  res.status(201).json({ success: true, slot: weeklySlotView(saved) });
});

apiRouter.patch('/teacher/weekly-timetable/:slotId', requireRole('teacher'), async (req, res) => {
  const parsed = weeklySlotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'بيانات الحصة الأسبوعية غير صحيحة.' });
  const { classId, academicYearId, startTime, endTime } = parsed.data;
  const weekday = weeklyWeekday(parsed.data.weekday);
  const timeError = validateWeeklyTime(startTime, endTime);
  if (timeError) return res.status(400).json({ error: timeError });
  const existing = await prisma.teacherWeeklySlot.findFirst({
    where: { id: req.params.slotId, teacherId: req.user!.id },
  });
  const classRecord = await prisma.studentClass.findFirst({
    where: { id: classId, teacherId: req.user!.id },
  });
  if (!existing || !classRecord)
    return res.status(404).json({ error: 'الحصة الأسبوعية غير موجودة ضمن أقسامك.' });
  const others = await prisma.teacherWeeklySlot.findMany({
    where: { teacherId: req.user!.id, academicYearId, weekday, id: { not: existing.id } },
  });
  if (others.some((slot) => startTime < slot.endTime && endTime > slot.startTime))
    return res.status(409).json({ error: 'لا يمكن إضافة حصة متداخلة مع حصة أخرى في اليوم نفسه.' });
  const saved = await prisma.teacherWeeklySlot.update({
    where: { id: existing.id },
    data: { classId, academicYearId, weekday, startTime, endTime },
    include: { class: { select: { name: true, levelId: true } } },
  });
  res.json({ success: true, slot: weeklySlotView(saved) });
});

apiRouter.delete('/teacher/weekly-timetable/:slotId', requireRole('teacher'), async (req, res) => {
  await prisma.teacherWeeklySlot.deleteMany({
    where: { id: req.params.slotId, teacherId: req.user!.id },
  });
  res.json({ success: true });
});

function classPlannedSessionView(row: {
  id: string;
  teacherId: string;
  classId: string;
  academicYearId: string;
  referenceSessionId: string;
  plannedDate: Date;
  durationMinutes: number;
  status: string;
  startTime: string | null;
  venue: string | null;
  operationalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    teacherId: row.teacherId,
    classId: row.classId,
    academicYearId: row.academicYearId,
    referenceSessionId: row.referenceSessionId,
    plannedDate: row.plannedDate.toISOString().slice(0, 10),
    durationMinutes: row.durationMinutes,
    status: row.status,
    startTime: row.startTime,
    venue: row.venue,
    operationalNote: row.operationalNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolvePlanningReferences(
  levelId: string,
  teacherId: string,
  academicYearId: string
) {
  const normalizedLevelId = normalizePrimaryLevelId(levelId);
  if (!normalizedLevelId) return new Map();
  const [referenceSessions, wordingPlan] = await Promise.all([
    Promise.resolve(canonicalReferenceSessions(normalizedLevelId)),
    prisma.annualPlan.findUnique({
      where: {
        teacherId_academicYearId_levelId_kind: {
          teacherId,
          academicYearId,
          levelId: normalizedLevelId,
          kind: 'section_wording',
        },
      },
      select: { data: true },
    }),
  ]);
  const overrides = ((wordingPlan?.data as { overrides?: PlanningWordingOverrides } | null)
    ?.overrides || {}) as PlanningWordingOverrides;
  const fields = COMPLETE_ANNUAL_CURRICULUM[normalizedLevelId]?.fields || {};
  return new Map(
    referenceSessions.map((reference) => [
      reference.referenceSessionId,
      {
        referenceSessionId: reference.referenceSessionId,
        grade: reference.grade,
        domainId: reference.domainId,
        fieldName: fields[reference.domainId]?.fieldName || reference.domainId,
        finalCompetency: fields[reference.domainId]?.finalCompetency || '',
        learningSectionId: reference.learningSectionId,
        objectiveId: reference.objectiveId,
        objectiveGroupId: reference.objectiveGroupId,
        objective: effectivePlanningObjective(reference, overrides),
        sessionType: reference.sessionType,
        sessionTypeLabel: reference.sessionTypeLabel,
        sequenceIndex: reference.sequenceIndex,
        fieldSessionNumber: reference.fieldSessionNumber,
      },
    ])
  );
}

apiRouter.get(
  '/teacher/planning/classes/:classId/sessions',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = classPlanningQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'السنة الدراسية مطلوبة.' });
    const classRecord = await prisma.studentClass.findFirst({
      where: { id: req.params.classId, teacherId: req.user!.id },
    });
    if (!classRecord) return res.status(404).json({ error: 'القسم غير موجود ضمن أقسامك.' });
    const rows = await prisma.classPlannedSession.findMany({
      where: {
        classId: classRecord.id,
        teacherId: req.user!.id,
        academicYearId: parsed.data.academicYearId,
      },
      orderBy: [{ plannedDate: 'asc' }, { id: 'asc' }],
    });
    const references = await resolvePlanningReferences(
      classRecord.levelId,
      req.user!.id,
      parsed.data.academicYearId
    );
    res.json({
      success: true,
      class: {
        id: classRecord.id,
        name: classRecord.name,
        levelId: classRecord.levelId,
        institutionId: classRecord.institutionId,
      },
      sessions: rows.map((row) => ({
        ...classPlannedSessionView(row),
        reference: references.get(row.referenceSessionId) || null,
      })),
    });
  }
);

apiRouter.post(
  '/teacher/planning/annual-distribution/initialize',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = classPlanningInitializeSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: 'السنة الدراسية وتاريخ بداية التخطيط مطلوبان بصيغة صحيحة.' });

    const { academicYearId, planningStartDate } = parsed.data;
    const generation = generateAllPrimaryLevelDistributions(academicYearId, planningStartDate);
    const levelViews = generation.levels.map(({ sessions: _sessions, ...level }) => level);
    if (generation.levels.some((level) => level.status === 'failed')) {
      return res.status(400).json({
        error: 'تعذر إنشاء توزيع جميع المستويات ضمن السنة الدراسية المحددة.',
        academicYearId,
        planningStartDate,
        endDate: generation.endDate,
        levels: levelViews,
        classes: [],
        linkedClasses: 0,
        createdOrUpdatedSessions: 0,
      });
    }

    const classes = await prisma.studentClass.findMany({
      where: { teacherId: req.user!.id },
      orderBy: { name: 'asc' },
    });
    const distributionsByLevel = new Map(
      generation.levels.map((distribution) => [distribution.levelId, distribution] as const)
    );
    const existingRows = await prisma.classPlannedSession.findMany({
      where: { teacherId: req.user!.id, academicYearId },
    });
    const existingByClassReference = new Map(
      existingRows.map((row) => [`${row.classId}|${row.referenceSessionId}`, row] as const)
    );
    const classLinks = classes.map((classRecord) => {
      const normalizedLevelId = normalizePrimaryLevelId(classRecord.levelId);
      const distribution = normalizedLevelId
        ? distributionsByLevel.get(normalizedLevelId)
        : undefined;
      if (!distribution) {
        return {
          classId: classRecord.id,
          className: classRecord.name,
          levelId: classRecord.levelId,
          normalizedLevelId: null,
          sessionCount: 0,
          status: 'skipped' as const,
          error: 'مستوى القسم غير معروف؛ لم يتم إسناد منهج افتراضي له.',
        };
      }
      return {
        classId: classRecord.id,
        className: classRecord.name,
        levelId: classRecord.levelId,
        normalizedLevelId,
        sessionCount: distribution.sessions.length,
        status: 'linked' as const,
      };
    });
    const seedsByClass = new Map<
      string,
      ReturnType<typeof buildClassPlannedSessionSeedsFromCanonicalSessions>
    >();
    const conflicts = classLinks
      .filter((link) => link.status === 'linked')
      .flatMap((link) => {
        const distribution = distributionsByLevel.get(link.normalizedLevelId!);
        const seeds = buildClassPlannedSessionSeedsFromCanonicalSessions(
          req.user!.id,
          link.classId,
          academicYearId,
          distribution!.sessions
        );
        seedsByClass.set(link.classId, seeds);
        return seeds
          .filter((seed) => {
            const existing = existingByClassReference.get(
              `${seed.classId}|${seed.referenceSessionId}`
            );
            return (
              existing?.status === 'منجزة' &&
              existing.plannedDate.getTime() !== seed.plannedDate.getTime()
            );
          })
          .map(() => link.className);
      });
    if (conflicts.length) {
      return res.status(409).json({
        error: `لا يمكن إعادة جدولة حصص منجزة في: ${[...new Set(conflicts)].join('، ')}.`,
        levels: levelViews,
        classes: classLinks,
      });
    }

    const operations = [...seedsByClass.entries()].flatMap(([classId, seeds]) =>
      seeds.flatMap((seed) => {
        const existing = existingByClassReference.get(`${classId}|${seed.referenceSessionId}`);
        if (existing) {
          if (existing.status === 'منجزة') return [];
          return [
            prisma.classPlannedSession.update({
              where: { id: existing.id },
              data: { plannedDate: seed.plannedDate, durationMinutes: seed.durationMinutes },
            }),
          ];
        }
        return [prisma.classPlannedSession.create({ data: seed })];
      })
    );
    if (operations.length) await prisma.$transaction(operations);

    res.status(201).json({
      success: true,
      academicYearId,
      planningStartDate,
      endDate: generation.endDate,
      levels: levelViews,
      classes: classLinks,
      linkedClasses: classLinks.filter((link) => link.status === 'linked').length,
      createdOrUpdatedSessions: operations.length,
    });
  }
);

apiRouter.post(
  '/teacher/planning/classes/:classId/sessions/initialize',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = classPlanningInitializeSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: 'السنة الدراسية وتاريخ بداية التخطيط مطلوبان بصيغة صحيحة.' });
    const classRecord = await prisma.studentClass.findFirst({
      where: { id: req.params.classId, teacherId: req.user!.id },
    });
    if (!classRecord) return res.status(404).json({ error: 'القسم غير موجود ضمن أقسامك.' });
    let seeds;
    try {
      seeds = buildClassPlannedSessionSeeds(
        req.user!.id,
        classRecord.id,
        parsed.data.academicYearId,
        classRecord.levelId,
        parsed.data.planningStartDate
      );
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'تعذر إنشاء تسلسل المنهاج ضمن السنة الدراسية المحددة.',
      });
    }
    if (!seeds.length)
      return res.status(400).json({ error: 'تعذر إنشاء تسلسل المنهاج لهذا المستوى.' });
    const existingRows = await prisma.classPlannedSession.findMany({
      where: {
        classId: classRecord.id,
        teacherId: req.user!.id,
        academicYearId: parsed.data.academicYearId,
      },
    });
    const existingByReference = new Map(
      existingRows.map((row) => [row.referenceSessionId, row] as const)
    );
    const changedCompleted = seeds.some((seed) => {
      const existing = existingByReference.get(seed.referenceSessionId);
      return (
        existing?.status === 'منجزة' &&
        existing.plannedDate.getTime() !== seed.plannedDate.getTime()
      );
    });
    if (changedCompleted) {
      return res.status(409).json({
        error: 'لا يمكن إعادة جدولة حصص منجزة. غيّر تاريخ البداية بعد مراجعة الحصص المنجزة.',
      });
    }
    await prisma.$transaction(
      seeds.map((seed) => {
        const existing = existingByReference.get(seed.referenceSessionId);
        return existing
          ? prisma.classPlannedSession.update({
              where: { id: existing.id },
              data: { plannedDate: seed.plannedDate, durationMinutes: seed.durationMinutes },
            })
          : prisma.classPlannedSession.create({ data: seed });
      })
    );
    const rows = await prisma.classPlannedSession.findMany({
      where: {
        classId: classRecord.id,
        teacherId: req.user!.id,
        academicYearId: parsed.data.academicYearId,
      },
      orderBy: [{ plannedDate: 'asc' }, { id: 'asc' }],
    });
    const references = await resolvePlanningReferences(
      classRecord.levelId,
      req.user!.id,
      parsed.data.academicYearId
    );
    res.status(201).json({
      success: true,
      initialized: seeds.length,
      class: {
        id: classRecord.id,
        name: classRecord.name,
        levelId: classRecord.levelId,
        institutionId: classRecord.institutionId,
      },
      sessions: rows.map((row) => ({
        ...classPlannedSessionView(row),
        reference: references.get(row.referenceSessionId) || null,
      })),
    });
  }
);

apiRouter.patch(
  '/teacher/planning/classes/:classId/sessions/:sessionId',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = classPlanningUpdateSchema.safeParse(req.body);
    if (!parsed.success || !Object.keys(parsed.data).length)
      return res.status(400).json({ error: 'لا توجد تعديلات تشغيلية صالحة.' });
    const existing = await prisma.classPlannedSession.findFirst({
      where: { id: req.params.sessionId, classId: req.params.classId, teacherId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: 'الحصة التشغيلية غير موجودة ضمن أقسامك.' });
    if (parsed.data.plannedDate) {
      if (
        existing.status === 'منجزة' &&
        parsed.data.plannedDate !== existing.plannedDate.toISOString().slice(0, 10)
      ) {
        return res.status(409).json({ error: 'لا يمكن تغيير تاريخ حصة منجزة.' });
      }
      const date = new Date(`${parsed.data.plannedDate}T00:00:00`);
      if (!isValidAcademicSchoolDate(parsed.data.plannedDate, existing.academicYearId)) {
        return res.status(400).json({ error: 'اختر تاريخاً يقع في يوم دراسي وليس ضمن عطلة.' });
      }
    }
    const data: {
      plannedDate?: Date;
      startTime?: string | null;
      venue?: string | null;
      operationalNote?: string | null;
      status?: string;
    } = {};
    if (parsed.data.plannedDate !== undefined)
      data.plannedDate = new Date(`${parsed.data.plannedDate}T00:00:00.000Z`);
    if (parsed.data.startTime !== undefined) data.startTime = parsed.data.startTime;
    if (parsed.data.venue !== undefined) data.venue = parsed.data.venue;
    if (parsed.data.operationalNote !== undefined)
      data.operationalNote = parsed.data.operationalNote;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    const saved = await prisma.classPlannedSession.update({ where: { id: existing.id }, data });
    res.json({ success: true, session: classPlannedSessionView(saved) });
  }
);

const assessmentTypeSchema = z.enum([
  'تشخيصية',
  'تعلمية',
  'إدماجية',
  'تقويمية',
  'تقويم تشخيصي',
  'تقويم تحصيلي',
]);
const masteryLevelSchema = z.enum(['أ', 'ب', 'ج', 'د']);
const assessmentSessionCreateSchema = z.object({
  id: z.string().trim().min(1).max(160).optional(),
  classId: z.string().trim().min(1).max(160),
  academicYearId: z.string().regex(/^\d{4}-\d{4}$/),
  classPlannedSessionId: z.string().trim().min(1).max(160).nullable().optional(),
  assessmentType: assessmentTypeSchema,
  gradeLevelId: z.string().regex(/^lvl_p[1-5]$/),
  domainId: z.string().trim().min(1).max(160),
  finalCompetencyId: z.string().trim().max(200).nullable().optional(),
  title: z.string().trim().max(200).nullable().optional(),
  assessedAt: z.coerce.date(),
});
const assessmentQuerySchema = z.object({
  classId: z.string().trim().min(1),
  academicYearId: z.string().regex(/^\d{4}-\d{4}$/),
});
const studentAssessmentSchema = z.object({
  masteryLevel: masteryLevelSchema.nullable().optional(),
  numericMark: z.number().finite().min(0).max(10).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
  assessedAt: z.coerce.date().nullable().optional(),
});
const criterionResultSchema = z.object({
  masteryLevel: masteryLevelSchema.nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
});

type AssessmentSessionRow = {
  id: string;
  teacherId: string;
  classId: string;
  academicYearId: string;
  classPlannedSessionId: string | null;
  assessmentType: string;
  gradeLevelId: string;
  domainId: string;
  finalCompetencyId: string | null;
  title: string | null;
  assessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
type StudentAssessmentRow = {
  id: string;
  assessmentSessionId: string;
  studentId: string;
  masteryLevel: string | null;
  numericMark: number | null;
  note: string | null;
  assessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type CriterionResultRow = {
  id: string;
  studentAssessmentId: string;
  criterionId: string;
  masteryLevel: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function assessmentSessionView(row: AssessmentSessionRow) {
  return {
    id: row.id,
    teacherId: row.teacherId,
    classId: row.classId,
    academicYearId: row.academicYearId,
    classPlannedSessionId: row.classPlannedSessionId,
    assessmentType: row.assessmentType,
    gradeLevelId: row.gradeLevelId,
    domainId: row.domainId,
    finalCompetencyId: row.finalCompetencyId,
    title: row.title,
    assessedAt: row.assessedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
function criterionResultView(row: CriterionResultRow) {
  return {
    id: row.id,
    studentAssessmentId: row.studentAssessmentId,
    criterionId: row.criterionId,
    masteryLevel: row.masteryLevel,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
function studentAssessmentView(
  row: StudentAssessmentRow & { criterionResults?: CriterionResultRow[] }
) {
  return {
    id: row.id,
    assessmentSessionId: row.assessmentSessionId,
    studentId: row.studentId,
    masteryLevel: row.masteryLevel,
    numericMark: row.numericMark,
    note: row.note,
    assessedAt: row.assessedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    criterionResults: (row.criterionResults || []).map(criterionResultView),
  };
}
function criterionIdForSession(raw: string, session: AssessmentSessionRow): string | null {
  const value = raw.trim();
  if (/^C[1-4]$/.test(value))
    return `criterion:${session.gradeLevelId}:${session.domainId}:${session.finalCompetencyId || 'none'}:${value}`;
  const prefix = `criterion:${session.gradeLevelId}:${session.domainId}:${session.finalCompetencyId || 'none'}:`;
  return value.startsWith(prefix) && /^criterion:[^:]+:[^:]+:[^:]+:C[1-4]$/.test(value)
    ? value
    : null;
}
async function ownedAssessmentSession(sessionId: string, teacherId: string) {
  return prisma.assessmentSession.findFirst({ where: { id: sessionId, teacherId } });
}

apiRouter.get('/teacher/assessment-sessions', requireRole('teacher'), async (req, res) => {
  const parsed = assessmentQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'القسم والسنة الدراسية مطلوبان.' });
  const classRecord = await prisma.studentClass.findFirst({
    where: { id: parsed.data.classId, teacherId: req.user!.id },
  });
  if (!classRecord) return res.status(404).json({ error: 'القسم غير موجود ضمن أقسامك.' });
  const rows = await prisma.assessmentSession.findMany({
    where: {
      teacherId: req.user!.id,
      classId: classRecord.id,
      academicYearId: parsed.data.academicYearId,
    },
    orderBy: [{ assessedAt: 'desc' }, { id: 'asc' }],
  });
  res.json({ success: true, sessions: rows.map(assessmentSessionView) });
});

apiRouter.post('/teacher/assessment-sessions', requireRole('teacher'), async (req, res) => {
  const parsed = assessmentSessionCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'بيانات جلسة التقويم غير صحيحة.' });
  const input = parsed.data;
  const classRecord = await prisma.studentClass.findFirst({
    where: { id: input.classId, teacherId: req.user!.id },
  });
  if (!classRecord) return res.status(404).json({ error: 'القسم غير موجود ضمن أقسامك.' });
  if (classRecord.levelId !== input.gradeLevelId)
    return res.status(400).json({ error: 'المستوى الدراسي لا يطابق القسم.' });
  let planned = null;
  if (input.classPlannedSessionId) {
    planned = await prisma.classPlannedSession.findFirst({
      where: {
        id: input.classPlannedSessionId,
        classId: input.classId,
        teacherId: req.user!.id,
        academicYearId: input.academicYearId,
      },
    });
    if (!planned)
      return res.status(403).json({ error: 'الحصة التشغيلية غير موجودة ضمن قسمك وسنتك الدراسية.' });
  }
  const existing = input.id
    ? await prisma.assessmentSession.findFirst({ where: { id: input.id, teacherId: req.user!.id } })
    : input.classPlannedSessionId
      ? await prisma.assessmentSession.findUnique({
          where: { classPlannedSessionId: input.classPlannedSessionId },
        })
      : null;
  if (existing) {
    if (
      existing.teacherId !== req.user!.id ||
      existing.classId !== input.classId ||
      existing.academicYearId !== input.academicYearId
    )
      return res.status(403).json({ error: 'جلسة التقويم غير متاحة ضمن نطاقك.' });
    if (existing.classPlannedSessionId !== (input.classPlannedSessionId || null))
      return res.status(409).json({ error: 'لا يمكن نقل جلسة التقويم إلى حصة تشغيلية أخرى.' });
    return res.json({ success: true, reused: true, session: assessmentSessionView(existing) });
  }
  const created = await prisma.assessmentSession.create({
    data: {
      id: input.id || `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teacherId: req.user!.id,
      classId: input.classId,
      academicYearId: input.academicYearId,
      classPlannedSessionId: planned?.id || null,
      assessmentType: input.assessmentType,
      gradeLevelId: input.gradeLevelId,
      domainId: input.domainId,
      finalCompetencyId: input.finalCompetencyId || null,
      title: input.title || null,
      assessedAt: input.assessedAt,
    },
  });
  res.status(201).json({ success: true, reused: false, session: assessmentSessionView(created) });
});

apiRouter.get(
  '/teacher/assessment-sessions/:sessionId',
  requireRole('teacher'),
  async (req, res) => {
    const session = await prisma.assessmentSession.findFirst({
      where: { id: req.params.sessionId, teacherId: req.user!.id },
      include: {
        studentAssessments: { include: { criterionResults: true }, orderBy: { studentId: 'asc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'جلسة التقويم غير موجودة ضمن سجلاتك.' });
    res.json({
      success: true,
      session: assessmentSessionView(session),
      results: session.studentAssessments.map(studentAssessmentView),
    });
  }
);

apiRouter.get(
  '/teacher/assessment-sessions/:sessionId/results',
  requireRole('teacher'),
  async (req, res) => {
    const session = await ownedAssessmentSession(req.params.sessionId, req.user!.id);
    if (!session) return res.status(404).json({ error: 'جلسة التقويم غير موجودة ضمن سجلاتك.' });
    const results = await prisma.studentAssessment.findMany({
      where: { assessmentSessionId: session.id },
      include: { criterionResults: true },
      orderBy: { studentId: 'asc' },
    });
    res.json({ success: true, results: results.map(studentAssessmentView) });
  }
);

apiRouter.get(
  '/teacher/assessment-students/:studentId/history',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = assessmentQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'القسم والسنة الدراسية مطلوبان.' });
    const classRecord = await prisma.studentClass.findFirst({
      where: { id: parsed.data.classId, teacherId: req.user!.id },
    });
    if (!classRecord) return res.status(404).json({ error: 'القسم غير موجود ضمن أقسامك.' });
    const student = await prisma.student.findFirst({
      where: { id: req.params.studentId, teacherId: req.user!.id, classId: classRecord.id },
    });
    if (!student) return res.status(403).json({ error: 'التلميذ غير موجود ضمن القسم المحدد.' });
    const sessions = await prisma.assessmentSession.findMany({
      where: {
        teacherId: req.user!.id,
        classId: classRecord.id,
        academicYearId: parsed.data.academicYearId,
      },
      include: {
        studentAssessments: {
          where: { studentId: student.id },
          include: { criterionResults: true },
        },
      },
      orderBy: [{ assessedAt: 'desc' }, { id: 'asc' }],
    });
    res.json({
      success: true,
      history: sessions.map((session) => ({
        session: assessmentSessionView(session),
        result: session.studentAssessments[0]
          ? studentAssessmentView(session.studentAssessments[0])
          : null,
      })),
    });
  }
);
apiRouter.put(
  '/teacher/assessment-sessions/:sessionId/students/:studentId',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = studentAssessmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'بيانات نتيجة التلميذ غير صحيحة.' });
    const session = await ownedAssessmentSession(req.params.sessionId, req.user!.id);
    if (!session) return res.status(404).json({ error: 'جلسة التقويم غير موجودة ضمن سجلاتك.' });
    const student = await prisma.student.findFirst({
      where: { id: req.params.studentId, teacherId: req.user!.id, classId: session.classId },
    });
    if (!student) return res.status(403).json({ error: 'التلميذ غير موجود ضمن القسم المحدد.' });
    if (await findActiveMedicalExemption(student.id, session.assessedAt))
      return res
        .status(409)
        .json({ error: 'لا يمكن تعديل تقويم تلميذ لديه إعفاء طبي نشط بتاريخ جلسة التقويم.' });
    const existing = await prisma.studentAssessment.findUnique({
      where: {
        assessmentSessionId_studentId: { assessmentSessionId: session.id, studentId: student.id },
      },
    });
    const values = parsed.data;
    const update: {
      masteryLevel?: string | null;
      numericMark?: number | null;
      note?: string | null;
      assessedAt?: Date | null;
    } = {};
    if ('masteryLevel' in values) update.masteryLevel = values.masteryLevel ?? null;
    if ('numericMark' in values) update.numericMark = values.numericMark ?? null;
    if ('note' in values) update.note = values.note ?? null;
    if ('assessedAt' in values) update.assessedAt = values.assessedAt ?? null;
    const saved = await prisma.studentAssessment.upsert({
      where: {
        assessmentSessionId_studentId: { assessmentSessionId: session.id, studentId: student.id },
      },
      create: {
        id: `student_assessment_${session.id}_${student.id}`,
        assessmentSessionId: session.id,
        studentId: student.id,
        masteryLevel: values.masteryLevel ?? null,
        numericMark: values.numericMark ?? null,
        note: values.note ?? null,
        assessedAt: values.assessedAt ?? null,
      },
      update,
      include: { criterionResults: true },
    });
    res.json({ success: true, created: !existing, result: studentAssessmentView(saved) });
  }
);

apiRouter.put(
  '/teacher/assessment-sessions/:sessionId/students/:studentId/criteria/:criterionId',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = criterionResultSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'بيانات معيار التقويم غير صحيحة.' });
    const session = await ownedAssessmentSession(req.params.sessionId, req.user!.id);
    if (!session) return res.status(404).json({ error: 'جلسة التقويم غير موجودة ضمن سجلاتك.' });
    const student = await prisma.student.findFirst({
      where: { id: req.params.studentId, teacherId: req.user!.id, classId: session.classId },
    });
    if (!student) return res.status(403).json({ error: 'التلميذ غير موجود ضمن القسم المحدد.' });
    if (await findActiveMedicalExemption(student.id, session.assessedAt))
      return res
        .status(409)
        .json({ error: 'لا يمكن تعديل معيار تلميذ لديه إعفاء طبي نشط بتاريخ جلسة التقويم.' });
    const studentAssessment = await prisma.studentAssessment.findUnique({
      where: {
        assessmentSessionId_studentId: { assessmentSessionId: session.id, studentId: student.id },
      },
    });
    if (!studentAssessment)
      return res.status(404).json({ error: 'يجب إنشاء نتيجة التلميذ قبل حفظ المعيار.' });
    const criterionId = criterionIdForSession(req.params.criterionId, session);
    if (!criterionId) return res.status(400).json({ error: 'معرّف المعيار غير معتمد.' });
    const existing = await prisma.criterionResult.findUnique({
      where: {
        studentAssessmentId_criterionId: { studentAssessmentId: studentAssessment.id, criterionId },
      },
    });
    const values = parsed.data;
    const saved = await prisma.criterionResult.upsert({
      where: {
        studentAssessmentId_criterionId: { studentAssessmentId: studentAssessment.id, criterionId },
      },
      create: {
        id: `criterion_result_${studentAssessment.id}_${criterionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        studentAssessmentId: studentAssessment.id,
        criterionId,
        masteryLevel: values.masteryLevel ?? null,
        note: values.note ?? null,
      },
      update: {
        ...(Object.prototype.hasOwnProperty.call(values, 'masteryLevel')
          ? { masteryLevel: values.masteryLevel ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(values, 'note')
          ? { note: values.note ?? null }
          : {}),
      },
    });
    res.json({ success: true, created: !existing, result: criterionResultView(saved) });
  }
);
apiRouter.post('/students/import/preview', async (req, res) => {
  try {
    const filename = String(req.body?.filename || '').toLowerCase();
    const content = String(req.body?.contentBase64 || '');
    if (!/\.(xlsx|xls)$/.test(filename) || !content || content.length > 2_000_000)
      return res.status(400).json({ error: 'تعذر التعرف على بنية الملف.' });
    const previews = parseStudentRosterWorkbook(Buffer.from(content, 'base64'));
    if (
      !previews.length ||
      previews.every((preview) => !preview.students.length && !preview.invalidRows.length)
    )
      return res.status(400).json({ error: 'لم يتم العثور على أعمدة قائمة التلاميذ.' });
    res.json({ success: true, previews, summary: rosterPreviewSummary(previews) });
  } catch {
    res.status(400).json({ error: 'تعذر التعرف على بنية الملف.' });
  }
});

apiRouter.get('/students/roster', async (req, res) => {
  const [classes, students] = await Promise.all([
    prisma.studentClass.findMany({ where: { teacherId: req.user!.id }, orderBy: { name: 'asc' } }),
    prisma.student.findMany({
      where: { teacherId: req.user!.id },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ]);
  res.json({ success: true, ...buildStudentRosterReadModel(classes, students) });
});

apiRouter.delete('/students/classes/:classId', requireRole('teacher'), async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await prisma.$transaction(
      (tx) =>
        deleteOwnedStudentClass(
          tx,
          { classId: req.params.classId, ownerId: req.user!.id },
          { force }
        ),
      { maxWait: 10000, timeout: 25000 }
    );
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof StudentClassDeletionError) {
      const status =
        error.code === 'CLASS_NOT_FOUND' ? 404 : error.code === 'CLASS_NOT_OWNED' ? 403 : 409;
      return res.status(status).json({
        error: error.message,
        code: error.code,
        ...(error.blockers ? { blockers: error.blockers } : {}),
      });
    }
    if ((error as { code?: string })?.code === 'P2021') {
      return res.status(503).json({ error: 'قاعدة بيانات قوائم التلاميذ غير مهيأة بعد.' });
    }
    console.error('Student class deletion failed:', error);
    res
      .status(500)
      .json({ error: 'تعذر حذف القسم. يرجى إعادة المحاولة.', code: 'UNEXPECTED_ERROR' });
  }
});

apiRouter.delete('/students/:studentId', requireRole('teacher'), async (req, res) => {
  try {
    const result = await prisma.$transaction((tx) =>
      deleteOwnedStudent(tx, { studentId: req.params.studentId, ownerId: req.user!.id })
    );
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof StudentDeletionError) {
      const status =
        error.code === 'STUDENT_NOT_FOUND' ? 404 : error.code === 'STUDENT_NOT_OWNED' ? 403 : 409;
      return res.status(status).json({
        error: error.message,
        code: error.code,
        ...(error.blockers ? { blockers: error.blockers } : {}),
      });
    }
    if ((error as { code?: string })?.code === 'P2021')
      return res.status(503).json({ error: 'قاعدة بيانات قوائم التلاميذ غير مهيأة بعد.' });
    console.error('Student deletion failed:', error);
    return res.status(500).json({ error: 'تعذر حذف التلميذ.', code: 'UNEXPECTED_ERROR' });
  }
});

apiRouter.post('/students/import/confirm', async (req, res) => {
  if (req.user!.role !== 'teacher')
    return res.status(403).json({ error: 'استيراد القوائم متاح للأستاذ فقط.' });
  const rows = Array.isArray(req.body?.rows) ? (req.body.rows as ParsedRosterStudent[]) : [];
  const classId = String(req.body?.classId || '').trim();
  const className = String(req.body?.className || classId).trim();
  const levelId = String(req.body?.levelId || '').trim() || `lvl_p${Number(req.body?.grade) || 1}`;
  const grade = Number(req.body?.grade) || null;
  if (!classId || !rows.length)
    return res.status(400).json({ error: 'اختر قسماً وأرسل صفوفاً صالحة للاستيراد.' });
  const institutionId = (req.user as any).institutionId || null;
  const validRows = rows.filter((row) => row && row.firstName?.trim() && row.lastName?.trim());
  // Normalize and de-duplicate before opening the transaction.  This keeps all
  // parsing/validation work outside the database transaction and also prevents
  // duplicate matricules in one workbook from creating extra writes.
  const normalizedRows = new Map<string, ParsedRosterStudent>();
  let inputConflicts = 0;
  let invalidMatriculeRows = 0;
  for (const row of validRows) {
    const normalizedMatricule = normalizeExcelMatricule(row.matricule);
    if (normalizedMatricule.error) {
      invalidMatriculeRows += 1;
      continue;
    }
    const matricule = normalizedMatricule.value;
    const normalized = {
      ...row,
      matricule,
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
    };
    const previous = normalizedRows.get(matricule || `row-${row.rowNumber}`);
    if (previous) {
      if (previous.firstName !== normalized.firstName || previous.lastName !== normalized.lastName)
        inputConflicts += 1;
      continue;
    }
    normalizedRows.set(matricule || `row-${row.rowNumber}`, normalized);
  }
  if (!normalizedRows.size)
    return res.status(400).json({
      error: invalidMatriculeRows
        ? 'رقم التسجيل الرقمي فقد دقته. حوّل عمود رقم التسجيل إلى نص ثم أعد الاستيراد.'
        : 'اختر قسماً وأرسل صفوفاً صالحة للاستيراد.',
    });
  try {
    const summary = await prisma.$transaction(
      async (tx) => {
        let assignedClass = await tx.studentClass.findUnique({ where: { id: classId } });
        if (assignedClass && assignedClass.teacherId !== req.user!.id)
          throw new Error('UNAUTHORIZED_CLASS');
        if (!assignedClass) {
          const candidateClasses = await tx.studentClass.findMany({
            where: { teacherId: req.user!.id, institutionId, levelId },
            orderBy: { createdAt: 'asc' },
          });
          const classIdentity = canonicalClassIdentityKey(levelId, className);
          assignedClass =
            candidateClasses.find(
              (candidate) =>
                canonicalClassIdentityKey(candidate.levelId, candidate.name) === classIdentity
            ) || null;
        }
        const persistedClassId = assignedClass?.id || classId;
        if (!assignedClass)
          await tx.studentClass.create({
            data: {
              id: persistedClassId,
              teacherId: req.user!.id,
              institutionId,
              levelId,
              name: className,
            },
          });
        else if (
          assignedClass.name !== className &&
          new RegExp(
            `^${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:مادة|المادة|الفصل|السنة\\s+الدراسية)\\s*[:：-]?`,
            'i'
          ).test(assignedClass.name)
        ) {
          // Compatibility for classes created by the old parser: only normalize
          // when the malformed value is deterministically the same class.
          await tx.studentClass.update({
            where: { id: persistedClassId },
            data: { name: className },
          });
        }
        const importRows = [...normalizedRows.values()].map((row) => ({
          ...row,
          matricule: row.matricule || `import-${persistedClassId}-${row.rowNumber}`,
        }));
        const persisted = await persistStudentRosterRows(tx, {
          rows: importRows.map((row) => ({ ...row, grade: grade || row.grade })),
          teacherId: req.user!.id,
          institutionId,
          persistedClassId,
        });
        return {
          ...persisted,
          conflicts: persisted.conflicts + inputConflicts,
          review: rows.length - validRows.length + invalidMatriculeRows,
          reviewReasonCounts: {
            ...persisted.reviewReasonCounts,
            ambiguousMatch: persisted.reviewReasonCounts.ambiguousMatch + inputConflicts,
            invalidIdentity:
              persisted.reviewReasonCounts.invalidIdentity +
              (rows.length - validRows.length) +
              invalidMatriculeRows,
          },
          classId: persistedClassId,
        };
      },
      { maxWait: 10000, timeout: 25000 }
    );
    res.json({ success: true, classId: summary.classId, summary });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_CLASS')
      return res.status(403).json({ error: 'لا تملك صلاحية الاستيراد إلى هذا القسم.' });
    if ((error as { code?: string })?.code === 'P2021') {
      console.error('Student roster schema is missing (P2021):', error);
      return res
        .status(503)
        .json({ error: 'قاعدة بيانات قوائم التلاميذ غير مهيأة بعد. يرجى تحديث المنصة.' });
    }
    if ((error as { code?: string })?.code === 'P2028') {
      console.error('Student roster import transaction timed out (P2028):', error);
      return res
        .status(504)
        .json({ error: 'استغرقت عملية حفظ القائمة وقتاً أطول من المتوقع. يرجى إعادة المحاولة.' });
    }
    console.error('Student roster import persistence failed:', error);
    res.status(500).json({ error: 'تعذر حفظ قائمة التلاميذ.' });
  }
});

async function requireGenerationAccess(req: any, res: any, feature: GenerationFeature) {
  const result = await resolveGenerationCredential(req.user!.id, feature);
  if (result.error || !result.credential) {
    res.status(403).json({
      code: result.error?.code || 'SERVICE_UNAVAILABLE',
      message: result.error?.message || 'الخدمة غير متاحة حالياً.',
      error: result.error?.message || 'الخدمة غير متاحة حالياً.',
    });
    return null;
  }
  return result.credential;
}

const gamePayload = (body: Record<string, unknown>) => ({
  title: String(body.title || '').trim(),
  grade: Number(body.grade),
  fieldId: String(body.fieldId || ''),
  fieldName: String(body.fieldName || ''),
  objectiveId: typeof body.objectiveId === 'string' ? body.objectiveId : null,
  objectiveText: String(body.objectiveText || '').trim(),
  pedagogicalPurpose: String(body.pedagogicalPurpose || body.description || '').trim(),
  organization: String(body.organization || '').trim(),
  description: String(body.description || '').trim(),
  rules: String(body.rules || '').trim(),
  equipment: Array.isArray(body.equipment)
    ? body.equipment
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter(Boolean)
    : [],
  executionGuidance: typeof body.executionGuidance === 'string' ? body.executionGuidance : null,
  safetyGuidance: typeof body.safetyGuidance === 'string' ? body.safetyGuidance : null,
  progression: typeof body.progression === 'string' ? body.progression : null,
});

const publicGameSelect = {
  id: true,
  ownerId: true,
  title: true,
  grade: true,
  fieldId: true,
  fieldName: true,
  objectiveId: true,
  objectiveText: true,
  pedagogicalPurpose: true,
  organization: true,
  description: true,
  rules: true,
  equipment: true,
  executionGuidance: true,
  safetyGuidance: true,
  progression: true,
  origin: true,
  status: true,
  approved: true,
  submittedAt: true,
  approvedAt: true,
  approvedById: true,
  rejectedAt: true,
  rejectedById: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

apiRouter.get('/pedagogical-games/public', async (_req, res) => {
  const games = await prisma.pedagogicalGame.findMany({
    where: { status: 'APPROVED', approved: true },
    orderBy: { createdAt: 'desc' },
    select: publicGameSelect,
  });
  res.json({ success: true, games });
});

apiRouter.get('/pedagogical-games/mine', async (req, res) => {
  const games = await prisma.pedagogicalGame.findMany({
    where: { ownerId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    select: publicGameSelect,
  });
  res.json({ success: true, games });
});

apiRouter.get('/pedagogical-games/pending', async (req, res) => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'inspector')
    return res.status(403).json({ error: 'لا تملك صلاحية مراجعة الألعاب.' });
  const games = await prisma.pedagogicalGame.findMany({
    where: { status: 'PENDING_APPROVAL' },
    orderBy: { submittedAt: 'asc' },
    select: publicGameSelect,
  });
  res.json({ success: true, games });
});

apiRouter.post('/pedagogical-games', async (req, res) => {
  if (req.user!.role !== 'teacher')
    return res.status(403).json({ error: 'إنشاء الألعاب الخاصة متاح للأستاذ فقط.' });
  const payload = gamePayload(req.body || {});
  if (
    !payload.title ||
    !payload.objectiveText ||
    !payload.description ||
    !payload.rules ||
    ![1, 2, 3, 4, 5].includes(payload.grade)
  )
    return res.status(400).json({ error: 'بيانات اللعبة غير مكتملة.' });
  const requestedId =
    typeof req.body.id === 'string' && /^k_[A-Za-z0-9_-]+$/.test(req.body.id)
      ? req.body.id
      : `pg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const game = await prisma.pedagogicalGame.create({
    data: {
      id: requestedId,
      ownerId: req.user!.id,
      ...payload,
      origin: typeof req.body.origin === 'string' ? req.body.origin : 'TEACHER',
      status: 'DRAFT',
      approved: false,
    },
    select: publicGameSelect,
  });
  res.status(201).json({ success: true, game });
});

apiRouter.put('/pedagogical-games/:id', async (req, res) => {
  const existing = await prisma.pedagogicalGame.findUnique({ where: { id: req.params.id } });
  if (
    !existing ||
    existing.ownerId !== req.user!.id ||
    (existing.status !== 'DRAFT' && existing.status !== 'REJECTED')
  )
    return res.status(403).json({ error: 'لا تملك صلاحية تعديل هذه اللعبة.' });
  const payload = gamePayload(req.body || {});
  if (!payload.title || !payload.description || !payload.rules)
    return res.status(400).json({ error: 'بيانات اللعبة غير مكتملة.' });
  const game = await prisma.pedagogicalGame.update({
    where: { id: existing.id },
    data: payload,
    select: publicGameSelect,
  });
  res.json({ success: true, game });
});

apiRouter.delete('/pedagogical-games/:id', async (req, res) => {
  const existing = await prisma.pedagogicalGame.findUnique({ where: { id: req.params.id } });
  if (
    !existing ||
    existing.ownerId !== req.user!.id ||
    (existing.status !== 'DRAFT' && existing.status !== 'REJECTED')
  )
    return res.status(403).json({ error: 'لا تملك صلاحية حذف هذه اللعبة.' });
  await prisma.pedagogicalGame.delete({ where: { id: existing.id } });
  res.json({ success: true });
});

apiRouter.post('/pedagogical-games/:id/submit', async (req, res) => {
  const existing = await prisma.pedagogicalGame.findUnique({ where: { id: req.params.id } });
  if (
    !existing ||
    existing.ownerId !== req.user!.id ||
    (existing.status !== 'DRAFT' && existing.status !== 'REJECTED')
  )
    return res.status(403).json({ error: 'لا يمكن إرسال هذه اللعبة للاعتماد.' });
  const game = await prisma.$transaction((tx) =>
    tx.pedagogicalGame.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING_APPROVAL',
        approved: false,
        submittedAt: new Date(),
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
      select: publicGameSelect,
    })
  );
  res.json({ success: true, game });
});

apiRouter.post('/pedagogical-games/:id/approve', async (req, res) => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'inspector')
    return res.status(403).json({ error: 'لا تملك صلاحية اعتماد الألعاب.' });
  const result = await prisma.$transaction((tx) =>
    tx.pedagogicalGame.updateMany({
      where: { id: req.params.id, status: 'PENDING_APPROVAL' },
      data: {
        status: 'APPROVED',
        approved: true,
        approvedAt: new Date(),
        approvedById: req.user!.id,
      },
    })
  );
  if (!result.count) return res.status(409).json({ error: 'اللعبة ليست بانتظار الاعتماد.' });
  res.json({ success: true });
});

apiRouter.post('/pedagogical-games/:id/reject', async (req, res) => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'inspector')
    return res.status(403).json({ error: 'لا تملك صلاحية رفض الألعاب.' });
  const reason = String(req.body?.rejectionReason || '').trim();
  if (!reason) return res.status(400).json({ error: 'سبب الرفض مطلوب.' });
  const result = await prisma.$transaction((tx) =>
    tx.pedagogicalGame.updateMany({
      where: { id: req.params.id, status: 'PENDING_APPROVAL' },
      data: {
        status: 'REJECTED',
        approved: false,
        rejectedAt: new Date(),
        rejectedById: req.user!.id,
        rejectionReason: reason,
      },
    })
  );
  if (!result.count) return res.status(409).json({ error: 'اللعبة ليست بانتظار الاعتماد.' });
  res.json({ success: true });
});

// -----------------------------------------------------------------------
// التواصل المهني الموثوق: مسارات صريحة للمحادثات والرسائل والإشعارات.
// هذه المسارات لا تعيد مجموعة الرسائل كاملة للواجهة، وتفرض الخصوصية من الخادم.
// -----------------------------------------------------------------------
const communicationUserSelect = {
  id: true,
  username: true,
  spexId: true,
  firstName: true,
  lastName: true,
  role: true,
  avatar: true,
  districtId: true,
  directorateId: true,
  status: true,
} as const;

async function canContactUser(requesterId: string, requesterRole: string, targetId: string) {
  const [requester, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: communicationUserSelect }),
    prisma.user.findUnique({ where: { id: targetId }, select: communicationUserSelect }),
  ]);
  if (!requester || !target || target.status !== 'active' || requester.id === target.id)
    return false;
  if (requesterRole === 'admin' || target.role === 'admin') return true;
  if (requester.directorateId === target.directorateId) {
    if (requester.role === 'director' || target.role === 'director') return true;
    if (requester.districtId === target.districtId) return true;
  }
  const assignment = await prisma.inspectorAssignment.findFirst({
    where: {
      status: { in: ['Active', 'Changed'] },
      OR: [
        { teacherId: requester.id, inspectorId: target.id },
        { teacherId: target.id, inspectorId: requester.id },
      ],
    },
  });
  return Boolean(assignment);
}

function directMessageView(row: {
  id: string;
  senderId: string | null;
  recipientId: string | null;
  content: string | null;
  data: unknown;
  createdAt: Date;
  readAt: Date | null;
}) {
  const data = (row.data && typeof row.data === 'object' ? row.data : {}) as Record<
    string,
    unknown
  >;
  return {
    id: row.id,
    senderId: row.senderId || String(data.senderId || ''),
    recipientId: row.recipientId || String(data.receiverId || data.recipientId || ''),
    text: row.content || String(data.message || data.text || ''),
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() || null,
  };
}

apiRouter.get('/communication/contacts', async (req, res) => {
  const user = req.user!;
  const candidates = await prisma.user.findMany({
    where: { status: 'active', id: { not: user.id } },
    select: communicationUserSelect,
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  });
  const allowed = [];
  for (const candidate of candidates) {
    if (await canContactUser(user.id, user.role, candidate.id)) allowed.push(candidate);
  }
  res.json({ contacts: allowed });
});

apiRouter.get('/communication/direct-conversations', async (req, res) => {
  const user = req.user!;
  const rows = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const grouped = new Map<
    string,
    { lastMessage: ReturnType<typeof directMessageView>; unreadCount: number }
  >();
  for (const row of rows) {
    const view = directMessageView(row);
    const partnerId = view.senderId === user.id ? view.recipientId : view.senderId;
    if (!partnerId || grouped.has(partnerId)) continue;
    grouped.set(partnerId, {
      lastMessage: view,
      unreadCount: rows.filter(
        (item) => item.recipientId === user.id && item.senderId === partnerId && !item.readAt
      ).length,
    });
  }
  const contacts = await prisma.user.findMany({
    where: { id: { in: [...grouped.keys()] }, status: 'active' },
    select: communicationUserSelect,
  });
  res.json({
    conversations: contacts.map((contact) => ({ user: contact, ...grouped.get(contact.id)! })),
  });
});

apiRouter.get('/communication/direct-messages/:userId', async (req, res) => {
  const user = req.user!;
  const targetId = req.params.userId;
  if (!(await canContactUser(user.id, user.role, targetId))) {
    return res.status(403).json({ error: 'لا تملك صلاحية فتح هذه المحادثة.' });
  }
  const rows = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: targetId },
        { senderId: targetId, recipientId: user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });
  res.json({ messages: rows.map(directMessageView) });
});

apiRouter.post('/communication/direct-messages', async (req, res) => {
  const user = req.user!;
  const recipientId = typeof req.body?.recipientId === 'string' ? req.body.recipientId : '';
  const text = normalizeMessageText(req.body?.text);
  if (!recipientId || recipientId === user.id)
    return res.status(400).json({ error: 'جهة الاتصال غير صالحة.' });
  if (!text) return res.status(400).json({ error: 'الرسالة مطلوبة وبحد أقصى 4000 حرف.' });
  if (!(await canContactUser(user.id, user.role, recipientId))) {
    return res.status(403).json({ error: 'لا تملك صلاحية مراسلة هذا المستخدم.' });
  }
  const id = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.directMessage.create({
      data: { id, senderId: user.id, recipientId, content: text, data: { text } },
    });
    await tx.communityNotification.create({
      data: {
        id: `notif_${id}`,
        userId: recipientId,
        senderId: user.id,
        type: 'new_message',
        title: 'رسالة جديدة',
        message: text.slice(0, 120),
        read: false,
        data: { type: 'new_message', message: text.slice(0, 120), senderId: user.id },
      },
    });
    return message;
  });
  res.status(201).json({ message: directMessageView(created) });
});

apiRouter.post('/communication/direct-messages/:id/read', async (req, res) => {
  const result = await prisma.directMessage.updateMany({
    where: { id: req.params.id, recipientId: req.user!.id },
    data: { readAt: new Date() },
  });
  if (!result.count) return res.status(404).json({ error: 'الرسالة غير موجودة.' });
  res.json({ success: true });
});

apiRouter.get('/communication/district-messages', async (req, res) => {
  const rows = await prisma.districtMessage.findMany({
    orderBy: { createdAt: 'asc' },
    take: 500,
  });
  const visible = rows.filter((row) =>
    canReadDistrictMessage(
      { districtId: row.districtId, legacyDistrictId: String((row.data as any)?.districtId || '') },
      req.user!.districtId,
      req.user!.role === 'admin'
    )
  );
  res.json({
    messages: visible.map((row) => ({
      id: row.id,
      authorId: row.authorId,
      districtId: row.districtId || String((row.data as any)?.districtId || ''),
      text: row.content || String((row.data as any)?.message || (row.data as any)?.text || ''),
      createdAt: row.createdAt.toISOString(),
      data: row.data,
    })),
  });
});

apiRouter.post('/communication/district-messages', async (req, res) => {
  const text = normalizeMessageText(req.body?.text);
  if (!text) return res.status(400).json({ error: 'الرسالة مطلوبة وبحد أقصى 4000 حرف.' });
  const created = await prisma.districtMessage.create({
    data: {
      id: `district_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      authorId: req.user!.id,
      districtId: req.user!.districtId,
      content: text,
      data: { text },
    },
  });
  res.status(201).json({
    message: {
      id: created.id,
      authorId: created.authorId,
      districtId: created.districtId,
      text,
      createdAt: created.createdAt.toISOString(),
    },
  });
});

apiRouter.get('/communication/notifications', async (req, res) => {
  const rows = await prisma.communityNotification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({
    notifications: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      senderId: row.senderId,
      type: row.type || String((row.data as any)?.type || 'info'),
      title: row.title || 'إشعار',
      message: row.message || String((row.data as any)?.message || ''),
      read: row.read,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

apiRouter.post('/communication/notifications/:id/read', async (req, res) => {
  const result = await prisma.communityNotification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true, readAt: new Date() },
  });
  if (!result.count) return res.status(404).json({ error: 'الإشعار غير موجود.' });
  res.json({ success: true });
});

const educationalSituationInput = z.object({
  name: z.string().trim().min(1),
  grade: z.number().int().min(1).max(5),
  fieldId: z.string().min(1),
  fieldName: z.string().min(1),
  objectiveIds: z.array(z.string()).min(1),
  objectiveTexts: z.array(z.string()).min(1),
  sourceGoal: z.string().optional().default(''),
  organization: z.string().trim().min(1),
  equipment: z.array(z.string()).default([]),
  variations: z.string().optional(),
});
const canReviewSituation = (role: string) => role === 'admin' || role === 'inspector';

apiRouter.get('/educational-situations', async (req, res) => {
  const user = req.user!;
  const grade = req.query.grade ? Number(req.query.grade) : undefined;
  const fieldId = typeof req.query.fieldId === 'string' ? req.query.fieldId : undefined;
  const objective = typeof req.query.objective === 'string' ? req.query.objective : undefined;
  const search = typeof req.query.q === 'string' ? req.query.q : undefined;
  const rows = await prisma.educationalSituation.findMany({
    where: {
      ...(grade ? { grade } : {}),
      ...(fieldId ? { fieldId } : {}),
      ...(objective ? { objectiveTexts: { has: objective } } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: { name: 'asc' },
  });
  res.json({
    situations: rows.filter(
      (row) => row.status === 'APPROVED' || row.ownerId === user.id || canReviewSituation(user.role)
    ),
  });
});
apiRouter.post('/educational-situations', async (req, res) => {
  const input = educationalSituationInput.parse(req.body);
  const user = req.user!;
  if (user.role !== 'teacher')
    return res.status(403).json({ error: 'إنشاء الموقف الخاص متاح للأستاذ فقط.' });
  const row = await prisma.educationalSituation.create({
    data: {
      id: `sit_${Date.now()}`,
      ...(input as any),
      origin: 'TEACHER',
      status: 'PRIVATE',
      ownerId: user.id,
    },
  });
  res.status(201).json({ situation: row });
});
apiRouter.put('/educational-situations/:id', async (req, res) => {
  const existing = await prisma.educationalSituation.findUnique({ where: { id: req.params.id } });
  if (
    !existing ||
    existing.origin === 'REFERENCE_SEED' ||
    existing.ownerId !== req.user!.id ||
    !['PRIVATE', 'REJECTED'].includes(existing.status)
  )
    return res.status(403).json({ error: 'لا تملك صلاحية تعديل هذا الموقف.' });
  const input = educationalSituationInput.parse(req.body);
  res.json({
    situation: await prisma.educationalSituation.update({
      where: { id: existing.id },
      data: { ...input, status: 'PRIVATE', rejectionReason: null },
    }),
  });
});
apiRouter.delete('/educational-situations/:id', async (req, res) => {
  const existing = await prisma.educationalSituation.findUnique({ where: { id: req.params.id } });
  if (
    !existing ||
    existing.origin === 'REFERENCE_SEED' ||
    existing.ownerId !== req.user!.id ||
    !['PRIVATE', 'REJECTED'].includes(existing.status)
  )
    return res.status(403).json({ error: 'لا تملك صلاحية حذف هذا الموقف.' });
  await prisma.educationalSituation.delete({ where: { id: existing.id } });
  res.json({ success: true });
});
apiRouter.post('/educational-situations/:id/submit', async (req, res) => {
  const existing = await prisma.educationalSituation.findUnique({ where: { id: req.params.id } });
  if (
    !existing ||
    existing.ownerId !== req.user!.id ||
    !['PRIVATE', 'REJECTED'].includes(existing.status)
  )
    return res.status(403).json({ error: 'لا تملك صلاحية الإرسال.' });
  res.json({
    situation: await prisma.educationalSituation.update({
      where: { id: existing.id },
      data: { status: 'PENDING_APPROVAL', rejectionReason: null },
    }),
  });
});
apiRouter.post('/educational-situations/:id/review', async (req, res) => {
  if (!canReviewSituation(req.user!.role))
    return res.status(403).json({ error: 'الاعتماد والرفض من صلاحيات الإدارة أو المفتش فقط.' });
  const action = req.body.action;
  const existing = await prisma.educationalSituation.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.status !== 'PENDING_APPROVAL')
    return res.status(400).json({ error: 'الموقف ليس بانتظار الاعتماد.' });
  if (action === 'reject' && !String(req.body.rejectionReason || '').trim())
    return res.status(400).json({ error: 'سبب الرفض إلزامي.' });
  const approved = action === 'approve';
  res.json({
    situation: await prisma.educationalSituation.update({
      where: { id: existing.id },
      data: approved
        ? {
            status: 'APPROVED',
            approvedById: req.user!.id,
            approvedByRole: req.user!.role,
            approvedAt: new Date(),
          }
        : {
            status: 'REJECTED',
            rejectedById: req.user!.id,
            rejectedByRole: req.user!.role,
            rejectedAt: new Date(),
            rejectionReason: String(req.body.rejectionReason),
          },
    }),
  });
});

// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
// Unified Admin resource moderation read model. Domain tables remain authoritative.
const moderationStatuses = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
type ModerationResourceType = 'game' | 'situation';

apiRouter.get('/admin/resource-approvals', requireRole('admin'), async (_req, res) => {
  try {
    const [games, situations] = await Promise.all([
      prisma.pedagogicalGame.findMany({
        where: { status: { in: [...moderationStatuses] } },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          title: true,
          grade: true,
          fieldId: true,
          fieldName: true,
          objectiveId: true,
          objectiveText: true,
          pedagogicalPurpose: true,
          organization: true,
          description: true,
          rules: true,
          equipment: true,
          executionGuidance: true,
          safetyGuidance: true,
          progression: true,
          status: true,
          origin: true,
          ownerId: true,
          submittedAt: true,
          approvedAt: true,
          approvedById: true,
          rejectedAt: true,
          rejectedById: true,
          rejectionReason: true,
          createdAt: true,
        },
      }),
      prisma.educationalSituation.findMany({
        where: {
          origin: { not: 'REFERENCE_SEED' },
          ownerId: { not: null },
          status: { in: [...moderationStatuses] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          grade: true,
          fieldId: true,
          fieldName: true,
          objectiveIds: true,
          objectiveTexts: true,
          sourceGoal: true,
          organization: true,
          equipment: true,
          variations: true,
          origin: true,
          ownerId: true,
          status: true,
          approvedById: true,
          approvedByRole: true,
          approvedAt: true,
          rejectedById: true,
          rejectedByRole: true,
          rejectedAt: true,
          rejectionReason: true,
          createdAt: true,
        },
      }),
    ]);
    const ownerIds = [
      ...new Set([
        ...games.map((row) => row.ownerId),
        ...situations.map((row) => row.ownerId).filter((id): id is string => Boolean(id)),
      ]),
    ];
    const reviewerIds = [
      ...new Set(
        [
          ...games.flatMap((row) => [row.approvedById, row.rejectedById]),
          ...situations.flatMap((row) => [row.approvedById, row.rejectedById]),
        ].filter((id): id is string => Boolean(id))
      ),
    ];
    const people = await prisma.user.findMany({
      where: { id: { in: [...new Set([...ownerIds, ...reviewerIds])] } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const person = (id: string | null | undefined) => {
      const value = id ? peopleById.get(id) : undefined;
      return value
        ? {
            id: value.id,
            name: `${value.firstName} ${value.lastName}`.trim(),
            email: value.email,
            role: value.role,
          }
        : null;
    };
    const items = [
      ...games.map((row) => ({
        id: row.id,
        resourceType: 'game' as const,
        title: row.title,
        summary: row.description,
        status: row.status,
        source: 'USER_SUBMITTED_RESOURCE' as const,
        submitter: person(row.ownerId),
        submittedAt: row.submittedAt || row.createdAt,
        reviewer: person(row.status === 'APPROVED' ? row.approvedById : row.rejectedById),
        reviewedAt: row.status === 'APPROVED' ? row.approvedAt : row.rejectedAt,
        rejectionReason: row.rejectionReason,
        grade: row.grade,
        fieldId: row.fieldId,
        fieldName: row.fieldName,
        objectiveId: row.objectiveId,
        objectiveText: row.objectiveText,
        details: {
          pedagogicalPurpose: row.pedagogicalPurpose,
          organization: row.organization,
          description: row.description,
          rules: row.rules,
          equipment: row.equipment,
          executionGuidance: row.executionGuidance,
          safetyGuidance: row.safetyGuidance,
          progression: row.progression,
        },
      })),
      ...situations.map((row) => ({
        id: row.id,
        resourceType: 'situation' as const,
        title: row.name,
        summary: row.sourceGoal || row.organization,
        status: row.status,
        source: 'USER_SUBMITTED_RESOURCE' as const,
        submitter: person(row.ownerId),
        submittedAt: row.createdAt,
        reviewer: person(row.status === 'APPROVED' ? row.approvedById : row.rejectedById),
        reviewedAt: row.status === 'APPROVED' ? row.approvedAt : row.rejectedAt,
        rejectionReason: row.rejectionReason,
        grade: row.grade,
        fieldId: row.fieldId,
        fieldName: row.fieldName,
        objectiveId: row.objectiveIds[0] || null,
        objectiveText: row.objectiveTexts[0] || null,
        details: {
          sourceGoal: row.sourceGoal,
          organization: row.organization,
          equipment: row.equipment,
          variations: row.variations,
          objectiveIds: row.objectiveIds,
          objectiveTexts: row.objectiveTexts,
        },
      })),
    ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    res.json({
      success: true,
      items,
      counts: {
        pending: items.filter((item) => item.status === 'PENDING_APPROVAL').length,
        approved: items.filter((item) => item.status === 'APPROVED').length,
        rejected: items.filter((item) => item.status === 'REJECTED').length,
        total: items.length,
      },
    });
  } catch {
    res.status(500).json({ error: 'تعذر تحميل مركز اعتمادات الموارد.' });
  }
});

apiRouter.post(
  '/admin/resource-approvals/:resourceType/:id/review',
  requireRole('admin'),
  async (req, res) => {
    const resourceType = req.params.resourceType as ModerationResourceType;
    const action = req.body?.action;
    if (!['game', 'situation'].includes(resourceType) || !['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'إجراء مراجعة غير صالح.' });
    const rejectionReason =
      typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason.trim() : '';
    if (action === 'reject' && !rejectionReason)
      return res.status(400).json({ error: 'سبب الرفض إلزامي.' });
    const now = new Date();
    if (resourceType === 'game') {
      const result = await prisma.pedagogicalGame.updateMany({
        where: { id: req.params.id, status: 'PENDING_APPROVAL' },
        data:
          action === 'approve'
            ? { status: 'APPROVED', approved: true, approvedAt: now, approvedById: req.user!.id }
            : {
                status: 'REJECTED',
                approved: false,
                rejectedAt: now,
                rejectedById: req.user!.id,
                rejectionReason,
              },
      });
      if (!result.count)
        return res
          .status(409)
          .json({ error: 'المورد ليس بانتظار المراجعة أو تمت معالجته مسبقاً.' });
    } else {
      const result = await prisma.educationalSituation.updateMany({
        where: {
          id: req.params.id,
          origin: { not: 'REFERENCE_SEED' },
          ownerId: { not: null },
          status: 'PENDING_APPROVAL',
        },
        data:
          action === 'approve'
            ? {
                status: 'APPROVED',
                approvedById: req.user!.id,
                approvedByRole: 'admin',
                approvedAt: now,
              }
            : {
                status: 'REJECTED',
                rejectedById: req.user!.id,
                rejectedByRole: 'admin',
                rejectedAt: now,
                rejectionReason,
              },
      });
      if (!result.count)
        return res
          .status(409)
          .json({ error: 'المورد ليس بانتظار المراجعة أو تمت معالجته مسبقاً.' });
    }
    res.json({ success: true });
  }
);
// 1. Users Collection — القراءة لأي مستخدم مسجّل دخول (بدون كلمات المرور)،
//    الإنشاء/التعديل مقتصر على admin و inspector، الحذف على admin فقط
// -----------------------------------------------------------------------
apiRouter.get('/db/users', async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({
    success: true,
    users: users.map((u) => (u.id === req.user!.id ? sanitizeOwnUser(u) : sanitizeUser(u))),
  });
});

// Persistent approval queue: PostgreSQL is the sole source of truth.
// Authoritative read-only Admin operational reporting; secrets and message content are excluded.
apiRouter.get('/admin/reports/overview', requireRole('admin'), async (req, res) => {
  try {
    const range = String(req.query.range || 'all');
    const days = range === '7' ? 7 : range === '30' ? 30 : range === 'year' ? 365 : 0;
    const since = days ? new Date(Date.now() - days * 86400000) : undefined;
    const [
      users,
      assignments,
      districts,
      access,
      config,
      games,
      situations,
      visits,
      notes,
      directMessages,
      districtMessages,
      classes,
      students,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ['teacher', 'inspector', 'director', 'admin'] } },
        select: {
          id: true,
          role: true,
          status: true,
          isApprovedByAdmin: true,
          phone: true,
          institutionId: true,
          districtId: true,
          eduDistrictId: true,
          createdAt: true,
        },
      }),
      prisma.inspectorAssignment.findMany({
        select: { id: true, status: true, inspectorId: true, teacherId: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
      prisma.inspectionDistrict.findMany({
        select: { id: true, name: true, directorate: { select: { id: true, name: true } } },
        orderBy: [{ directorateId: 'asc' }, { name: 'asc' }],
      }),
      prisma.userGenerationAccess.findMany({
        select: {
          userId: true,
          enabled: true,
          assistantEnabled: true,
          gameSuggestionsEnabled: true,
          credentialEnabled: true,
          encryptedApiKey: true,
        },
      }),
      prisma.generationServiceConfig.findUnique({
        where: { id: 'default' },
        select: { enabled: true },
      }),
      prisma.pedagogicalGame.groupBy({
        by: ['status'],
        where: { origin: { not: 'REFERENCE_SEED' } },
        _count: { _all: true },
      }),
      prisma.educationalSituation.groupBy({
        by: ['status'],
        where: { origin: { not: 'REFERENCE_SEED' }, ownerId: { not: null } },
        _count: { _all: true },
      }),
      prisma.inspectionVisitRecord.count({
        where: since ? { createdAt: { gte: since } } : undefined,
      }),
      prisma.inspectorNote.count({ where: since ? { createdAt: { gte: since } } : undefined }),
      prisma.directMessage.count({ where: since ? { createdAt: { gte: since } } : undefined }),
      prisma.districtMessage.count({ where: since ? { createdAt: { gte: since } } : undefined }),
      prisma.studentClass.count(),
      prisma.student.count(),
    ]);
    const pendingAccount = (u: any) =>
      ['teacher', 'inspector'].includes(u.role) &&
      (u.status === 'pending_approval' || !u.isApprovedByAdmin);
    const activeTeacher = (u: any) =>
      u.role === 'teacher' && u.status === 'active' && u.isApprovedByAdmin;
    const accepted = assignments.filter((a) => ['Active', 'Changed'].includes(a.status));
    const pending = assignments.filter((a) => a.status === 'Pending');
    const activeInspectors = users.filter((u) => u.role === 'inspector' && u.status === 'active');
    const covered = new Set(
      activeInspectors.map((u) => u.eduDistrictId || u.districtId).filter(Boolean)
    );
    const counts = (rows: any[]) =>
      Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
    const roleCounts = Object.fromEntries(
      ['teacher', 'inspector', 'director', 'admin'].map((role) => [
        role,
        users.filter((u) => u.role === role).length,
      ])
    );
    const statusCounts = Object.fromEntries(
      ['active', 'inactive', 'pending_approval'].map((status) => [
        status,
        users.filter((u) => u.status === status).length,
      ])
    );
    const serviceEnabled = access.filter((a) => a.enabled).length;
    const teachers = users.filter(activeTeacher);
    const trend = Object.entries(
      users.reduce((out: Record<string, number>, u) => {
        const day = u.createdAt.toISOString().slice(0, 10);
        out[day] = (out[day] || 0) + 1;
        return out;
      }, {})
    ).sort();
    res.json({
      success: true,
      range,
      generatedAt: new Date().toISOString(),
      overview: {
        totalAccounts: users.length,
        activeAccounts: users.filter((u) => u.status === 'active' && u.isApprovedByAdmin).length,
        pendingAccounts: users.filter(pendingAccount).length,
        teachers: roleCounts.teacher,
        inspectors: roleCounts.inspector,
        directors: roleCounts.director,
        admins: roleCounts.admin,
        districts: districts.length,
        coveredDistricts: covered.size,
        uncoveredDistricts: districts.length - covered.size,
        acceptedAssignments: accepted.length,
        pendingAssignments: pending.length,
        moderationPending:
          (counts(games).PENDING_APPROVAL || 0) + (counts(situations).PENDING_APPROVAL || 0),
        serviceEnabledAccounts: serviceEnabled,
      },
      accounts: {
        roleCounts,
        statusCounts,
        activeTeachers: teachers.length,
        pendingAccounts: users.filter(pendingAccount).length,
        creationTrend: trend,
      },
      coverage: {
        districts: districts.map((d) => ({
          id: d.id,
          name: d.name,
          directorate: d.directorate,
          covered: covered.has(d.id),
        })),
        inspectorsWithoutAcceptedTeachers: activeInspectors.filter(
          (i) => !accepted.some((a) => a.inspectorId === i.id)
        ).length,
      },
      assignments: {
        statuses: Object.fromEntries(
          ['Pending', 'Active', 'Changed', 'Removed'].map((status) => [
            status,
            assignments.filter((a) => a.status === status).length,
          ])
        ),
        pending: pending.slice(0, 25).map((a) => ({
          id: a.id,
          teacherId: a.teacherId,
          inspectorId: a.inspectorId,
          updatedAt: a.updatedAt,
        })),
        workload: activeInspectors.map((i) => ({
          id: i.id,
          accepted: accepted.filter((a) => a.inspectorId === i.id).length,
          pending: pending.filter((a) => a.inspectorId === i.id).length,
        })),
      },
      moderation: { games: counts(games), situations: counts(situations) },
      services: {
        globalEnabled: config?.enabled ?? true,
        enabledAccounts: serviceEnabled,
        disabledAccounts: users.length - serviceEnabled,
        personalCredentialConfigured: access.filter(
          (a) => a.credentialEnabled || Boolean(a.encryptedApiKey)
        ).length,
        fallbackAccounts: access.filter(
          (a) => a.enabled && !a.credentialEnabled && !a.encryptedApiKey
        ).length,
        assistantEnabled: access.filter((a) => a.assistantEnabled).length,
        gameSuggestionsEnabled: access.filter((a) => a.gameSuggestionsEnabled).length,
      },
      activity: { visits, notes, directMessages, districtMessages, classes, students },
      quality: {
        activeTeachersWithoutInstitution: teachers.filter((u) => !u.institutionId).length,
        activeTeachersWithoutAcceptedAssignment: teachers.filter(
          (u) => !accepted.some((a) => a.teacherId === u.id)
        ).length,
        inspectorsWithoutDistrict: activeInspectors.filter(
          (u) => !(u.eduDistrictId || u.districtId)
        ).length,
        districtsWithoutInspector: districts.length - covered.size,
        accountsWithoutPhone: users.filter((u) => !u.phone).length,
      },
    });
  } catch (error) {
    console.error('admin reports error:', error);
    res.status(500).json({ error: 'تعذر تحميل التقارير التشغيلية.' });
  }
});

apiRouter.get('/admin/users/pending', requireRole('admin'), async (_req, res) => {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['teacher', 'inspector'] },
      OR: [{ status: 'pending_approval' }, { isApprovedByAdmin: false }],
    },
    orderBy: { createdAt: 'asc' },
    include: {
      eduDirectorate: { select: { name: true } },
      eduDistrict: { select: { name: true } },
      eduSchool: { select: { name: true, municipality: { select: { name: true } } } },
    },
  });
  res.json({
    success: true,
    users: users.map((user) => {
      const safe = sanitizeUser(user as any) as any;
      const { eduDirectorate, eduDistrict, eduSchool, ...base } = safe;
      return {
        ...base,
        adminAffiliation: {
          directorateName: eduDirectorate?.name || undefined,
          districtName: eduDistrict?.name || undefined,
          institutionName: eduSchool?.name || user.schoolName || undefined,
          municipalityName: eduSchool?.municipality?.name || user.municipality || undefined,
        },
      };
    }),
  });
});

apiRouter.get('/admin/users', requireRole('admin'), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      eduDirectorate: { select: { name: true } },
      eduDistrict: { select: { name: true } },
      eduSchool: { select: { name: true, municipality: { select: { name: true } } } },
    },
  });
  res.json({
    success: true,
    users: users.map((user) => {
      const safe = sanitizeUser(user as any) as any;
      const { eduDirectorate, eduDistrict, eduSchool, ...base } = safe;
      return {
        ...base,
        adminAffiliation: {
          directorateName: eduDirectorate?.name || undefined,
          districtName: eduDistrict?.name || undefined,
          institutionName: eduSchool?.name || user.schoolName || undefined,
          municipalityName: eduSchool?.municipality?.name || user.municipality || undefined,
        },
      };
    }),
  });
});

apiRouter.get('/admin/users/:id', requireRole('admin'), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      eduDirectorate: { select: { id: true, name: true } },
      eduDistrict: { select: { id: true, name: true, directorateId: true } },
      eduSchool: {
        select: { id: true, name: true, municipality: { select: { id: true, name: true } } },
      },
      teacherAssignment: {
        select: {
          status: true,
          inspector: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      inspectorAssignments: {
        where: { status: { in: ['Active', 'Changed'] } },
        select: {
          status: true,
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true, status: true },
          },
        },
      },
      generationAccess: { select: { enabled: true, credentialEnabled: true } },
      _count: { select: { students: true, studentClasses: true, inspectorAssignments: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'الحساب غير موجود.' });
  const safe = sanitizeUser(user as any) as any;
  const {
    eduDirectorate,
    eduDistrict,
    eduSchool,
    teacherAssignment,
    inspectorAssignments,
    generationAccess,
    _count,
    ...base
  } = safe;
  res.json({
    success: true,
    user: {
      ...base,
      createdAt: user.createdAt,
      adminAffiliation: {
        directorateName: eduDirectorate?.name || undefined,
        districtName: eduDistrict?.name || undefined,
        institutionName: eduSchool?.name || user.schoolName || undefined,
        municipalityName: eduSchool?.municipality?.name || user.municipality || undefined,
      },
      assignment: teacherAssignment,
      assignedTeachers: (inspectorAssignments || []).map((item: any) => item.teacher),
      counts: {
        students: _count.students,
        classes: _count.studentClasses,
        assignedTeachers: inspectorAssignments?.length || 0,
      },
      serviceAccess: generationAccess,
    },
  });
});
apiRouter.post('/admin/users/:id/activate', requireRole('admin'), async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'الحساب غير موجود.' });
  if (existing.role === 'admin')
    return res.status(403).json({ error: 'لا يمكن تفعيل حساب مشرف من هذا المسار.' });
  if (existing.role === 'inspector') {
    const assignment = {
      role: existing.role,
      directorateId: existing.directorateId,
      districtId: existing.districtId,
    };
    try {
      await enforceRoleAssignment(assignment, existing);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'يرجى استكمال مديرية ومقاطعة المفتش.',
      });
    }
  }
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: { status: 'active', isApprovedByAdmin: true },
  });
  res.json({ success: true, user: sanitizeUser(user) });
});

// الحقول الوحيدة المسموح كتابتها في جدول User — قائمة بيضاء صارمة.
// أي حقل زائد يصله من الواجهة (مثل apiKeyConfigured، wilaya، teachingExperienceYears،
// followingCount...) يُتجاهل بدل إسقاط عملية التحديث بخطأ Prisma P2009 (Unknown argument)
// الذي كان يجعل تفعيل الحساب يفشل بصمت في قاعدة البيانات بينما تعرض الواجهة نجاحاً.
const USER_WRITEABLE_FIELDS = [
  'username',
  'spexId',
  'firstName',
  'lastName',
  'email',
  'googleId',
  'role',
  'avatar',
  'phone',
  'directorateId',
  'districtId',
  'institutionId',
  'schoolName',
  'municipality',
  'specialization',
  'cycle',
  'yearsExperience',
  'bio',
  'status',
  'isApprovedByAdmin',
  'followingIds',
  'followersIds',
  'publishedResourcesCount',
  'approvedResourcesCount',
  'privacySettings',
  'encryptedApiKey',
  'apiKeyStatus',
  'municipalityId',
] as const;

async function buildUserWriteData(
  input: Record<string, unknown>,
  allowRoleChanges = false,
  allowApiKeyChanges = false
) {
  const data: Record<string, unknown> = {};
  for (const field of USER_WRITEABLE_FIELDS) {
    if (field in input && input[field] !== undefined) {
      data[field] = input[field];
    }
  }
  if (!allowRoleChanges) {
    delete data.role;
    delete data.status;
    delete data.isApprovedByAdmin;
  }
  if (typeof input.password === 'string' && input.password) {
    data.passwordHash = await hashPassword(input.password);
  }
  if (data.email) data.email = String(data.email).toLowerCase().trim();
  if (!allowApiKeyChanges) {
    // لا يجوز تفعيل أو تغيير مفتاح الذكاء الاصطناعي إلا من طرف مشرف المنظومة (admin) وحده.
    delete data.encryptedApiKey;
    delete data.apiKeyStatus;
  }
  // API keys are encrypted server-side and never returned to the browser.
  if (allowApiKeyChanges && typeof input.customApiKey === 'string') {
    const raw = input.customApiKey.trim();
    data.encryptedApiKey = raw ? encryptApiKey(raw) : null;
  }
  return data;
}

/** Validate and normalize organizational ownership at the server boundary. */
async function enforceRoleAssignment(
  data: Record<string, unknown>,
  existing: {
    id: string;
    role: string;
    status: string;
    directorateId: string;
    districtId: string;
  } | null
) {
  const role = String(data.role ?? existing?.role ?? 'teacher');
  const directorateId = String(data.directorateId ?? existing?.directorateId ?? '').trim();
  const districtId = String(data.districtId ?? existing?.districtId ?? '').trim();

  if (role === 'inspector') {
    if (!directorateId) throw new Error('يرجى اختيار مديرية التربية.');
    if (!districtId) throw new Error('يرجى اختيار المقاطعة التفتيشية.');
    const district = await prisma.inspectionDistrict.findUnique({
      where: { id: districtId },
      select: { directorateId: true },
    });
    if (!district || district.directorateId !== directorateId)
      throw new Error('المقاطعة التفتيشية لا تنتمي إلى المديرية المختارة.');
    const occupied = await prisma.user.findFirst({
      where: {
        role: 'inspector',
        status: 'active',
        districtId,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      select: { id: true },
    });
    if (occupied) throw new Error('هذه المقاطعة التفتيشية مرتبطة بالفعل بحساب مفتش.');
    data.institutionId = null;
    data.schoolName = null;
    data.municipality = null;
  } else if (role === 'admin' || role === 'director') {
    // These roles have no inspection ownership; never inherit a UI default.
    data.directorateId = directorateId;
    data.districtId = '';
    data.institutionId = null;
  } else if (role === 'teacher') {
    // Teacher payloads cannot smuggle inspector-only geographic fields.
    data.eduDistrictId = undefined;
  }
  return data;
}

apiRouter.post('/db/users', async (req, res) => {
  const { user } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'بيانات المستخدم غير مكتملة' });
  }

  const isSelf = req.user!.id === user.id;
  const isAdmin = req.user!.role === 'admin';
  const isSuperAdmin = Boolean(req.user!.isPlatformOwner);
  const isManager = isAdmin || req.user!.role === 'inspector';

  // يُسمح لأي مستخدم بتعديل ملفّه الشخصي (الإعدادات، كلمة المرور)، وللمشرف/المفتش بإدارة أي حساب
  if (!isSelf && !isManager) {
    return res.status(403).json({ error: 'لا تملك الصلاحية لتعديل بيانات مستخدم آخر.' });
  }

  // مستخدم عادي لا يمكنه ترقية نفسه إلى دور أعلى أو اعتماد نفسه إدارياً
  if (isSelf && !isManager) {
    delete user.role;
    delete user.isApprovedByAdmin;
    delete user.status;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    // Inspector affiliation is an administrative assignment.  A self-service
    // profile update may never smuggle changes to directorate, district or
    // institution fields, even when the HTTP payload is handcrafted.
    if (isSelf && req.user!.role === 'inspector') {
      delete user.directorateId;
      delete user.districtId;
      delete user.institutionId;
      delete user.schoolName;
      delete user.municipality;
      delete user.municipalityId;
    }
    const requestedRole = typeof user.role === 'string' ? user.role : existing?.role;
    if (requestedRole === 'admin' && !isSuperAdmin) {
      return res.status(403).json({ error: 'غير مسموح بإنشاء حساب مشرف.' });
    }
    if (existing?.isPlatformOwner && (!isSuperAdmin || (user.role && user.role !== 'admin'))) {
      return res.status(403).json({ error: 'حساب مالك المنصة محمي ولا يمكن تعديله.' });
    }
    if (!existing && !isManager) {
      return res
        .status(403)
        .json({ error: 'لا يمكن إنشاء حسابات جديدة إلا من طرف مشرف المنظومة أو المفتش.' });
    }

    // المفتش (على خلاف المشرف admin) لا يملك صلاحية منح الأدوار العليا، ولا صلاحية
    // التعديل على حسابات تحمل أصلاً دوراً أعلى من "teacher" — يمكنه فقط إدارة حسابات
    // المعلمين، وتعديل ملفّه الشخصي هو نفسه.
    if (isManager && !isAdmin) {
      const elevatedRoles = ['admin', 'inspector', 'director'];
      const requestedRole = typeof user.role === 'string' ? user.role : undefined;
      const existingRole = existing?.role;

      if (
        requestedRole &&
        elevatedRoles.includes(requestedRole) &&
        requestedRole !== existingRole
      ) {
        return res.status(403).json({ error: 'منح هذا الدور يتطلب صلاحية مشرف المنظومة (admin).' });
      }
      if (existing && existingRole && elevatedRoles.includes(existingRole) && !isSelf) {
        return res.status(403).json({
          error: 'لا تملك الصلاحية لتعديل حساب بهذا الدور. هذا الإجراء مقتصر على مشرف المنظومة.',
        });
      }
    }

    const data = await buildUserWriteData(user, isAdmin, isAdmin);
    if (requestedRole === 'admin' && isSuperAdmin)
      data.isPlatformOwner = Boolean(existing?.isPlatformOwner);
    await enforceRoleAssignment(data, existing);

    if (!existing && !data.email) {
      // تسجيل حساب جديد يشترط امتلاك عنوان بريد إلكتروني
      return res.status(400).json({ error: 'عنوان البريد الإلكتروني إلزامي لإنشاء حساب جديد.' });
    }

    if (!existing && !data.passwordHash) {
      // إنشاء حساب جديد بدون كلمة مرور أولية — نرفض بدل توليد كلمة افتراضية ضعيفة صامتة
      return res.status(400).json({ error: 'يجب تحديد كلمة مرور أولية عند إنشاء حساب جديد.' });
    }

    const saved = existing
      ? await prisma.user.update({ where: { id: user.id }, data: data as any })
      : await prisma.user.create({ data: { id: user.id, ...data } as any });

    await triggerAutoAssignment(saved);

    res.json({
      success: true,
      user: isSelf || isAdmin ? sanitizeOwnUser(saved) : sanitizeUser(saved),
    });
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message.startsWith('يرجى') ||
        err.message.includes('المقاطعة التفتيشية') ||
        err.message.includes('مرتبطة بالفعل'))
    ) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'P2002') {
      if (Array.isArray(err.meta?.target) && err.meta.target.includes('districtId')) {
        return res.status(409).json({ error: 'هذه المقاطعة التفتيشية مرتبطة بالفعل بحساب مفتش.' });
      }
      return res.status(409).json({ error: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل.' });
    }
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'تعذر حفظ بيانات المستخدم.' });
  }
});

apiRouter.post('/db/users/batch', requireRole('admin'), async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'قائمة المستخدمين غير صحيحة' });
  }
  try {
    for (const u of users) {
      if (!u.id) continue;
      const existing = await prisma.user.findUnique({ where: { id: u.id } });
      if ((u.role === 'admin' || existing?.role === 'admin') && !req.user!.isPlatformOwner) {
        throw new Error('غير مسموح بإنشاء حساب مشرف.');
      }
      if (existing?.isPlatformOwner && !req.user!.isPlatformOwner) {
        throw new Error('حساب مالك المنصة محمي ولا يمكن تعديله.');
      }
      const data = await buildUserWriteData(u, true, true);
      await enforceRoleAssignment(data, existing);
      let saved = null;
      if (existing) {
        saved = await prisma.user.update({ where: { id: u.id }, data: data as any });
      } else if (data.passwordHash) {
        saved = await prisma.user.create({ data: { id: u.id, ...data } as any });
      }
      // مستخدم جديد بدون كلمة مرور ضمن دفعة جماعية يُتجاهل بدل رفض الدفعة كاملة
      if (saved) await triggerAutoAssignment(saved);
    }
    res.json({ success: true, count: users.length });
  } catch (err) {
    console.error('Error batch-saving users:', err);
    res.status(500).json({ error: 'تعذر حفظ قائمة المستخدمين.' });
  }
});

apiRouter.delete('/db/users/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (existing?.isPlatformOwner && !req.user!.isPlatformOwner) {
      return res.status(403).json({ error: 'حساب مالك المنصة محمي ولا يمكن حذفه.' });
    }
    // إن كان المحذوف مفتشاً، نحتفظ بقائمة أساتذته قبل الحذف حتى نعيد مطابقتهم
    // (بمفتش آخر مطابق إن وُجد، أو حالة Pending إن لم يوجد) بدل تركهم مرتبطين بمفتش محذوف
    const affectedTeacherIds =
      existing?.role === 'inspector'
        ? (
            await prisma.inspectorAssignment.findMany({
              where: { inspectorId: id },
              select: { teacherId: true },
            })
          ).map((a) => a.teacherId)
        : [];

    await prisma.user.delete({ where: { id } });

    for (const teacherId of affectedTeacherIds) {
      await reassignTeacher(teacherId);
    }
  } catch {
    // غير موجود مسبقاً
  }
  res.json({ success: true });
});

// -----------------------------------------------------------------------
// Helper factory for the simple JSON-blob collections (lessonPlans, notebook, ...)
// كل سجل يُخزَّن كصف حقيقي في Postgres (id + JSON منظم)، وليس ملف JSON على القرص
// -----------------------------------------------------------------------
type DbRecord = Record<string, unknown> & { id: string; data?: unknown };

interface JsonCollectionDelegate {
  findMany: (args?: unknown) => Promise<DbRecord[]>;
  findUnique: (args: { where: { id: string } }) => Promise<DbRecord | null>;
  upsert: (args: unknown) => Promise<DbRecord>;
  delete: (args: { where: { id: string } }) => Promise<DbRecord>;
}

function jsonCollectionRoutes(opts: {
  path: string;
  model: JsonCollectionDelegate;
  bodyKey: string;
  listKey: string;
  batchBodyKey?: string;
  ownerField?: 'ownerId' | 'authorId' | 'userId' | 'senderId';
  visibleTo?: (row: DbRecord, user: { id: string; role: string; districtId: string }) => boolean;
  ownerAssignedByServer?: boolean;
  transformCreate?: (
    item: Record<string, unknown>,
    user: { id: string; role: string; districtId: string }
  ) => Record<string, unknown>;
  allowedCreateRoles?: string[];
}) {
  const {
    path,
    model,
    bodyKey,
    listKey,
    batchBodyKey,
    ownerField,
    visibleTo,
    ownerAssignedByServer = true,
    transformCreate,
    allowedCreateRoles,
  } = opts;

  const validatePlannedLesson = async (item: Record<string, unknown>, user: { id: string }) => {
    if (path !== 'lesson-plans' || typeof item.classPlannedSessionId !== 'string') return true;
    if (typeof item.classId !== 'string' || typeof item.academicYearId !== 'string') return false;
    const planned = await prisma.classPlannedSession.findFirst({
      where: {
        id: item.classPlannedSessionId,
        classId: item.classId,
        academicYearId: item.academicYearId,
        teacherId: user.id,
      },
      select: { id: true },
    });
    return Boolean(planned);
  };

  const validateNotebookSession = async (item: Record<string, unknown>, user: { id: string }) => {
    if (path !== 'notebook' || typeof item.classPlannedSessionId !== 'string') return true;
    if (typeof item.classId !== 'string' || typeof item.academicYearId !== 'string') return false;
    const planned = await prisma.classPlannedSession.findFirst({
      where: {
        id: item.classPlannedSessionId,
        classId: item.classId,
        academicYearId: item.academicYearId,
        teacherId: user.id,
      },
      select: { id: true },
    });
    return Boolean(planned);
  };
  const canWrite = (existing: DbRecord | null, user: { id: string; role: string }) =>
    canWriteRecord(existing, user, ownerField);

  apiRouter.get(`/db/${path}`, async (req, res) => {
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : undefined;
    const offset = req.query.offset ? Math.max(Number(req.query.offset), 0) : undefined;

    const rows = await model.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const visible = visibleTo ? rows.filter((r) => visibleTo(r, req.user!)) : rows;
    res.json({
      success: true,
      [listKey]: visible.map((r) => ({ ...((r.data as Record<string, unknown>) || {}), id: r.id })),
    });
  });

  apiRouter.post(`/db/${path}`, async (req, res) => {
    if (allowedCreateRoles && !allowedCreateRoles.includes(req.user!.role)) {
      return res.status(403).json({ error: 'لا تملك الصلاحية لإنشاء هذا النوع من السجلات.' });
    }
    const item = req.body[bodyKey];
    if (!item || !item.id) {
      return res.status(400).json({ error: 'بيانات غير مكتملة' });
    }
    if (
      !(await validatePlannedLesson(item as Record<string, unknown>, req.user!)) ||
      !(await validateNotebookSession(item as Record<string, unknown>, req.user!))
    ) {
      return res.status(403).json({ error: 'الحصة التشغيلية غير موجودة ضمن أقسامك.' });
    }

    if (path === 'inspector-notes' && req.user!.role === 'inspector') {
      const targetTeacherId = typeof item.teacherId === 'string' ? item.teacherId : '';
      const assignment = targetTeacherId
        ? await prisma.inspectorAssignment.findUnique({ where: { teacherId: targetTeacherId } })
        : null;
      if (
        !assignment ||
        assignment.inspectorId !== req.user!.id ||
        !['Active', 'Changed'].includes(assignment.status)
      ) {
        return res.status(403).json({ error: 'لا تملك صلاحية توجيه ملاحظة لهذا الأستاذ.' });
      }
    }

    const existing = await model.findUnique({ where: { id: item.id } });
    if (!canWrite(existing, req.user!)) {
      return res.status(403).json({ error: 'لا تملك الصلاحية لتعديل هذا العنصر.' });
    }
    if (path === 'lesson-plans' && existing) {
      const existingData = (existing.data as Record<string, unknown>) || {};
      if (
        existingData.classPlannedSessionId &&
        existingData.classPlannedSessionId !== item.classPlannedSessionId
      ) {
        return res.status(403).json({ error: 'لا يمكن نقل المذكرة إلى حصة تشغيلية أخرى.' });
      }
    }

    const safeItem = transformCreate
      ? transformCreate({ ...(item as Record<string, unknown>) }, req.user!)
      : item;
    const data: Record<string, unknown> = { data: safeItem };
    // لا يمكن تغيير مالك السجل عند التعديل (منع انتحال الملكية)؛ عند الإنشاء يُنسب دائماً
    // لصاحب الطلب ما لم يكن الحقل يمثّل طرفاً آخر (مثل مستلم الإشعار)
    if (ownerField) {
      data[ownerField] = resolveOwnerFieldValue(
        existing,
        item,
        req.user!.id,
        ownerAssignedByServer,
        ownerField
      );
    }
    if (path === 'direct-messages' && typeof safeItem.receiverId === 'string') {
      data.recipientId = safeItem.receiverId;
    }

    await model.upsert({
      where: { id: item.id },
      create: { id: item.id, ...data } as unknown,
      update: data as unknown,
    });
    res.json({ success: true, [bodyKey]: item });
  });

  if (batchBodyKey) {
    apiRouter.post(`/db/${path}/batch`, async (req, res) => {
      const items = req.body[batchBodyKey];
      if (allowedCreateRoles && !allowedCreateRoles.includes(req.user!.role)) {
        return res.status(403).json({ error: 'لا تملك الصلاحية لإنشاء هذا النوع من السجلات.' });
      }
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'قائمة غير صحيحة' });
      }
      for (const item of items) {
        if (!item.id) continue;
        if (!(await validatePlannedLesson(item as Record<string, unknown>, req.user!))) continue;
        if (!(await validateNotebookSession(item as Record<string, unknown>, req.user!))) continue;
        if (path === 'lesson-plans' && item.classPlannedSessionId) {
          const existing = await model.findUnique({ where: { id: item.id } });
          const existingData = (existing?.data as Record<string, unknown>) || {};
          if (
            existingData.classPlannedSessionId &&
            existingData.classPlannedSessionId !== item.classPlannedSessionId
          )
            continue;
        }
        if (path === 'inspector-notes' && req.user!.role === 'inspector') {
          const targetTeacherId = typeof item.teacherId === 'string' ? item.teacherId : '';
          const assignment = targetTeacherId
            ? await prisma.inspectorAssignment.findUnique({ where: { teacherId: targetTeacherId } })
            : null;
          if (
            !assignment ||
            assignment.inspectorId !== req.user!.id ||
            !['Active', 'Changed'].includes(assignment.status)
          )
            continue;
        }
        const existing = await model.findUnique({ where: { id: item.id } });
        if (!canWrite(existing, req.user!)) continue; // تجاهل العناصر التي لا يملك المستخدم صلاحية تعديلها

        const safeItem = transformCreate
          ? transformCreate({ ...(item as Record<string, unknown>) }, req.user!)
          : item;
        const data: Record<string, unknown> = { data: safeItem };
        if (ownerField) {
          data[ownerField] = resolveOwnerFieldValue(
            existing,
            item,
            req.user!.id,
            ownerAssignedByServer,
            ownerField
          );
        }
        if (path === 'direct-messages' && typeof safeItem.receiverId === 'string') {
          data.recipientId = safeItem.receiverId;
        }
        await model.upsert({
          where: { id: item.id },
          create: { id: item.id, ...data } as unknown,
          update: data as unknown,
        });
      }
      res.json({ success: true, count: items.length });
    });
  }

  apiRouter.delete(`/db/${path}/:id`, async (req, res) => {
    try {
      const existing = await model.findUnique({ where: { id: req.params.id } });
      if (existing && !canWrite(existing, req.user!)) {
        return res.status(403).json({ error: 'لا تملك الصلاحية لحذف هذا العنصر.' });
      }
      await model.delete({ where: { id: req.params.id } });
    } catch {
      // غير موجود مسبقاً
    }
    res.json({ success: true });
  });
}

const isStaff = (user: { role: string }) => user.role === 'admin' || user.role === 'inspector';

// 2. Lesson Plans — خاصة بالأستاذ صاحبها، ومرئية أيضاً لطاقم الإشراف (admin/inspector)
jsonCollectionRoutes({
  path: 'lesson-plans',
  model: prisma.lessonPlan,
  bodyKey: 'lessonPlan',
  listKey: 'lessonPlans',
  batchBodyKey: 'lessonPlans',
  ownerField: 'ownerId',
  transformCreate: (item, user) => ({ ...item, teacherId: user.id }),
  visibleTo: (row, user) => isStaff(user) || row.ownerId === user.id,
});

// 3. Daily Notebook — كراس يومي خاص بالأستاذ، لا يُعرض لبقية الأساتذة
jsonCollectionRoutes({
  path: 'notebook',
  model: prisma.notebookEntry,
  bodyKey: 'entry',
  listKey: 'dailyNotebook',
  batchBodyKey: 'dailyNotebook',
  ownerField: 'ownerId',
  visibleTo: (row, user) => isStaff(user) || row.ownerId === user.id,
});

// 4. Inspector Notes — يراها كاتبها (المفتش) والأستاذ المعنيّ بها فقط، بالإضافة إلى admin
jsonCollectionRoutes({
  path: 'inspector-notes',
  model: prisma.inspectorNote,
  bodyKey: 'note',
  listKey: 'inspectorNotes',
  batchBodyKey: 'inspectorNotes',
  ownerField: 'authorId',
  allowedCreateRoles: ['admin', 'inspector'],
  visibleTo: (row, user) =>
    user.role === 'admin' ||
    row.authorId === user.id ||
    (row.data as Record<string, unknown>)?.teacherId === user.id,
});

// Inspection visits are persisted separately from the UI state and are scoped
// to the current active teacher↔inspector assignment.
apiRouter.post('/inspection-visits', requireRole('inspector'), async (req, res) => {
  const visit = (
    req.body?.visit && typeof req.body.visit === 'object' ? req.body.visit : req.body
  ) as Record<string, unknown>;
  const teacherId = typeof visit.teacherId === 'string' ? visit.teacherId : '';
  if (!teacherId) return res.status(400).json({ error: 'المعلم مطلوب.' });
  const assignment = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  if (
    !assignment ||
    assignment.inspectorId !== req.user!.id ||
    !['Active', 'Changed'].includes(assignment.status)
  ) {
    return res.status(403).json({ error: 'لا تملك صلاحية تسجيل زيارة لهذا الأستاذ.' });
  }
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { id: true, institutionId: true },
  });
  if (!teacher || teacher.id !== teacherId)
    return res.status(403).json({ error: 'الأستاذ المحدد غير متاح ضمن إسناداتك المقبولة.' });
  const id =
    typeof visit.id === 'string' && visit.id.trim()
      ? visit.id
      : `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const stringList = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string').slice(0, 50)
      : [];
  const safeData = {
    id,
    teacherId,
    inspectorId: req.user!.id,
    institutionId: teacher.institutionId,
    visitDate:
      typeof visit.visitDate === 'string' ? visit.visitDate : new Date().toISOString().slice(0, 10),
    visitType: typeof visit.visitType === 'string' ? visit.visitType : 'توجيهية',
    lessonObservedTitle:
      typeof visit.lessonObservedTitle === 'string'
        ? visit.lessonObservedTitle
        : 'حصة التربية البدنية والرياضية',
    pedagogicalGrade: typeof visit.pedagogicalGrade === 'number' ? visit.pedagogicalGrade : null,
    positivePoints: stringList(visit.positivePoints),
    areasForImprovement: stringList(visit.areasForImprovement),
    recommendations: stringList(visit.recommendations),
    officialReportGenerated: visit.officialReportGenerated === true,
  };
  const row = await prisma.inspectionVisitRecord.create({
    data: {
      id,
      inspectorId: req.user!.id,
      teacherId,
      institutionId: teacher.institutionId,
      data: safeData as any,
    },
  });
  res.status(201).json({ success: true, visit: row.data });
});

// 5. District Group Chat — تُعرض ضمن نطاق مقاطعة المستخدم (districtId) فقط
jsonCollectionRoutes({
  path: 'district-messages',
  model: prisma.districtMessage,
  bodyKey: 'message',
  listKey: 'districtMessages',
  batchBodyKey: 'districtMessages',
  ownerField: 'authorId',
  transformCreate: (item, user) => ({ ...item, districtId: user.districtId }),
  visibleTo: (row, user) =>
    user.role === 'admin' || (row.data as Record<string, unknown>)?.districtId === user.districtId,
});

// 6. Direct Messages — خاصة بطرفي المحادثة (المُرسل والمُستقبِل) والمفتش والمسؤول
jsonCollectionRoutes({
  path: 'direct-messages',
  model: prisma.directMessage,
  bodyKey: 'message',
  listKey: 'directMessages',
  batchBodyKey: 'directMessages',
  ownerField: 'senderId',
  ownerAssignedByServer: true,
  transformCreate: (item, user) => {
    const receiverId =
      typeof item.receiverId === 'string'
        ? item.receiverId
        : typeof item.recipientId === 'string'
          ? item.recipientId
          : undefined;
    const safe: Record<string, unknown> = { ...item, senderId: user.id };
    delete safe.recipientId;
    return receiverId ? { ...safe, receiverId } : safe;
  },
  visibleTo: (row, user) =>
    user.role === 'admin' || row.senderId === user.id || row.recipientId === user.id,
});

// 7. Community Resources — محتوى عام مشترك، يبقى مرئياً للجميع كما هو مصمَّم
jsonCollectionRoutes({
  path: 'community-resources',
  model: prisma.communityResource,
  bodyKey: 'resource',
  listKey: 'communityResources',
  batchBodyKey: 'communityResources',
  ownerField: 'authorId',
});

// 8. Community Notifications — تُعرض فقط لمستلمها أو مُرسلها
// ملاحظة إصلاح: ownerField هنا هو "userId" وهو حقل *المستلم* (الشخص الذي يجب أن
// يصله الإشعار)، وليس مالِك السجل بمعنى مُرسِله. لذلك يجب ألا نستخدم
// ownerAssignedByServer=true (وهو مخصَّص لحقول مثل senderId التي يجب انتحال هويتها
// من طرف الخادم دائماً)، لأن ذلك كان يستبدل خطأً معرّف المستلم القادم من العميل
// بمعرّف المرسل نفسه عند الإنشاء — أي أن كل إشعار كان يصل فعلياً لصاحبه فقط ولا
// يصل أبداً للمستخدم المستهدف الحقيقي. معرّف المُرسِل (senderId) يبقى مضموناً من
// الخادم عبر transformCreate كما كان، بينما "من يملك حق الحذف/القراءة" (canWrite)
// يبقى محصوراً في صاحب الإشعار (المستلم) أو admin كما هو مصمَّم.
jsonCollectionRoutes({
  path: 'community-notifications',
  model: prisma.communityNotification,
  bodyKey: 'notification',
  listKey: 'communityNotifications',
  ownerField: 'userId',
  ownerAssignedByServer: false,
  transformCreate: (item, user) => ({ ...item, senderId: user.id }),
  visibleTo: (row, user) =>
    user.role === 'admin' ||
    row.userId === user.id ||
    (row.data as Record<string, unknown>)?.senderId === user.id,
});

// -----------------------------------------------------------------------
// 9. المخطط السنوي والتوزيع السنوي — الأستاذ يعدّل صياغة أهدافه الخاصة، والمفتش
//    يقترح مخططاً/توزيعاً لأساتذة مقاطعته (وفق الإسناد الفعلي في InspectorAssignment)
//    ثم يعتمد اقتراحه بنفسه ليصبح نافذاً عند الأستاذ.
// -----------------------------------------------------------------------

async function isInspectorOfTeacher(inspectorId: string, teacherId: string): Promise<boolean> {
  const assignment = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  return (
    !!assignment &&
    assignment.inspectorId === inspectorId &&
    (assignment.status === 'Active' || assignment.status === 'Changed')
  );
}

apiRouter.get('/admin/curriculum/overrides', requireRole('admin'), async (_req, res) => {
  try {
    const rows = await prisma.annualPlan.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        teacherId: true,
        academicYearId: true,
        levelId: true,
        kind: true,
        status: true,
        data: true,
        createdAt: true,
        updatedAt: true,
        proposedByInspectorId: true,
        approvedAt: true,
      },
    });
    const teacherIds = [...new Set(rows.map((row) => row.teacherId))];
    const teachers = await prisma.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
    const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    res.json({
      success: true,
      overrides: rows.map((row) => ({ ...row, teacher: teacherById.get(row.teacherId) || null })),
    });
  } catch {
    res.status(500).json({ error: 'تعذر تحميل تخصيصات الأساتذة.' });
  }
});
apiRouter.get('/db/annual-plans', async (req, res) => {
  const { teacherId, kind, academicYearId, levelId } = req.query;
  const user = req.user!;

  const where: Record<string, unknown> = {};
  if (kind) where.kind = String(kind);
  if (academicYearId) {
    if (!isCanonicalAcademicYearId(String(academicYearId)))
      return res.status(400).json({ error: 'السنة الدراسية يجب أن تكون بصيغة YYYY-YYYY متتالية.' });
    where.academicYearId = String(academicYearId);
  }
  if (levelId) where.levelId = String(levelId);

  if (user.role === 'teacher') {
    // الأستاذ لا يرى إلا سجلاته الخاصة (بما فيها اقتراحات المفتش الموجّهة له)
    where.teacherId = user.id;
  } else if (user.role === 'inspector') {
    if (teacherId) {
      if (!(await isInspectorOfTeacher(user.id, String(teacherId)))) {
        return res.status(403).json({ error: 'هذا الأستاذ ليس ضمن مقاطعتك.' });
      }
      where.teacherId = String(teacherId);
    } else {
      const assignments = await prisma.inspectorAssignment.findMany({
        where: { inspectorId: user.id, status: { in: ['Active', 'Changed'] } },
      });
      where.teacherId = { in: assignments.map((a) => a.teacherId) };
    }
  } else if (user.role === 'admin' && teacherId) {
    where.teacherId = String(teacherId);
  }

  const annualPlans = await prisma.annualPlan.findMany({
    where: where as any,
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, annualPlans });
});

// قيمة تخصيص واحدة قد تحمل أحد عدة أشكال بحسب kind السجل (انظر AnnualPlanObjectiveOverride في types/spex.ts):
// - plan_components: components/resources/indicators (مصفوفات نصية، مفتاحها fieldId)
// - section_wording: objective/teacherNote (مفتاحها `${fieldId}__${sessionNumber}`)
// - schedule_dates: date/status/executionNote (مفتاحها `${fieldId}__${sessionNumber}`)
// - plan/schedule (قديم، للتوافقية فقط): objective
const annualPlanOverrideValueSchema = z
  .object({
    objective: z.string().trim().max(2000).optional(),
    teacherNote: z.string().trim().max(1000).optional(),
    components: z.array(z.string().trim().max(500)).max(20).optional(),
    resources: z.array(z.string().trim().max(500)).max(20).optional(),
    indicators: z.array(z.string().trim().max(500)).max(20).optional(),
    date: z.string().trim().max(20).optional(),
    status: z.enum(['مبرمجة', 'منجزة', 'مؤجلة', 'غير منجزة']).optional(),
    executionNote: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'لا يمكن حفظ تخصيص فارغ.',
  });

const annualPlanUpsertSchema = z.object({
  id: z.string().optional(),
  teacherId: z.string().min(1),
  academicYearId: academicYearIdSchema,
  levelId: z.string().min(1),
  kind: z.enum(['plan', 'schedule', 'plan_components', 'section_wording', 'schedule_dates']),
  data: z.object({
    overrides: z.record(annualPlanOverrideValueSchema),
    note: z.string().trim().max(1000).optional(),
  }),
});

// حفظ/تعديل مخطط أو توزيع سنوي: الأستاذ لمسودته الخاصة، أو المفتش كاقتراح لأستاذ
// من مقاطعته (لا يُعتمد تلقائياً — يبقى بحالة "مقترح" إلى أن يعتمده المفتش نفسه)
apiRouter.post('/db/annual-plans', async (req, res) => {
  const parsed = annualPlanUpsertSchema.safeParse(req.body.annualPlan);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'بيانات غير صحيحة.' });
  }
  const { teacherId, academicYearId, levelId, kind, data } = parsed.data;
  const user = req.user!;

  let status = 'draft';
  let proposedByInspectorId: string | null = null;

  if (user.role === 'teacher') {
    if (teacherId !== user.id) {
      return res.status(403).json({ error: 'لا يمكنك تعديل مخطط أستاذ آخر.' });
    }
  } else if (user.role === 'inspector') {
    if (!(await isInspectorOfTeacher(user.id, teacherId))) {
      return res
        .status(403)
        .json({ error: 'هذا الأستاذ ليس ضمن مقاطعتك، لا يمكنك اقتراح مخطط له.' });
    }
    status = 'proposed';
    proposedByInspectorId = user.id;
  } else if (user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك الصلاحية لهذا الإجراء.' });
  }

  const existing = await prisma.annualPlan.findUnique({
    where: { teacherId_academicYearId_levelId_kind: { teacherId, academicYearId, levelId, kind } },
  });

  // الأستاذ يعدّل مسودته الخاصة فقط؛ إن كان هناك اقتراح من المفتش (معتمد أو قيد الاعتماد)
  // لا يمكنه الكتابة فوقه مباشرة
  if (existing && user.role === 'teacher' && existing.status !== 'draft') {
    return res
      .status(409)
      .json({ error: 'يوجد اقتراح من المفتش على هذا المخطط، راجعه أولاً قبل التعديل.' });
  }

  const saved = await prisma.annualPlan.upsert({
    where: { teacherId_academicYearId_levelId_kind: { teacherId, academicYearId, levelId, kind } },
    create: {
      id: parsed.data.id || `ap_${teacherId}_${kind}_${levelId}_${academicYearId}_${Date.now()}`,
      teacherId,
      academicYearId,
      levelId,
      kind,
      status,
      proposedByInspectorId,
      data,
    },
    update: {
      status,
      proposedByInspectorId,
      data,
      ...(status === 'draft' ? { approvedAt: null } : {}),
    },
  });

  res.json({ success: true, annualPlan: saved });
});

// اعتماد المفتش لاقتراحه الخاص فيصبح نافذاً عند الأستاذ (لا يمكن لمفتش اعتماد اقتراح مفتش آخر)
apiRouter.post('/db/annual-plans/:id/approve', requireRole('inspector'), async (req, res) => {
  const existing = await prisma.annualPlan.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'السجل غير موجود.' });
  if (existing.proposedByInspectorId !== req.user!.id) {
    return res.status(403).json({ error: 'لا يمكنك اعتماد اقتراح لم تقدّمه أنت.' });
  }
  const saved = await prisma.annualPlan.update({
    where: { id: existing.id },
    data: { status: 'approved', approvedAt: new Date() },
  });
  res.json({ success: true, annualPlan: saved });
});

apiRouter.delete('/db/annual-plans/:id', async (req, res) => {
  try {
    const existing = await prisma.annualPlan.findUnique({ where: { id: req.params.id } });
    if (existing) {
      const user = req.user!;
      const canDelete =
        user.role === 'admin' ||
        existing.teacherId === user.id ||
        existing.proposedByInspectorId === user.id;
      if (!canDelete) return res.status(403).json({ error: 'لا تملك الصلاحية لحذف هذا السجل.' });
      await prisma.annualPlan.delete({ where: { id: existing.id } });
    }
  } catch {
    // غير موجود مسبقاً
  }
  res.json({ success: true });
});

// -----------------------------------------------------------------------
// AI Endpoints — تتطلب الآن جلسة صالحة (لم تعد مفتوحة للعموم بدون قيد)
// -----------------------------------------------------------------------

apiRouter.get('/admin/generation/config', requireRole('admin'), async (_req, res) => {
  const config = await prisma.generationServiceConfig.findUnique({ where: { id: 'default' } });
  const providers = await getConfiguredAIProviders();
  const configured = providers.some(
    (provider) =>
      provider.enabled &&
      (provider.keyConfigured ||
        provider.type === 'ollama' ||
        (provider.type === 'openai-compatible' && Boolean(provider.baseUrl)))
  );
  res.json({
    success: true,
    generationEnabled: config?.enabled ?? true,
    providerConfigured: configured,
    platformFallbackConfigured: providers.some(
      (provider) => provider.type === 'gemini' && provider.enabled && provider.keyConfigured
    ),
    providers: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      keyConfigured: provider.keyConfigured,
      source: provider.source,
    })),
  });
});

apiRouter.get('/admin/generation/overview', requireRole('admin'), async (_req, res) => {
  try {
    const [config, providers, users, accessRows] = await Promise.all([
      prisma.generationServiceConfig.findUnique({ where: { id: 'default' } }),
      allAIProviderRecords(),
      prisma.user.findMany({
        where: { role: { in: ['teacher', 'inspector', 'director', 'admin'] } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          isApprovedByAdmin: true,
        },
        orderBy: [{ role: 'asc' }, { firstName: 'asc' }, { lastName: 'asc' }],
      }),
      prisma.userGenerationAccess.findMany({
        select: {
          userId: true,
          enabled: true,
          assistantEnabled: true,
          gameSuggestionsEnabled: true,
          provider: true,
          credentialEnabled: true,
          encryptedApiKey: true,
          updatedAt: true,
        },
      }),
    ]);
    const accessByUser = new Map(accessRows.map((row) => [row.userId, row]));
    const safeProviders = providers.map(({ apiKey: _apiKey, ...provider }) => provider);
    const geminiFallback = providers.some(
      (provider) => provider.type === 'gemini' && providerIsUsable(provider)
    );
    res.json({
      success: true,
      generationEnabled: config?.enabled ?? true,
      providerConfigured: providers.some(providerIsUsable),
      platformFallbackConfigured: geminiFallback,
      providers: safeProviders,
      accounts: users.map((user) => {
        const row = accessByUser.get(user.id);
        return {
          ...user,
          access: row
            ? {
                userId: row.userId,
                enabled: row.enabled,
                assistantEnabled: row.assistantEnabled,
                gameSuggestionsEnabled: row.gameSuggestionsEnabled,
                provider: row.provider,
                credentialEnabled: row.credentialEnabled,
                keyConfigured: Boolean(row.encryptedApiKey),
                updatedAt: row.updatedAt,
              }
            : null,
        };
      }),
    });
  } catch {
    res.status(500).json({ error: 'تعذر تحميل حالة الخدمات.' });
  }
});
apiRouter.put('/admin/generation/config', requireRole('admin'), async (req, res) => {
  const enabled = req.body?.enabled === true;
  const config = await prisma.generationServiceConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', enabled, updatedById: req.user!.id },
    update: { enabled, updatedById: req.user!.id },
  });
  res.json({ success: true, generationEnabled: config.enabled, updatedAt: config.updatedAt });
});

apiRouter.get('/admin/generation/access', requireRole('admin'), async (_req, res) => {
  const rows = await prisma.userGenerationAccess.findMany({
    select: {
      userId: true,
      enabled: true,
      assistantEnabled: true,
      gameSuggestionsEnabled: true,
      provider: true,
      credentialEnabled: true,
      encryptedApiKey: true,
      updatedAt: true,
    },
  });
  const access = rows.map(({ encryptedApiKey, ...row }) => ({
    ...row,
    keyConfigured: Boolean(encryptedApiKey),
  }));
  res.json({ success: true, access });
});

apiRouter.put('/admin/generation/access/:userId', requireRole('admin'), async (req, res) => {
  const target = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { id: true },
  });
  if (!target) return res.status(404).json({ error: 'الحساب غير موجود.' });
  const enabled = req.body?.enabled === true;
  const assistantEnabled = enabled && req.body?.assistantEnabled === true;
  const gameSuggestionsEnabled = enabled && req.body?.gameSuggestionsEnabled === true;
  const existing = await prisma.userGenerationAccess.findUnique({ where: { userId: target.id } });
  let encryptedApiKey = existing?.encryptedApiKey ?? null;
  if (req.body?.clearKey === true) encryptedApiKey = null;
  if (typeof req.body?.apiKey === 'string') {
    const raw = req.body.apiKey.trim();
    encryptedApiKey = raw ? encryptApiKey(raw) : null;
  }
  const credentialEnabled = Boolean(encryptedApiKey) && req.body?.credentialEnabled === true;
  const access = await prisma.userGenerationAccess.upsert({
    where: { userId: target.id },
    create: {
      userId: target.id,
      enabled,
      assistantEnabled,
      gameSuggestionsEnabled,
      provider: 'gemini',
      encryptedApiKey,
      credentialEnabled,
      updatedById: req.user!.id,
      updatedByAdminId: req.user!.id,
    },
    update: {
      enabled,
      assistantEnabled,
      gameSuggestionsEnabled,
      encryptedApiKey,
      credentialEnabled,
      provider: 'gemini',
      updatedById: req.user!.id,
      updatedByAdminId: req.user!.id,
    },
  });
  res.json({
    success: true,
    access: {
      userId: access.userId,
      enabled: access.enabled,
      assistantEnabled: access.assistantEnabled,
      gameSuggestionsEnabled: access.gameSuggestionsEnabled,
      provider: access.provider,
      credentialEnabled: access.credentialEnabled,
      keyConfigured: Boolean(access.encryptedApiKey),
      updatedAt: access.updatedAt,
    },
  });
});

apiRouter.post('/admin/generation/access/:userId/test', requireRole('admin'), async (req, res) => {
  try {
    const personal = await resolvePersonalGenerationCredential(req.params.userId);
    if (!personal)
      return res
        .status(200)
        .json({ success: false, message: 'لا يوجد مفتاح خاص صالح لهذا الحساب.' });
    const { generateAIWithUserCredential } = await import('./aiGateway.js');
    await generateAIWithUserCredential(
      { messages: [{ role: 'user', content: 'أجب بكلمة: تم' }], maxTokens: 8, temperature: 0 },
      personal
    );
    res.json({ success: true, message: 'تم التحقق من مفتاح الحساب بنجاح.' });
  } catch {
    res.json({ success: false, message: 'تعذر الاتصال بالخدمة باستخدام بيانات هذا الحساب.' });
  }
});

apiRouter.post('/admin/generation/fallback/test', requireRole('admin'), async (_req, res) => {
  try {
    const fallback = await resolvePlatformFallbackCredential();
    if (!fallback) return res.json({ success: false, message: 'لا يوجد مفتاح احتياطي صالح.' });
    const { generateAIWithUserCredential } = await import('./aiGateway.js');
    await generateAIWithUserCredential(
      { messages: [{ role: 'user', content: 'أجب بكلمة: تم' }], maxTokens: 8, temperature: 0 },
      fallback
    );
    res.json({ success: true, message: 'تم التحقق من المفتاح الاحتياطي بنجاح.' });
  } catch {
    res.json({ success: false, message: 'تعذر الاتصال بالمفتاح الاحتياطي.' });
  }
});

apiRouter.get('/ai/providers', requireRole('admin'), async (_req, res) => {
  try {
    res.json({ success: true, providers: await getConfiguredAIProviders() });
  } catch {
    res.json({ success: true, providers: [] });
  }
});

apiRouter.post('/ai/test-provider', requireRole('admin'), async (req, res) => {
  try {
    const provider = req.body.provider;
    if (!provider) {
      return res.status(400).json({ valid: false, message: 'مزود غير معروف.' });
    }
    res.json(await testConfiguredAIProvider(provider));
  } catch {
    res.status(500).json({ valid: false, message: 'حدث خطأ أثناء اختبار مزود الذكاء الاصطناعي.' });
  }
});

// -----------------------------------------------------------------------
// إدارة مزودات الذكاء الاصطناعي المخصصة (مقتصرة على مشرف المنظومة)
// يُخزَّن المفتاح مشفّراً في قاعدة البيانات ولا يُعاد أبداً إلى الواجهة.
// -----------------------------------------------------------------------
const AI_PROVIDER_TYPES: AIProviderType[] = [
  'openai-compatible',
  'openai',
  'nvidia',
  'anthropic',
  'gemini',
  'ollama',
];
const AI_TYPES_REQUIRING_BASE_URL: AIProviderType[] = [
  'openai-compatible',
  'openai',
  'nvidia',
  'ollama',
];

function validateAIProviderInput(input: Record<string, unknown>):
  | {
      ok: true;
      data: {
        name: string;
        type: AIProviderType;
        baseUrl?: string;
        model?: string;
        enabled: boolean;
        sortOrder: number;
      };
    }
  | { ok: false; message: string } {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const type = input.type as AIProviderType;
  const baseUrl = typeof input.baseUrl === 'string' ? input.baseUrl.trim() : undefined;
  const model = typeof input.model === 'string' ? input.model.trim() : undefined;
  const enabled = input.enabled !== false;
  const sortOrder = typeof input.sortOrder === 'number' ? input.sortOrder : 0;

  if (!name) return { ok: false, message: 'اسم المزود مطلوب.' };
  if (!AI_PROVIDER_TYPES.includes(type)) return { ok: false, message: 'نوع المزود غير معروف.' };
  if (AI_TYPES_REQUIRING_BASE_URL.includes(type) && !baseUrl) {
    return { ok: false, message: 'رابط الخادم (Base URL) مطلوب لهذا النوع من المزودات.' };
  }
  return { ok: true, data: { name, type, baseUrl, model, enabled, sortOrder } };
}

apiRouter.post('/ai/providers', requireRole('admin'), async (req, res) => {
  try {
    const validated = validateAIProviderInput(req.body || {});
    if (!('data' in validated)) {
      return res.status(400).json({ error: validated.message });
    }

    const rawKey = typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const created = await prisma.aIProviderConfig.create({
      data: {
        name: validated.data.name,
        type: validated.data.type,
        baseUrl: validated.data.baseUrl,
        model: validated.data.model,
        enabled: validated.data.enabled,
        sortOrder: validated.data.sortOrder,
        encryptedApiKey: rawKey ? encryptApiKey(rawKey) : null,
      },
    });
    invalidateAIProviderCache();
    res.json({
      success: true,
      provider: {
        id: created.id,
        name: created.name,
        type: created.type,
        baseUrl: created.baseUrl,
        model: created.model,
        enabled: created.enabled,
        sortOrder: created.sortOrder,
        source: 'db',
        keyConfigured: Boolean(rawKey),
      },
    });
  } catch (error) {
    console.error('Error creating AI provider:', error);
    res.status(500).json({ error: 'تعذّر حفظ المزود. تأكد من اتصال قاعدة البيانات.' });
  }
});

apiRouter.put('/ai/providers/:id', requireRole('admin'), async (req, res) => {
  try {
    const existing = await prisma.aIProviderConfig.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'المزود غير موجود.' });

    const validated = validateAIProviderInput(req.body || {});
    if (!('data' in validated)) {
      return res.status(400).json({ error: validated.message });
    }

    // فقط عند إرسال مفتاح جديد يُحدَّث؛ إرسال string فارغ يمسحه، وعدمه يبقي القديم
    let encryptedApiKey = existing.encryptedApiKey;
    if (typeof req.body.apiKey === 'string') {
      const rawKey = req.body.apiKey.trim();
      encryptedApiKey = rawKey ? encryptApiKey(rawKey) : null;
    }

    const updated = await prisma.aIProviderConfig.update({
      where: { id: req.params.id },
      data: {
        name: validated.data.name,
        type: validated.data.type,
        baseUrl: validated.data.baseUrl,
        model: validated.data.model,
        enabled: validated.data.enabled,
        sortOrder: validated.data.sortOrder,
        encryptedApiKey,
      },
    });
    invalidateAIProviderCache();
    res.json({
      success: true,
      provider: {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        baseUrl: updated.baseUrl,
        model: updated.model,
        enabled: updated.enabled,
        sortOrder: updated.sortOrder,
        source: 'db',
        keyConfigured: Boolean(encryptedApiKey),
      },
    });
  } catch (error) {
    console.error('Error updating AI provider:', error);
    res.status(500).json({ error: 'تعذّر تحديث المزود. تأكد من اتصال قاعدة البيانات.' });
  }
});

apiRouter.delete('/ai/providers/:id', requireRole('admin'), async (req, res) => {
  try {
    const existing = await prisma.aIProviderConfig.findUnique({ where: { id: req.params.id } });
    if (existing) {
      await prisma.aIProviderConfig.delete({ where: { id: req.params.id } });
    }
    invalidateAIProviderCache();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    res.status(500).json({ error: 'تعذّر حذف المزود. تأكد من اتصال قاعدة البيانات.' });
  }
});

apiRouter.post('/ai/providers/:id/test', requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const records = await allAIProviderRecords();
    const exists = records.some((p) => p.id === id);
    if (!exists) return res.status(404).json({ valid: false, message: 'المزود غير موجود.' });
    res.json(await testConfiguredAIProvider(id));
  } catch {
    res.status(500).json({ valid: false, message: 'حدث خطأ أثناء اختبار المزود.' });
  }
});

apiRouter.post('/ai/generate-lesson', async (req, res) => {
  try {
    const credential = await requireGenerationAccess(req, res, 'LESSON_GENERATION');
    if (!credential) return;
    const {
      levelName,
      fieldName,
      competencyTitle,
      segmentTitle,
      sessionTitle,
      sessionType,
      customObjective,
      customEquipment,
      teacherName,
      institutionName,
      preferredProvider,
      preferredModel,
    } = req.body;

    if (!sessionTitle || !fieldName) {
      return res.status(400).json({ error: 'عناصر الحصة والميدان مطلوبة لتوليد المذكرة' });
    }

    const lessonData = await generatePELessonPlan(
      {
        levelName: levelName || 'السنة الأولى ابتدائي',
        fieldName: fieldName || 'الميدان البدني',
        competencyTitle: competencyTitle || 'الكفاءة الختامية للميدان',
        segmentTitle: segmentTitle || 'المقطع التعليمي',
        sessionTitle,
        sessionType,
        customObjective,
        customEquipment,
        teacherName,
        institutionName,
        preferredProvider,
        preferredModel,
      },
      credential
    );

    res.json({ success: true, data: lessonData });
  } catch (error: unknown) {
    console.error('Error in /ai/generate-lesson:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء توليد المذكرة، يرجى المحاولة لاحقاً.' });
  }
});

apiRouter.post('/ai/improve-wording', async (req, res) => {
  try {
    const credential = await requireGenerationAccess(req, res, 'IMPROVE_WORDING');
    if (!credential) return;
    const { fieldLabel, currentText, context, preferredProvider, preferredModel } = req.body;

    if (!fieldLabel || !currentText || typeof currentText !== 'string' || !currentText.trim()) {
      return res.status(400).json({ error: 'النص الحالي واسم الحقل مطلوبان لتحسين الصياغة' });
    }

    const result = await improvePELessonWording(
      {
        fieldLabel,
        currentText,
        context,
        preferredProvider,
        preferredModel,
      },
      credential
    );
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('Error in /ai/improve-wording:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحسين الصياغة، يرجى المحاولة لاحقاً.' });
  }
});

apiRouter.post('/ai/suggest-games', async (req, res) => {
  try {
    const credential = await requireGenerationAccess(req, res, 'SUGGEST_GAMES');
    if (!credential) return;
    const {
      fieldName,
      levelName,
      objective,
      existingGames,
      existingSituations,
      constraints,
      preferredProvider,
      preferredModel,
    } = req.body;
    const games = await suggestPEGames(
      fieldName || 'الميدان الجماعي',
      levelName || 'ابتدائي',
      preferredProvider,
      preferredModel,
      { objective, existingGames, existingSituations, constraints },
      credential
    );
    res.json({ success: true, games });
  } catch (error: unknown) {
    console.error('Error in /ai/suggest-games:', error);
    res.status(500).json({ error: 'خطأ في اقتراح الألعاب، يرجى المحاولة لاحقاً.' });
  }
});

apiRouter.post('/ai/chat', async (req, res) => {
  try {
    const credential = await requireGenerationAccess(req, res, 'ASSISTANT');
    if (!credential) return;
    const { message, history, preferredProvider, preferredModel } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }
    const responseText = await generateAIChatResponse(
      message,
      history || [],
      preferredProvider,
      preferredModel,
      credential
    );
    res.json({ success: true, response: responseText });
  } catch (error: unknown) {
    console.error('Error in /ai/chat:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء المحادثة، يرجى المحاولة لاحقاً.' });
  }
});
