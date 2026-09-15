import { getObjectiveBankItem } from '../data/objectiveBankRegistry';

export type TeacherObjectiveProvenance = 'GENERATED' | 'REFORMULATED' | 'MANUAL';

export interface TeacherObjectiveDraft {
  text: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  provenanceType: TeacherObjectiveProvenance;
  sourceReferenceId?: string | null;
  sourceObjectiveId?: string | null;
}

export function validateTeacherObjectiveContext(draft: TeacherObjectiveDraft): void {
  if (!/^lvl_p[1-5]$/.test(draft.gradeId)) throw new Error('OBJECTIVE_GRADE_INVALID');
  if (!['f_locomotion', 'f_fundamentals', 'f_structuring'].includes(draft.domainId))
    throw new Error('OBJECTIVE_DOMAIN_INVALID');
  if (draft.finalCompetencyId !== `fc_${draft.gradeId}_${draft.domainId}`)
    throw new Error('OBJECTIVE_COMPETENCY_INVALID');
  if (!draft.text.trim()) throw new Error('OBJECTIVE_TEXT_REQUIRED');
  if (
    draft.sourceReferenceId &&
    !getObjectiveBankItem(draft.gradeId, draft.domainId, draft.sourceReferenceId)
  )
    throw new Error('OBJECTIVE_SOURCE_INVALID');
}

export function normalizeObjectiveText(value: string): string {
  return value
    .trim()
    .replace(/[.،؛:!?؟]+/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ar');
}
