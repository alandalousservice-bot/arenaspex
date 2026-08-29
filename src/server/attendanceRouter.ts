import { Router } from 'express';
import { z } from 'zod';
import { prisma } from './prismaClient.js';
import { requireRole } from './middleware/requireAuth.js';

export const teacherAttendanceRouter = Router();

const attendanceStatusSchema = z.enum(['حاضر', 'غائب', 'غائب بمبرر', 'معفى']);
const attendanceBatchSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        status: attendanceStatusSchema,
        note: z.string().max(1000).nullable().optional(),
      })
    )
    .max(1000),
});
const medicalExemptionCreateSchema = z
  .object({
    studentId: z.string().trim().min(1),
    issuedOn: z.coerce.date(),
    expiresOn: z.coerce.date().nullable().optional(),
    reason: z.string().max(500).nullable().optional(),
    note: z.string().max(1000).nullable().optional(),
  })
  .refine((value) => !value.expiresOn || value.expiresOn >= value.issuedOn, {
    message: 'تاريخ انتهاء الإعفاء يجب أن يكون بعد تاريخ إصداره.',
  });

const medicalExemptionUpdateSchema = z.object({
  issuedOn: z.coerce.date().optional(),
  expiresOn: z.coerce.date().nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});
const attendanceSummaryQuerySchema = z.object({
  classId: z.string().trim().min(1),
  academicYearId: z.string().trim().min(1),
});
async function ownedPlannedSession(sessionId: string, teacherId: string) {
  return prisma.classPlannedSession.findFirst({ where: { id: sessionId, teacherId } });
}

function activeExemptionForDate(
  exemptions: Array<{ studentId: string; issuedOn: Date; expiresOn: Date | null }>,
  studentId: string,
  date: Date
) {
  return exemptions.find(
    (item) =>
      item.studentId === studentId &&
      item.issuedOn <= date &&
      (!item.expiresOn || item.expiresOn >= date)
  );
}

function exemptionView(row: {
  id: string;
  studentId: string;
  issuedOn: Date;
  expiresOn: Date | null;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: { id: string; firstName: string; lastName: string };
}) {
  return {
    id: row.id,
    studentId: row.studentId,
    student: row.student,
    issuedOn: row.issuedOn.toISOString(),
    expiresOn: row.expiresOn?.toISOString() || null,
    reason: row.reason,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

teacherAttendanceRouter.get(
  '/teacher/planned-sessions/:sessionId/attendance',
  requireRole('teacher'),
  async (req, res) => {
    const session = await ownedPlannedSession(req.params.sessionId, req.user!.id);
    if (!session) return res.status(404).json({ error: 'الحصة التشغيلية غير موجودة ضمن سجلاتك.' });
    const students = await prisma.student.findMany({
      where: { teacherId: req.user!.id, classId: session.classId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const [attendance, exemptions] = await Promise.all([
      prisma.studentAttendance.findMany({ where: { classPlannedSessionId: session.id } }),
      prisma.medicalExemption.findMany({
        where: {
          teacherId: req.user!.id,
          studentId: { in: students.map((student) => student.id) },
        },
        orderBy: [{ issuedOn: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const attendanceByStudent = new Map(attendance.map((record) => [record.studentId, record]));
    res.json({
      success: true,
      session: {
        id: session.id,
        classId: session.classId,
        academicYearId: session.academicYearId,
        plannedDate: session.plannedDate.toISOString(),
      },
      students: students.map((student) => {
        const record = attendanceByStudent.get(student.id);
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          attendance: record
            ? {
                id: record.id,
                status: record.status,
                note: record.note,
                recordedAt: record.recordedAt?.toISOString() || null,
              }
            : null,
          medicallyExempt: Boolean(
            activeExemptionForDate(exemptions, student.id, session.plannedDate)
          ),
        };
      }),
    });
  }
);

teacherAttendanceRouter.put(
  '/teacher/planned-sessions/:sessionId/attendance',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = attendanceBatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'بيانات الحضور غير صحيحة.' });
    const session = await ownedPlannedSession(req.params.sessionId, req.user!.id);
    if (!session) return res.status(404).json({ error: 'الحصة التشغيلية غير موجودة ضمن سجلاتك.' });
    const studentIds = parsed.data.records.map((record) => record.studentId);
    if (new Set(studentIds).size !== studentIds.length)
      return res.status(400).json({ error: 'لا يجوز تكرار التلميذ في نفس الحفظ الجماعي.' });
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, teacherId: req.user!.id, classId: session.classId },
      select: { id: true },
    });
    if (students.length !== studentIds.length)
      return res.status(403).json({ error: 'يتضمن الحفظ تلميذاً خارج القسم المحدد.' });
    const exemptions = await prisma.medicalExemption.findMany({
      where: { teacherId: req.user!.id, studentId: { in: studentIds } },
      select: { studentId: true, issuedOn: true, expiresOn: true },
    });
    for (const record of parsed.data.records) {
      const exempt = Boolean(
        activeExemptionForDate(exemptions, record.studentId, session.plannedDate)
      );
      if (exempt && record.status !== 'معفى')
        return res
          .status(409)
          .json({ error: 'التلميذ المعفى طبياً يجب أن يسجل «معفى» في هذه الحصة.' });
      if (!exempt && record.status === 'معفى')
        return res
          .status(409)
          .json({ error: 'لا يمكن تسجيل «معفى» دون إعفاء طبي نشط بتاريخ الحصة.' });
    }
    const recordedAt = new Date();
    await prisma.$transaction(
      parsed.data.records.map((record) =>
        prisma.studentAttendance.upsert({
          where: {
            classPlannedSessionId_studentId: {
              classPlannedSessionId: session.id,
              studentId: record.studentId,
            },
          },
          create: {
            id: `attendance_${session.id}_${record.studentId}`,
            teacherId: req.user!.id,
            classId: session.classId,
            studentId: record.studentId,
            classPlannedSessionId: session.id,
            academicYearId: session.academicYearId,
            status: record.status,
            note: record.note ?? null,
            recordedAt,
          },
          update: { status: record.status, note: record.note ?? null, recordedAt },
        })
      )
    );
    const saved = await prisma.studentAttendance.findMany({
      where: { classPlannedSessionId: session.id },
      orderBy: { studentId: 'asc' },
    });
    res.json({
      success: true,
      records: saved.map((record) => ({
        ...record,
        recordedAt: record.recordedAt?.toISOString() || null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })),
    });
  }
);

teacherAttendanceRouter.get(
  '/teacher/students/:studentId/attendance-summary',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = attendanceSummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'القسم والسنة الدراسية مطلوبان.' });
    const student = await prisma.student.findFirst({
      where: { id: req.params.studentId, teacherId: req.user!.id, classId: parsed.data.classId },
      select: { id: true },
    });
    if (!student) return res.status(403).json({ error: 'التلميذ غير موجود ضمن القسم المحدد.' });
    const records = await prisma.studentAttendance.findMany({
      where: {
        teacherId: req.user!.id,
        studentId: student.id,
        classId: parsed.data.classId,
        academicYearId: parsed.data.academicYearId,
      },
      select: { status: true },
    });
    const counts = records.reduce<Record<string, number>>((result, record) => {
      const status = record.status || 'غير مسجل';
      result[status] = (result[status] || 0) + 1;
      return result;
    }, {});
    res.json({ success: true, totalRecorded: records.length, counts });
  }
);

teacherAttendanceRouter.get(
  '/teacher/classes/:classId/exemptions',
  requireRole('teacher'),
  async (req, res) => {
    const classRecord = await prisma.studentClass.findFirst({
      where: { id: req.params.classId, teacherId: req.user!.id },
    });
    if (!classRecord) return res.status(404).json({ error: 'القسم غير موجود ضمن أقسامك.' });
    const rows = await prisma.medicalExemption.findMany({
      where: {
        teacherId: req.user!.id,
        student: { classId: classRecord.id, teacherId: req.user!.id },
      },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ issuedOn: 'desc' }, { id: 'desc' }],
    });
    res.json({ success: true, exemptions: rows.map(exemptionView) });
  }
);

teacherAttendanceRouter.post(
  '/teacher/classes/:classId/exemptions',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = medicalExemptionCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'بيانات الإعفاء الطبي غير صحيحة.' });
    const classRecord = await prisma.studentClass.findFirst({
      where: { id: req.params.classId, teacherId: req.user!.id },
    });
    if (!classRecord) return res.status(404).json({ error: 'القسم غير موجود ضمن أقسامك.' });
    const student = await prisma.student.findFirst({
      where: { id: parsed.data.studentId, classId: classRecord.id, teacherId: req.user!.id },
    });
    if (!student) return res.status(403).json({ error: 'التلميذ غير موجود ضمن القسم المحدد.' });
    const row = await prisma.medicalExemption.create({
      data: {
        id: `medical_exemption_${Date.now()}_${student.id}`,
        teacherId: req.user!.id,
        studentId: student.id,
        issuedOn: parsed.data.issuedOn,
        expiresOn: parsed.data.expiresOn ?? null,
        reason: parsed.data.reason ?? null,
        note: parsed.data.note ?? null,
      },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.status(201).json({ success: true, exemption: exemptionView(row) });
  }
);

teacherAttendanceRouter.put(
  '/teacher/exemptions/:exemptionId',
  requireRole('teacher'),
  async (req, res) => {
    const parsed = medicalExemptionUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'بيانات الإعفاء الطبي غير صحيحة.' });
    const existing = await prisma.medicalExemption.findFirst({
      where: { id: req.params.exemptionId, teacherId: req.user!.id },
      include: { student: true },
    });
    if (!existing || existing.student.teacherId !== req.user!.id)
      return res.status(404).json({ error: 'الإعفاء الطبي غير موجود ضمن سجلاتك.' });
    const update: {
      issuedOn?: Date;
      expiresOn?: Date | null;
      reason?: string | null;
      note?: string | null;
    } = {};
    if (parsed.data.issuedOn !== undefined) update.issuedOn = parsed.data.issuedOn;
    if (parsed.data.expiresOn !== undefined) update.expiresOn = parsed.data.expiresOn;
    if (parsed.data.reason !== undefined) update.reason = parsed.data.reason;
    if (parsed.data.note !== undefined) update.note = parsed.data.note;
    const issuedOn = update.issuedOn || existing.issuedOn;
    const expiresOn = update.expiresOn === undefined ? existing.expiresOn : update.expiresOn;
    if (expiresOn && expiresOn < issuedOn)
      return res.status(400).json({ error: 'تاريخ انتهاء الإعفاء يجب أن يكون بعد تاريخ إصداره.' });
    const row = await prisma.medicalExemption.update({
      where: { id: existing.id },
      data: update,
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json({ success: true, exemption: exemptionView(row) });
  }
);

teacherAttendanceRouter.delete(
  '/teacher/exemptions/:exemptionId',
  requireRole('teacher'),
  async (req, res) => {
    const existing = await prisma.medicalExemption.findFirst({
      where: { id: req.params.exemptionId, teacherId: req.user!.id },
      include: { student: { select: { teacherId: true } } },
    });
    if (!existing || existing.student.teacherId !== req.user!.id)
      return res.status(404).json({ error: 'الإعفاء الطبي غير موجود ضمن سجلاتك.' });
    await prisma.medicalExemption.delete({ where: { id: existing.id } });
    res.json({ success: true });
  }
);
