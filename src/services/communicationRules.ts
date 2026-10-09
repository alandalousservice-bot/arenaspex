export interface DirectMessageVisibilityRow {
  senderId?: string | null;
  recipientId?: string | null;
}

export interface DistrictMessageVisibilityRow {
  districtId?: string | null;
  legacyDistrictId?: string | null;
  data?: unknown;
}

export interface CommunicationGroupUser {
  id: string;
  role: string;
  status: string;
  isApprovedByAdmin: boolean;
  districtId?: string | null;
  eduDistrictId?: string | null;
}

export interface GroupMessageScopeRow {
  districtId?: string | null;
  data?: unknown;
}

export function requiresAcceptedInspectorAssignment(
  requesterRole: string,
  targetRole: string
): boolean {
  return (
    (requesterRole === 'inspector' && targetRole === 'teacher') ||
    (requesterRole === 'teacher' && targetRole === 'inspector')
  );
}

export function effectiveInspectionDistrictId(user: CommunicationGroupUser): string | null {
  const value = user.districtId || user.eduDistrictId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function canAccessDistrictCommunicationGroup(args: {
  user: CommunicationGroupUser;
  districtId: string;
}): boolean {
  const { user, districtId } = args;
  if (!districtId.trim() || user.status !== 'active' || !user.isApprovedByAdmin) return false;
  return (
    (user.role === 'inspector' || user.role === 'teacher') &&
    effectiveInspectionDistrictId(user) === districtId
  );
}

export function canAccessInspectorsGeneralGroup(user: CommunicationGroupUser): boolean {
  return user.role === 'inspector' && user.status === 'active' && user.isApprovedByAdmin;
}

export function canContactAuthorizedInspectorPeer(
  requester: CommunicationGroupUser,
  target: CommunicationGroupUser
): boolean {
  return (
    requester.id !== target.id &&
    canAccessInspectorsGeneralGroup(requester) &&
    canAccessInspectorsGeneralGroup(target)
  );
}

function groupScope(row: GroupMessageScopeRow): unknown {
  return row.data && typeof row.data === 'object'
    ? (row.data as Record<string, unknown>).groupScope
    : undefined;
}

export function canReadDistrictGroupMessage(
  row: GroupMessageScopeRow,
  districtId: string
): boolean {
  const rowDistrictId = row.districtId?.trim();
  const scope = groupScope(row);
  return Boolean(
    districtId.trim() &&
      rowDistrictId &&
      rowDistrictId === districtId &&
      (scope === undefined || scope === 'district')
  );
}

export function canReadInspectorsGeneralMessage(row: GroupMessageScopeRow): boolean {
  return row.districtId === null && groupScope(row) === 'inspectors_general';
}

export function groupNotificationRecipientIds(memberIds: string[], senderId: string): string[] {
  return [...new Set(memberIds)].filter((userId) => userId !== senderId);
}

export function canReadGroupNotification(
  data: unknown,
  currentDistrictId: string | null,
  isAuthorizedInspector: boolean
): boolean {
  if (!data || typeof data !== 'object') return true;
  const fields = data as Record<string, unknown>;
  if (fields.groupScope === 'district') {
    return Boolean(
      currentDistrictId &&
        typeof fields.districtId === 'string' &&
        fields.districtId.trim() === currentDistrictId
    );
  }
  if (fields.groupScope === 'inspectors_general') return isAuthorizedInspector;
  return true;
}

export function normalizeMessageText(value: unknown, maxLength = 4000): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

export function canReadDirectMessage(
  row: DirectMessageVisibilityRow,
  userId: string,
  isAdmin = false
): boolean {
  return isAdmin || row.senderId === userId || row.recipientId === userId;
}

export function canReadDistrictMessage(
  row: DistrictMessageVisibilityRow,
  districtId: string,
  isAdmin = false
): boolean {
  if (!districtId.trim()) return false;
  if (isAdmin) return true;
  const rowDistrictId = row.districtId?.trim() || row.legacyDistrictId?.trim();
  return Boolean(rowDistrictId && rowDistrictId === districtId);
}
