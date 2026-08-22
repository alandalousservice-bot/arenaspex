import { KnowledgeItem, UserRole } from '../types/spex';

export interface SuggestionContext {
  grade: number;
  fieldId: string;
  fieldName: string;
  objectiveId: string;
  objectiveText: string;
}

export function normalizeGameTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ar');
}

export function validateGameSuggestion(candidate: Partial<KnowledgeItem>, context: SuggestionContext): Partial<KnowledgeItem> | null {
  if (!candidate.title?.trim() || !candidate.description?.trim() || !candidate.rules?.trim()) return null;
  return {
    ...candidate,
    category: 'game',
    title: candidate.title.trim(),
    description: candidate.description.trim(),
    rules: candidate.rules.trim(),
    fieldId: context.fieldId,
    fieldName: context.fieldName,
    levelIds: [`lvl_p${context.grade}`],
    levelName: `السنة ${context.grade} ابتدائي`,
    objectiveId: context.objectiveId,
    objectiveText: context.objectiveText,
    approved: false,
    approvalStatus: 'DRAFT',
    usageCount: 0,
    rating: 0,
  };
}

export function hasProbableGameDuplicate(candidate: Partial<KnowledgeItem>, existing: KnowledgeItem[], grade: number, fieldId: string): boolean {
  const title = normalizeGameTitle(candidate.title || '');
  return existing.some((item) => item.category === 'game' && item.approved && item.fieldId === fieldId && (item.levelIds?.includes(`lvl_p${grade}`) || item.levelId === `lvl_p${grade}`) && normalizeGameTitle(item.title) === title);
}

export function canEditSuggestedGame(item: KnowledgeItem, userId: string): boolean {
  return item.ownerId === userId && (item.approvalStatus === 'DRAFT' || item.approvalStatus === 'REJECTED');
}

export function canSubmitSuggestedGame(item: KnowledgeItem, userId: string): boolean {
  return canEditSuggestedGame(item, userId);
}

export function canReviewSuggestedGame(role: UserRole, item: KnowledgeItem): boolean {
  return (role === 'admin' || role === 'inspector') && (item.approvalStatus === 'PENDING_APPROVAL' || item.approvalStatus === 'PENDING_REVIEW');
}
