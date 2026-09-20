import { getRegisteredKnowledgeCoreRelease } from '../domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';
import { DEFAULT_CANDIDATE_RELEASE_ID } from '../domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';
import { isDiagnosticWeakMastery } from './assessmentMastery.js';

export type DiagnosticSession = {
  id: string;
  teacherId: string;
  assessmentType: string;
  gradeLevelId: string;
  domainId: string;
  finalCompetencyId: string | null;
  studentAssessments: Array<{
    id: string;
    studentId: string;
    student: { firstName: string; lastName: string; teacherId: string; classId: string };
    criterionResults: Array<{
      id: string;
      criterionId: string;
      masteryLevel: string | null;
      note: string | null;
    }>;
  }>;
};

export type DiagnosticRemediationCandidate = {
  studentAssessmentId: string;
  studentId: string;
  studentName: string;
  criterionResultId: string;
  criterionId: string;
  criterionLabel: string;
  masteryLevel: 'د';
  note: string | null;
};

export function deriveDiagnosticRemediationCandidates(session: DiagnosticSession) {
  if (session.assessmentType !== 'DIAGNOSTIC') return [];
  const catalog = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)?.catalog;
  const finalCompetency = catalog?.finalCompetencies.find(
    (item) =>
      item.id === session.finalCompetencyId &&
      item.gradeId === session.gradeLevelId &&
      item.domainId === session.domainId
  );
  if (!finalCompetency) return [];

  const criteria = catalog.criteria.filter(
    (item) =>
      item.gradeId === session.gradeLevelId &&
      item.domainId === session.domainId &&
      item.finalCompetencyId === finalCompetency.id
  );
  const criterionOrder = new Map(criteria.map((item, index) => [item.id, index]));
  const criterionById = new Map(criteria.map((item) => [item.id, item]));

  return session.studentAssessments
    .filter(
      (assessment) =>
        assessment.student.teacherId === session.teacherId && assessment.criterionResults.length > 0
    )
    .flatMap((assessment) =>
      assessment.criterionResults.flatMap((result) => {
        const criterion = criterionById.get(result.criterionId);
        if (!criterion || !isDiagnosticWeakMastery(result.masteryLevel)) return [];
        return [
          {
            studentAssessmentId: assessment.id,
            studentId: assessment.studentId,
            studentName: `${assessment.student.firstName} ${assessment.student.lastName}`.trim(),
            criterionResultId: result.id,
            criterionId: result.criterionId,
            criterionLabel: criterion.label,
            masteryLevel: 'د' as const,
            note: result.note,
          },
        ];
      })
    )
    .sort(
      (left, right) =>
        left.studentId.localeCompare(right.studentId) ||
        (criterionOrder.get(left.criterionId) ?? Number.MAX_SAFE_INTEGER) -
          (criterionOrder.get(right.criterionId) ?? Number.MAX_SAFE_INTEGER) ||
        left.criterionId.localeCompare(right.criterionId)
    );
}
