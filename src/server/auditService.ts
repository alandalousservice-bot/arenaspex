import type { Prisma, User } from '@prisma/client';
import { AUDIT_EVENT_LABELS, AUDIT_STATE_LABELS, type AuditEventType } from '../types/audit.js';

export function auditState(value: unknown): Prisma.InputJsonObject {
  const result: Record<string, string | number | boolean | null> = {};
  if (!value || typeof value !== 'object') return result;
  for (const key of Object.keys(AUDIT_STATE_LABELS)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const field = (value as Record<string, unknown>)[key];
    if (
      field === null ||
      typeof field === 'boolean' ||
      (typeof field === 'number' && Number.isFinite(field))
    )
      result[key] = field as boolean | number | null;
    else if (field instanceof Date) result[key] = field.toISOString();
    else if (typeof field === 'string' && field.length <= 200 && !sensitive(field))
      result[key] = field;
  }
  return result;
}
const sensitive = (value: string) =>
  /password|passwd|secret|token|authorization|cookie|api[_ -]?key|bearer\s|postgres(?:ql)?:\/\/|sk-[a-z0-9]|eyJ[a-zA-Z0-9_-]+\./i.test(
    value
  );
export const auditReason = (value?: string) =>
  value && !sensitive(value) ? value.trim().slice(0, 1000) : null;

export async function auditAccountChange(
  db: Prisma.TransactionClient,
  actorUserId: string,
  before: User | null,
  after: User
) {
  const statusChanged = before
    ? before.status !== after.status ||
      before.role !== after.role ||
      before.isApprovedByAdmin !== after.isApprovedByAdmin ||
      before.accessAcademicYearId !== after.accessAcademicYearId
    : after.status === 'active' && after.isApprovedByAdmin;
  const districtChanged =
    after.role === 'inspector' &&
    (before?.districtId !== after.districtId || before?.directorateId !== after.directorateId);
  if (!statusChanged && !districtChanged) return;
  await appendAudit(db, {
    eventType:
      after.status === 'archived'
        ? 'ACCOUNT_ARCHIVED'
        : before?.status === 'active' && after.status === 'inactive'
          ? 'ACCOUNT_DISABLED'
          : before?.status === 'inactive' && after.status === 'active'
            ? 'ACCOUNT_REACTIVATED'
            : statusChanged
              ? after.role === 'inspector' && after.status === 'active' && after.isApprovedByAdmin
                ? 'INSPECTOR_ACCOUNT_ACTIVATED'
                : 'ACCOUNT_STATUS_CHANGED'
              : 'INSPECTOR_DISTRICT_ASSIGNED',
    actorUserId,
    ...(before?.id === actorUserId ? { actorRoleAtAction: before.role } : {}),
    entityType: 'USER',
    entityId: after.id,
    affectedUserId: after.id,
    before: before || undefined,
    after,
    key: `ACCOUNT_MUTATION:${after.id}:${after.updatedAt.toISOString()}`,
  });
}

/** Mandatory write: callers must pass their existing transaction client. Never catch audit failures. */
export async function appendAudit(
  db: Prisma.TransactionClient,
  input: {
    eventType: AuditEventType;
    actorRoleAtAction?: string;
    actorUserId: string;
    entityType: string;
    entityId: string;
    affectedUserId?: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
    key: string;
  }
) {
  if (!(input.eventType in AUDIT_EVENT_LABELS)) throw new Error('Unknown trusted audit event');
  const actor = await db.user.findUnique({
    where: { id: input.actorUserId },
    select: { role: true, firstName: true, lastName: true },
  });
  if (!actor) throw new Error('Audit actor not found');
  const target = input.affectedUserId
    ? await db.user.findUnique({
        where: { id: input.affectedUserId },
        select: { firstName: true, lastName: true },
      })
    : null;
  const name = (person: { firstName: string; lastName: string }) =>
    `${person.firstName} ${person.lastName}`.trim().slice(0, 250);
  async function state(value: unknown) {
    const fields = auditState(value);
    const inspector =
      typeof fields.inspectorId === 'string'
        ? await db.user.findUnique({
            where: { id: fields.inspectorId },
            select: { firstName: true, lastName: true },
          })
        : null;
    const district =
      typeof fields.districtId === 'string'
        ? await db.inspectionDistrict.findUnique({
            where: { id: fields.districtId },
            select: { name: true },
          })
        : null;
    const directorate =
      typeof fields.directorateId === 'string'
        ? await db.directorate.findUnique({
            where: { id: fields.directorateId },
            select: { name: true },
          })
        : null;
    return {
      ...fields,
      ...(inspector ? { inspectorName: name(inspector) } : {}),
      ...(district ? { districtName: district.name.slice(0, 200) } : {}),
      ...(directorate ? { directorateName: directorate.name.slice(0, 200) } : {}),
    };
  }
  const before = input.before ? await state(input.before) : undefined;
  const after = input.after ? await state(input.after) : undefined;
  return db.auditEvent.create({
    data: {
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      actorRole: input.actorRoleAtAction || actor.role,
      actorName: name(actor),
      entityType: input.entityType,
      entityId: input.entityId,
      affectedUserId: input.affectedUserId || null,
      affectedName: target ? name(target) : null,
      ...(before ? { before } : {}),
      ...(after ? { after } : {}),
      reason: auditReason(input.reason),
      deduplicationKey: input.key,
    },
  });
}
