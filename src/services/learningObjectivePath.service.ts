import { knowledgeCoreRuntime } from '../domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import { getObjectiveBank } from '../data/objectiveBankRegistry';

export type LearningLessonCount = 6 | 7 | 8;

export interface LearningObjectivePathRequest {
  teacherId?: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  learningLessonCount: LearningLessonCount;
}

export interface LearningObjectivePathItem {
  position: number;
  text: string;
  coveredRequirementIds: string[];
}

export interface LearningObjectivePath {
  learningLessonCount: LearningLessonCount;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  objectives: LearningObjectivePathItem[];
  coverage: { requiredRequirementIds: string[]; coveredRequirementIds: string[] };
}

const isSupportedCount = (value: number): value is LearningLessonCount =>
  value === 6 || value === 7 || value === 8;

function partition<T>(items: readonly T[], count: number): T[][] {
  return Array.from({ length: count }, (_, index) =>
    items.slice(
      Math.floor((index * items.length) / count),
      Math.floor(((index + 1) * items.length) / count)
    )
  );
}

export function validateLearningObjectivePath(
  request: LearningObjectivePathRequest,
  path: LearningObjectivePath
): LearningObjectivePath {
  if (!isSupportedCount(request.learningLessonCount))
    throw new Error('OBJECTIVE_PATH_COUNT_UNSUPPORTED');
  if (request.finalCompetencyId !== `fc_${request.gradeId}_${request.domainId}`)
    throw new Error('OBJECTIVE_PATH_CONTEXT_INVALID');
  if (path.objectives.length !== request.learningLessonCount)
    throw new Error('OBJECTIVE_PATH_COUNT_INVALID');
  const cell = knowledgeCoreRuntime.getGradeDomainCell(request.gradeId, request.domainId);
  const trustedRequirements = cell?.requirements.length
    ? cell.requirements.map((item) => item.id)
    : getObjectiveBank(request.gradeId, request.domainId).map((item) => item.id);
  if (!trustedRequirements.length) throw new Error('OBJECTIVE_PATH_CONTEXT_INVALID');
  const required = new Set(trustedRequirements);
  const covered = new Set<string>();
  for (const objective of path.objectives) {
    if (!objective.text.trim()) throw new Error('OBJECTIVE_PATH_TEXT_EMPTY');
    for (const id of objective.coveredRequirementIds) {
      if (!required.has(id)) throw new Error('OBJECTIVE_PATH_REQUIREMENT_INVALID');
      covered.add(id);
    }
  }
  if ([...required].some((id) => !covered.has(id)))
    throw new Error('OBJECTIVE_PATH_COVERAGE_INCOMPLETE');
  return {
    ...path,
    coverage: { requiredRequirementIds: [...required], coveredRequirementIds: [...covered] },
  };
}

export function generateLearningObjectivePath(
  request: LearningObjectivePathRequest
): LearningObjectivePath {
  if (!isSupportedCount(request.learningLessonCount))
    throw new Error('OBJECTIVE_PATH_COUNT_UNSUPPORTED');
  if (request.finalCompetencyId !== `fc_${request.gradeId}_${request.domainId}`)
    throw new Error('OBJECTIVE_PATH_CONTEXT_INVALID');
  const cell = knowledgeCoreRuntime.getGradeDomainCell(request.gradeId, request.domainId);
  const requirements = cell?.requirements.length
    ? cell.requirements.map((item) => ({ id: item.id, label: item.description || item.label }))
    : getObjectiveBank(request.gradeId, request.domainId).map((item) => ({
        id: item.id,
        label: item.objectiveText,
      }));
  if (!requirements.length) throw new Error('OBJECTIVE_PATH_CONTEXT_INVALID');
  if (request.learningLessonCount > requirements.length)
    throw new Error('PATH_NOT_PEDAGOGICALLY_FEASIBLE');
  const groups = partition(requirements, request.learningLessonCount);
  if (groups.some((group) => group.length === 0))
    throw new Error('PATH_NOT_PEDAGOGICALLY_FEASIBLE');
  const path: LearningObjectivePath = {
    learningLessonCount: request.learningLessonCount,
    gradeId: request.gradeId,
    domainId: request.domainId,
    finalCompetencyId: request.finalCompetencyId,
    objectives: groups.map((group, index) => ({
      position: index + 1,
      text: `يعمل المتعلم على ${group.map((item) => item.label).join('، ') || 'تطوير متطلبات الكفاءة'} في وضعيات حركية قابلة للملاحظة.`,
      coveredRequirementIds: group.map((item) => item.id),
    })),
    coverage: { requiredRequirementIds: [], coveredRequirementIds: [] },
  };
  return validateLearningObjectivePath(request, path);
}
