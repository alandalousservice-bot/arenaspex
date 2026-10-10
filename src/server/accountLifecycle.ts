import { assignmentTransaction } from './assignmentTransferService.js';
import { appendAudit } from './auditService.js';
import { academicYearAccessExpiry, currentAcademicYearId } from './accountAccess.js';
export type AccountAction = 'activate' | 'deactivate' | 'reactivate' | 'reject' | 'archive';
export class AccountLifecycleError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function changeAccountAccess(actorId: string, id: string, action: AccountAction) {
  return assignmentTransaction(async (db) => {
    const actor = await db.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== 'admin' || actor.status !== 'active' || !actor.isApprovedByAdmin)
      throw new AccountLifecycleError(403, 'إدارة الحسابات متاحة للمشرف فقط.');
    const before = await db.user.findUnique({ where: { id } });
    if (!before) throw new AccountLifecycleError(404, 'الحساب غير موجود.');
    if (before.isPlatformOwner || id === actorId || before.role === 'admin')
      throw new AccountLifecycleError(
        403,
        'حساب المشرف الحالي وحسابات الإدارة محمية من هذا الإجراء.'
      );
    if (before.status === 'archived') {
      if (action === 'archive') return before;
      throw new AccountLifecycleError(
        409,
        'الحساب مؤرشف؛ لا يمكن تغيير حالته من إجراءات الحساب العادية.'
      );
    }
    if (action === 'reject' && before.status !== 'pending_approval' && before.isApprovedByAdmin)
      throw new AccountLifecycleError(409, 'لا يمكن رفض حساب معتمد؛ استخدم التعطيل.');
    const enabling = action === 'activate' || action === 'reactivate';
    if (enabling && before.role !== 'admin' && !before.emailVerifiedAt) {
      throw new AccountLifecycleError(409, 'يجب التحقق من البريد الإلكتروني قبل تفعيل الحساب.');
    }
    const data = enabling
      ? {
          status: 'active',
          isApprovedByAdmin: true,
          accessExpiresAt: academicYearAccessExpiry(),
          accessAcademicYearId: currentAcademicYearId(),
        }
      : { status: action === 'archive' ? 'archived' : 'inactive', isApprovedByAdmin: false };
    if (
      before.status === data.status &&
      before.isApprovedByAdmin === data.isApprovedByAdmin &&
      (!enabling || before.accessAcademicYearId === currentAcademicYearId())
    )
      return before;
    const saved = await db.user.update({ where: { id }, data });
    const eventType =
      action === 'archive'
        ? 'ACCOUNT_ARCHIVED'
        : action === 'deactivate'
          ? 'ACCOUNT_DISABLED'
          : action === 'reactivate'
            ? 'ACCOUNT_REACTIVATED'
            : saved.role === 'inspector' && enabling
              ? 'INSPECTOR_ACCOUNT_ACTIVATED'
              : 'ACCOUNT_STATUS_CHANGED';
    await appendAudit(db, {
      eventType,
      actorUserId: actorId,
      entityType: 'USER',
      entityId: id,
      affectedUserId: id,
      before: { status: before.status, isApprovedByAdmin: before.isApprovedByAdmin },
      after: { status: saved.status, isApprovedByAdmin: saved.isApprovedByAdmin },
      key: `ACCOUNT_ACCESS:${id}:${saved.updatedAt.toISOString()}`,
    });
    return saved;
  }, 'accountLifecycle.changeAccountAccess');
}
