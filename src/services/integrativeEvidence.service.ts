import type { TeacherLearningPlan } from './teacherLearningPlan.service.js';

export type IntegrativeSlot = 1 | 2;

export interface IntegrativeEvidenceSnapshot {
  pointId: string;
  number: IntegrativeSlot;
  label: string;
  gradeLevelId: string;
  domainId: string;
  finalCompetencyId: string | null;
  coveredReferences: Array<{
    referenceId: string;
    objectiveId: string;
    teacherObjectiveId: string | null;
    objectiveText: string;
    orderIndex: number;
  }>;
}

export function deriveIntegrativeEvidence(
  plan: TeacherLearningPlan,
  domainId: string,
  integrationPointId: string,
  context: { gradeLevelId: string; finalCompetencyId: string | null }
): IntegrativeEvidenceSnapshot {
  const domain = plan.domains.find((item) => item.fieldId === domainId);
  if (!domain) throw new Error('نطاق الإدماجية لا يطابق مخطط الأستاذ.');
  const points = [...domain.integrationPoints].sort((a, b) => a.orderIndex - b.orderIndex);
  const pointIndex = points.findIndex((point) => point.id === integrationPointId);
  if (pointIndex < 0 || pointIndex > 1) throw new Error('نقطة الإدماجية غير صالحة.');
  const point = points[pointIndex];
  const anchorIndex = point.afterObjectiveId
    ? domain.objectives.findIndex((objective) => objective.id === point.afterObjectiveId)
    : -1;
  const previousAnchorIndex =
    pointIndex === 0
      ? -1
      : (() => {
          const previous = points[pointIndex - 1];
          return previous.afterObjectiveId
            ? domain.objectives.findIndex((objective) => objective.id === previous.afterObjectiveId)
            : -1;
        })();
  if (anchorIndex < 0) throw new Error('لا يمكن اشتقاق مرساة الإدماجية.');
  const covered = domain.objectives
    .filter((objective, index) => index > previousAnchorIndex && index <= anchorIndex)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((objective) => ({
      referenceId: objective.sourceReferenceId || objective.id,
      objectiveId: objective.id,
      teacherObjectiveId: objective.teacherObjectiveId || null,
      objectiveText: objective.text,
      orderIndex: objective.orderIndex,
    }))
    .filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.referenceId === item.referenceId) === index
    );
  return {
    pointId: point.id,
    number: (pointIndex + 1) as IntegrativeSlot,
    label: point.label || `إدماجية ${pointIndex + 1}`,
    gradeLevelId: context.gradeLevelId,
    domainId,
    finalCompetencyId: context.finalCompetencyId,
    coveredReferences: covered,
  };
}
