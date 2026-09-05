/**
 * SPEX - Collection Ownership & Access Helpers
 *
 * منطق ملكية وصلاحيات المجموعات العامة (lesson-plans, notebook, direct-messages,
 * community-notifications...) المستخدَم من طرف `jsonCollectionRoutes` في apiRouter.ts.
 * استُخرج إلى ملف مستقل قابل للاختبار بمعزل عن Express/Prisma بعد أن تسبّب دمجه
 * ضمن مصنع الراوتر في خلل حقيقي (إشعارات المجتمع كانت تُنسَب دوماً لمُرسِلها بدل
 * مستلمها الحقيقي — راجع community-notifications في apiRouter.ts وملف المراجعة).
 */

export type MinimalRecord = Record<string, unknown> & { id: string };
export type MinimalUser = { id: string; role: string };

export type CollectionReadKind =
  | 'teacher-owned-document'
  | 'inspector-note'
  | 'district-message'
  | 'direct-message'
  | 'community-notification';

export type CollectionReadUser = MinimalUser & { districtId?: string };

/**
 * Builds the database predicate for a JSON collection's read policy.
 *
 * The returned object is intentionally a Prisma-compatible `where` shape, but
 * stays structurally typed here so the auth policy remains testable without
 * importing the generated Prisma client. Callers must pass it to `findMany`
 * before `skip`/`take` are applied.
 */
export function buildCollectionReadWhere(
  kind: CollectionReadKind,
  user: CollectionReadUser,
  acceptedTeacherIds: ReadonlySet<string> = new Set()
): Record<string, unknown> | undefined {
  if (user.role === 'admin') return undefined;

  switch (kind) {
    case 'teacher-owned-document':
      return user.role === 'inspector'
        ? {
            OR: [{ ownerId: user.id }, { ownerId: { in: [...acceptedTeacherIds] } }],
          }
        : { ownerId: user.id };
    case 'inspector-note':
      return {
        OR: [{ authorId: user.id }, { data: { path: ['teacherId'], equals: user.id } }],
      };
    case 'district-message':
      return { data: { path: ['districtId'], equals: user.districtId || '' } };
    case 'direct-message':
      return {
        OR: [{ senderId: user.id }, { recipientId: user.id }],
      };
    case 'community-notification':
      return {
        OR: [{ userId: user.id }, { data: { path: ['senderId'], equals: user.id } }],
      };
  }
}

export function buildCollectionReadQuery(
  kind: CollectionReadKind,
  user: CollectionReadUser,
  acceptedTeacherIds: ReadonlySet<string>,
  limit?: number,
  offset?: number
): Record<string, unknown> {
  return {
    where: buildCollectionReadWhere(kind, user, acceptedTeacherIds),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    skip: offset,
  };
}

/**
 * هل يملك المستخدم صلاحية الكتابة/الحذف على سجل موجود مسبقاً؟
 * - سجل غير موجود بعد (إنشاء): يُسمح دائماً (تُطبَّق قيود الإنشاء الأخرى، مثل allowedCreateRoles، بمكان آخر).
 * - admin: يملك صلاحية كاملة دائماً.
 * - بلا ownerField مُعرَّف: أي مستخدم مسجَّل دخول يملك صلاحية الكتابة (سجلات عامة كالموارد المجتمعية).
 * - خلاف ذلك: فقط صاحب السجل (existing[ownerField] === user.id).
 */
export function canWriteRecord(
  existing: MinimalRecord | null,
  user: MinimalUser,
  ownerField?: string
): boolean {
  if (!existing) return true;
  if (user.role === 'admin') return true;
  if (!ownerField) return true;
  return existing[ownerField] === user.id;
}

/**
 * Read policy for private Teacher-owned documents exposed to the Inspector
 * follow-up workspace. The assignment set is loaded from the server-side
 * InspectorAssignment query for the current request.
 */
export function canReadTeacherOwnedDocument(
  row: MinimalRecord,
  user: MinimalUser,
  acceptedTeacherIds: ReadonlySet<string>
): boolean {
  if (user.role === 'admin' || row.ownerId === user.id) return true;
  return (
    user.role === 'inspector' &&
    typeof row.ownerId === 'string' &&
    acceptedTeacherIds.has(row.ownerId)
  );
}

/**
 * القيمة الصحيحة لحقل الملكية (ownerField) عند إنشاء/تعديل سجل.
 *
 * القاعدة الحاسمة: `ownerAssignedByServer=true` تعني أن هذا الحقل يمثّل *هوية فاعل الإجراء
 * نفسه* (مثال: senderId في الرسائل المباشرة) ويجب أن يُفرَض من الخادم دائماً لمنع انتحال
 * الهوية. أما `ownerAssignedByServer=false` فتعني أن الحقل قد يمثّل *طرفاً آخر* حدّده
 * صاحب الطلب بنفسه (مثال: userId/المستلم في إشعارات المجتمع)، فيُؤخَذ مما أرسله العميل
 * مع سقوط افتراضي آمن (نفس المستخدم) إن غاب.
 *
 * - تعديل سجل موجود: القيمة لا تتغيّر أبداً (منع انتحال ملكية سجل قائم).
 * - إنشاء سجل جديد: حسب `ownerAssignedByServer` كما سبق.
 */
export function resolveOwnerFieldValue(
  existing: MinimalRecord | null,
  item: Record<string, unknown>,
  currentUserId: string,
  ownerAssignedByServer: boolean,
  ownerField: string
): unknown {
  if (existing) return existing[ownerField];
  if (ownerAssignedByServer) return currentUserId;
  return item[ownerField] || currentUserId;
}
