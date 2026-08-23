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
import {
  resolveGenerationCredential,
  resolvePersonalGenerationCredential,
  resolvePlatformFallbackCredential,
  type GenerationFeature,
} from './generationAccess.js';
import {
  parseStudentRosterWorkbook,
  rosterPreviewSummary,
  type ParsedRosterStudent,
} from '../services/studentRosterImport.service.js';

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
  const counts = new Map<string, number>();
  students.forEach((student) =>
    counts.set(student.classId, (counts.get(student.classId) || 0) + 1)
  );
  res.json({
    success: true,
    classes: classes.map((item) => ({
      id: item.id,
      institutionId: item.institutionId || '',
      teacherId: item.teacherId,
      levelId: item.levelId,
      name: item.name,
      studentCount: counts.get(item.id) || 0,
    })),
    students: students.map((item) => ({
      id: item.id,
      classId: item.classId,
      firstName: item.firstName,
      lastName: item.lastName,
      gender: 'ذكر',
      birthDate: item.birthDate?.toISOString().slice(0, 10),
      registrationNumber: item.matricule,
      matricule: item.matricule,
      grade: item.grade,
      schoolYear: item.schoolYear,
    })),
  });
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
  const validRows = rows.filter(
    (row) =>
      row &&
      typeof row.matricule === 'string' &&
      row.matricule.trim() &&
      row.firstName?.trim() &&
      row.lastName?.trim()
  );
  // Normalize and de-duplicate before opening the transaction.  This keeps all
  // parsing/validation work outside the database transaction and also prevents
  // duplicate matricules in one workbook from creating extra writes.
  const normalizedRows = new Map<string, ParsedRosterStudent>();
  let inputConflicts = 0;
  for (const row of validRows) {
    const matricule = row.matricule.trim();
    const normalized = { ...row, matricule, firstName: row.firstName.trim(), lastName: row.lastName.trim() };
    const previous = normalizedRows.get(matricule);
    if (previous) {
      if (previous.firstName !== normalized.firstName || previous.lastName !== normalized.lastName) inputConflicts += 1;
      continue;
    }
    normalizedRows.set(matricule, normalized);
  }
  const importRows = [...normalizedRows.values()];
  try {
    const summary = await prisma.$transaction(async (tx) => {
      const assignedClass = await tx.studentClass.findUnique({ where: { id: classId } });
      if (assignedClass && assignedClass.teacherId !== req.user!.id)
        throw new Error('UNAUTHORIZED_CLASS');
      if (!assignedClass)
        await tx.studentClass.create({
          data: { id: classId, teacherId: req.user!.id, institutionId, levelId, name: className },
        });
      else if (
        assignedClass.name !== className &&
        new RegExp(`^${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:مادة|المادة|الفصل|السنة\\s+الدراسية)\\s*[:：-]?`, 'i').test(assignedClass.name)
      ) {
        // Compatibility for classes created by the old parser: only normalize
        // when the malformed value is deterministically the same class.
        await tx.studentClass.update({ where: { id: classId }, data: { name: className } });
      }
      const matricules = importRows.map((row) => row.matricule);
      // One bulk lookup replaces the former findFirst-per-student N+1 pattern.
      const existingStudents = matricules.length
        ? await tx.student.findMany({ where: { institutionId, matricule: { in: matricules } } })
        : [];
      const existingByMatricule = new Map(existingStudents.map((student) => [student.matricule, student]));
      const missingRows: ParsedRosterStudent[] = [];
      let existing = 0;
      let conflicts = inputConflicts;
      let linkedStudents = 0;
      const updates: Promise<unknown>[] = [];
      for (const row of importRows) {
        const current = existingByMatricule.get(row.matricule);
        if (!current) {
          missingRows.push(row);
          continue;
        }
        if (current.firstName !== row.firstName || current.lastName !== row.lastName) {
          conflicts += 1;
          continue;
        }
        existing += 1;
        if (current.teacherId === req.user!.id && current.classId !== classId) {
          updates.push(tx.student.update({
            where: { id: current.id },
            data: { classId, grade: grade || row.grade || null, groupName: row.groupName || null },
          }));
        }
        linkedStudents += 1;
      }
      if (updates.length) await Promise.all(updates);
      if (missingRows.length) {
        await tx.student.createMany({
          data: missingRows.map((row, index) => ({
            id: `std_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
            teacherId: req.user!.id,
            institutionId,
            classId,
            matricule: row.matricule,
            firstName: row.firstName,
            lastName: row.lastName,
            birthDate: row.birthDate ? new Date(row.birthDate) : null,
            grade: grade || row.grade || null,
            groupName: row.groupName || null,
            schoolYear: row.schoolYear || null,
          })),
        });
      }
      const created = missingRows.length;
      linkedStudents += created;
      return {
        created,
        existing,
        linkedStudents,
        conflicts,
        review: rows.length - validRows.length,
      };
    }, { maxWait: 10000, timeout: 25000 });
    res.json({ success: true, classId, summary });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_CLASS')
      return res.status(403).json({ error: 'لا تملك صلاحية الاستيراد إلى هذا القسم.' });
    if ((error as { code?: string })?.code === 'P2021') {
      console.error('Student roster schema is missing (P2021):', error);
      return res.status(503).json({ error: 'قاعدة بيانات قوائم التلاميذ غير مهيأة بعد. يرجى تحديث المنصة.' });
    }
    if ((error as { code?: string })?.code === 'P2028') {
      console.error('Student roster import transaction timed out (P2028):', error);
      return res.status(504).json({ error: 'استغرقت عملية حفظ القائمة وقتاً أطول من المتوقع. يرجى إعادة المحاولة.' });
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
apiRouter.get('/admin/users/pending', requireRole('admin'), async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ['teacher', 'inspector'] }, OR: [{ status: 'pending_approval' }, { isApprovedByAdmin: false }] },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, users: users.map((user) => sanitizeUser(user)) });
});

apiRouter.get('/admin/users', requireRole('admin'), async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, users: users.map((user) => sanitizeUser(user)) });
});

apiRouter.post('/admin/users/:id/activate', requireRole('admin'), async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'الحساب غير موجود.' });
  if (existing.role === 'admin') return res.status(403).json({ error: 'لا يمكن تفعيل حساب مشرف من هذا المسار.' });
  if (existing.role === 'inspector') {
    const assignment = { role: existing.role, directorateId: existing.directorateId, districtId: existing.districtId };
    try {
      await enforceRoleAssignment(assignment, existing);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'يرجى استكمال مديرية ومقاطعة المفتش.' });
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

    const existing = await model.findUnique({ where: { id: item.id } });
    if (!canWrite(existing, req.user!)) {
      return res.status(403).json({ error: 'لا تملك الصلاحية لتعديل هذا العنصر.' });
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
  const visit = (req.body?.visit && typeof req.body.visit === 'object' ? req.body.visit : req.body) as Record<string, unknown>;
  const teacherId = typeof visit.teacherId === 'string' ? visit.teacherId : '';
  if (!teacherId) return res.status(400).json({ error: 'المعلم مطلوب.' });
  const assignment = await prisma.inspectorAssignment.findUnique({ where: { teacherId } });
  if (!assignment || assignment.inspectorId !== req.user!.id || !['Active', 'Changed'].includes(assignment.status)) {
    return res.status(403).json({ error: 'لا تملك صلاحية تسجيل زيارة لهذا الأستاذ.' });
  }
  const id = typeof visit.id === 'string' && visit.id.trim() ? visit.id : `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = await prisma.inspectionVisitRecord.create({
    data: { id, inspectorId: req.user!.id, teacherId, institutionId: typeof visit.institutionId === 'string' ? visit.institutionId : null, data: visit as any },
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

apiRouter.get('/db/annual-plans', async (req, res) => {
  const { teacherId, kind, academicYearId, levelId } = req.query;
  const user = req.user!;

  const where: Record<string, unknown> = {};
  if (kind) where.kind = String(kind);
  if (academicYearId) where.academicYearId = String(academicYearId);
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
  academicYearId: z.string().min(1),
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
