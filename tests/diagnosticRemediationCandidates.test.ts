import { describe, expect, it } from 'vitest';
import { getRegisteredKnowledgeCoreRelease } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry';
import { DEFAULT_CANDIDATE_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry';
import { deriveDiagnosticRemediationCandidates } from '../src/services/diagnosticRemediation.service';

const catalog = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)!.catalog;
const competency = catalog.finalCompetencies.find(
  (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_fundamentals'
)!;
const criteria = catalog.criteria.filter((item) => item.finalCompetencyId === competency.id);

function session(
  assessmentType = 'DIAGNOSTIC',
  results = [{ id: 'cr-1', criterionId: criteria[0].id, masteryLevel: 'د', note: 'obs' }]
) {
  return {
    id: 'session-1',
    teacherId: 'teacher-a',
    assessmentType,
    gradeLevelId: 'lvl_p1',
    domainId: 'f_fundamentals',
    finalCompetencyId: competency.id,
    studentAssessments: [
      {
        id: 'sa-1',
        studentId: 'student-a',
        student: {
          firstName: 'أحمد',
          lastName: 'اختبار',
          teacherId: 'teacher-a',
          classId: 'class-a',
        },
        criterionResults: results,
      },
    ],
  };
}

describe('diagnostic remediation candidate resolver', () => {
  it('derives only weak د criterion evidence', () => {
    expect(deriveDiagnosticRemediationCandidates(session())).toHaveLength(1);
    for (const level of ['أ', 'ب', 'ج']) {
      expect(
        deriveDiagnosticRemediationCandidates(
          session('DIAGNOSTIC', [
            { id: `cr-${level}`, criterionId: criteria[0].id, masteryLevel: level, note: null },
          ])
        )
      ).toEqual([]);
    }
  });

  it('keeps multiple students and criteria as separate evidence rows', () => {
    const result = deriveDiagnosticRemediationCandidates({
      ...session(),
      studentAssessments: [
        session().studentAssessments[0],
        {
          ...session().studentAssessments[0],
          id: 'sa-2',
          studentId: 'student-b',
          student: {
            firstName: 'سارة',
            lastName: 'اختبار',
            teacherId: 'teacher-a',
            classId: 'class-a',
          },
          criterionResults: [
            { id: 'cr-2', criterionId: criteria[0].id, masteryLevel: 'د', note: null },
            { id: 'cr-3', criterionId: criteria[1].id, masteryLevel: 'د', note: null },
          ],
        },
      ],
    });
    expect(result.map((item) => item.criterionResultId)).toEqual(['cr-1', 'cr-2', 'cr-3']);
  });

  it('rejects non-diagnostic and inconsistent criterion evidence safely', () => {
    expect(deriveDiagnosticRemediationCandidates(session('LEARNING'))).toEqual([]);
    expect(
      deriveDiagnosticRemediationCandidates(
        session('DIAGNOSTIC', [
          {
            id: 'foreign',
            criterionId: 'criterion-from-other-context',
            masteryLevel: 'د',
            note: null,
          },
        ])
      )
    ).toEqual([]);
  });
});
