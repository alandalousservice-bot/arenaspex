import { getObjectiveBankItem } from '../data/objectiveBankRegistry';
import type { TeacherLearningObjective } from '../types/spex';

export type ResolvedObjectiveSource = 'CANONICAL' | 'LEGACY_EMBEDDED' | 'TEACHER_OBJECTIVE';
export interface ResolvedObjectiveContext {
  id: string;
  source: ResolvedObjectiveSource;
  text: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  sourceReferenceId?: string | null;
  teacherObjectiveId?: string | null;
}

export interface TeacherObjectiveRecord {
  id: string;
  ownerId: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  text: string;
}

export function resolveObjective(
  gradeId: string,
  domainId: string,
  objective: TeacherLearningObjective,
  personal?: TeacherObjectiveRecord
): ResolvedObjectiveContext {
  const finalCompetencyId = `fc_${gradeId}_${domainId}`;
  if (objective.teacherObjectiveId) {
    if (!personal || personal.id !== objective.teacherObjectiveId || personal.ownerId === '')
      throw new Error('OBJECTIVE_PRIVATE_REFERENCE_INVALID');
    return {
      id: personal.id,
      source: 'TEACHER_OBJECTIVE',
      text: personal.text,
      gradeId,
      domainId,
      finalCompetencyId,
      teacherObjectiveId: personal.id,
    };
  }
  if (objective.sourceReferenceId) {
    const canonical = getObjectiveBankItem(gradeId, domainId, objective.sourceReferenceId);
    if (canonical)
      return {
        id: canonical.id,
        source: 'CANONICAL',
        text: canonical.objectiveText,
        gradeId,
        domainId,
        finalCompetencyId,
        sourceReferenceId: canonical.id,
      };
  }
  return {
    id: objective.id,
    source: 'LEGACY_EMBEDDED',
    text: objective.text,
    gradeId,
    domainId,
    finalCompetencyId,
    sourceReferenceId: objective.sourceReferenceId,
  };
}
