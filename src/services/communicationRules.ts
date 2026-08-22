export interface DirectMessageVisibilityRow {
  senderId?: string | null;
  recipientId?: string | null;
}

export interface DistrictMessageVisibilityRow {
  districtId?: string | null;
  legacyDistrictId?: string | null;
}

export function normalizeMessageText(value: unknown, maxLength = 4000): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

export function canReadDirectMessage(row: DirectMessageVisibilityRow, userId: string, isAdmin = false): boolean {
  return isAdmin || row.senderId === userId || row.recipientId === userId;
}

export function canReadDistrictMessage(row: DistrictMessageVisibilityRow, districtId: string, isAdmin = false): boolean {
  return isAdmin || row.districtId === districtId || row.legacyDistrictId === districtId;
}
