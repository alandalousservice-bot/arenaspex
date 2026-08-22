import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { canEditSuggestedGame, canReviewSuggestedGame, hasProbableGameDuplicate, validateGameSuggestion } from '../src/services/pedagogicalGameSuggestion.service';

const context = { grade: 3, fieldId: 'f_fundamentals', fieldName: 'الحركات القاعدية', objectiveId: 'curriculum_objective_1', objectiveText: 'ينجز القفز والوثب مع التحكم في الارتقاء والهبوط.' };

describe('pedagogical game suggestion workflow', () => {
  it('preserves grade, field and objective and starts as a draft', () => {
    const item = validateGameSuggestion({ title: 'لعبة القفز', description: 'تدريب القفز', rules: 'يقفز المتعلمون بالتناوب.' }, context);
    expect(item).toMatchObject({ approvalStatus: 'DRAFT', approved: false, levelIds: ['lvl_p3'], fieldId: context.fieldId, objectiveId: context.objectiveId, objectiveText: context.objectiveText });
  });

  it('rejects empty generated shells and detects probable duplicates', () => {
    expect(validateGameSuggestion({ title: '', description: 'x', rules: 'y' }, context)).toBeNull();
    const existing = [{ id: 'g', category: 'game', title: ' لعبة القفز ', description: 'x', fieldId: context.fieldId, levelIds: ['lvl_p3'], approved: true, createdBy: 'مرجع', tags: [], usageCount: 0, rating: 0 } as any];
    expect(hasProbableGameDuplicate({ title: 'لعبة القفز' }, existing, 3, context.fieldId)).toBe(true);
  });

  it('allows only owner draft/rejected editing and reviewer approval', () => {
    const item = { ownerId: 'teacher-1', approvalStatus: 'DRAFT' } as any;
    expect(canEditSuggestedGame(item, 'teacher-1')).toBe(true);
    expect(canEditSuggestedGame(item, 'teacher-2')).toBe(false);
    expect(canReviewSuggestedGame('teacher', { ...item, approvalStatus: 'PENDING_APPROVAL' })).toBe(false);
    expect(canReviewSuggestedGame('inspector', { ...item, approvalStatus: 'PENDING_APPROVAL' })).toBe(true);
    expect(canReviewSuggestedGame('admin', { ...item, approvalStatus: 'PENDING_APPROVAL' })).toBe(true);
  });

  it('keeps technical generation metadata out of visible Knowledge Bank wording', () => {
    const source = fs.readFileSync('src/components/knowledge/KnowledgeEngineView.tsx', 'utf8');
    expect(source).not.toContain('محتوى مولد آلياً');
    expect(source).not.toContain('استخراج ألعاب بيداغوجية موصى بها');
    expect(source).toContain('اقتراح لعبة تربوية');
    expect(source).toContain('rounded-3xl');
    expect(source).toContain('bg-indigo-600');
  });
});
