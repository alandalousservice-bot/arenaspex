import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from './prismaClient.js';
import { requireRole } from './middleware/requireAuth.js';
import { AUDIT_EVENT_LABELS } from '../types/audit.js';
export const auditRouter = Router();
auditRouter.use('/admin/audit-events', requireRole('admin'));
const query = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    eventType: z
      .string()
      .refine((v) => !v || v in AUDIT_EVENT_LABELS)
      .optional(),
    actor: z.string().trim().max(100).optional(),
    entityType: z
      .enum([
        'USER',
        'INSPECTOR_DISTRICT',
        'TEACHER_TRANSFER',
        'TEACHER_ASSIGNMENT',
        'INFORMATION_CARD',
        'PEDAGOGICAL_VISIT',
        'VISIT_REPORT',
      ])
      .optional(),
    affectedUser: z.string().trim().max(100).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
const select = {
  id: true,
  eventType: true,
  actorUserId: true,
  actorRole: true,
  actorName: true,
  entityType: true,
  entityId: true,
  affectedUserId: true,
  affectedName: true,
  createdAt: true,
  before: true,
  after: true,
  reason: true,
} as const;
auditRouter.get('/admin/audit-events', async (req, res) => {
  const parsed = query.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'مرشحات سجل التدقيق غير صالحة.' });
  const q = parsed.data;
  if (q.from && q.to && new Date(q.from).getTime() > new Date(q.to).getTime())
    return res.status(400).json({ error: 'بداية الفترة تتجاوز نهايتها.' });
  const where: Prisma.AuditEventWhereInput = {
    ...(q.eventType ? { eventType: q.eventType } : {}),
    ...(q.entityType ? { entityType: q.entityType } : {}),
    ...(q.actor
      ? {
          OR: [{ actorUserId: q.actor }, { actorName: { contains: q.actor, mode: 'insensitive' } }],
        }
      : {}),
    ...(q.affectedUser
      ? {
          AND: [
            {
              OR: [
                { affectedUserId: q.affectedUser },
                { affectedName: { contains: q.affectedUser, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : {}),
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: new Date(q.from) } : {}),
            ...(q.to ? { lte: new Date(q.to) } : {}),
          },
        }
      : {}),
  };
  const [total, events] = await prisma.$transaction([
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.findMany({
      where,
      select,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  res.json({ events, total, page: q.page, pageSize: q.pageSize });
});
auditRouter.get('/admin/audit-events/:id', async (req, res) => {
  const event = await prisma.auditEvent.findUnique({ where: { id: req.params.id }, select });
  if (!event) return res.status(404).json({ error: 'حدث التدقيق غير موجود.' });
  res.json({ event });
});
