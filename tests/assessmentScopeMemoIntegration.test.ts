import { describe, expect, it } from 'vitest';
import { resolveAssessmentScope } from '../src/domain/pedagogicalKnowledge/assessmentScopeAdapter';
import { P1FC_COMBINED_SEMANTIC_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { selectEducationalSituations } from '../src/services/educationalSituation.selector.service';
import { autoGenerateLessonPlan } from '../src/services/lessonPlan.generator.service';
import type { EducationalSituation, User } from '../src/types/spex';

const teacher = {
  id: 'assessment-scope-teacher',
  username: 'assessment-scope-teacher',
  spexId: 'SPX-ASSESSMENT-SCOPE',
  firstName: 'اختبار',
  lastName: 'نطاق التقويم',
  email: 'assessment-scope@example.test',
  role: 'teacher',
  directorateId: '',
  districtId: '',
  status: 'active',
} as User;

function assessmentSituation(
  scope: ReturnType<typeof resolveAssessmentScope>,
  withEvidence = false
): EducationalSituation {
  return {
    id: withEvidence ? 'assessment-with-canonical-evidence' : 'assessment-without-evidence',
    name: 'موقف تقويمي اختباري',
    grade: 4,
    gradeId: scope.gradeId,
    fieldId: scope.domainId,
    domainId: scope.domainId,
    fieldName: 'الميدان البدني',
    objectiveIds: ['assessment-objective'],
    objectiveTexts: ['هدف تقويمي اختباري'],
    sourceGoal: 'تقويم تشخيصي',
    organization: 'أفواج',
    equipment: ['أقماع'],
    origin: 'REFERENCE_SEED',
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
    lessonTypes: [scope.kind === 'summative' ? 'SUMMATIVE' : 'DIAGNOSTIC'],
    relationTypes: ['ASSESSMENT'],
    objectiveRelations: [
      {
        objectiveId: 'assessment-objective',
        relationType: 'ASSESSMENT',
        evidence: withEvidence
          ? {
              criterionIds: scope.requiredCriteria.map((item) => item.id),
              indicatorIds: scope.requiredIndicators.map((item) => item.id),
              learningRequirementIds: scope.requirements.map((item) => item.id),
            }
          : null,
      },
    ],
    durationMinutes: 20,
  };
}

describe('KNOWLEDGE-ENGINE-G4 canonical assessment scope', () => {
  it('resolves the approved canonical criteria and indicators for diagnostic and summative scopes', () => {
    for (const kind of ['diagnostic', 'summative'] as const) {
      const scope = resolveAssessmentScope({
        gradeId: 'lvl_p4',
        domainId: 'f_locomotion',
        finalCompetencyId: 'fc_lvl_p4_f_locomotion',
        kind,
      });

      expect(scope.unresolved).toBe(false);
      expect(scope.kind).toBe(kind);
      expect(scope.finalCompetency?.id).toBe('fc_lvl_p4_f_locomotion');
      expect(scope.criteria).toHaveLength(4);
      expect(scope.indicators).toHaveLength(4);
      expect(
        scope.indicators.every((item) =>
          scope.criteria.some((criterion) => criterion.id === item.criterionId)
        )
      ).toBe(true);
      expect(scope.requiredCriteria).toEqual(scope.criteria);
      expect(scope.requiredIndicators).toEqual(scope.indicators);
      expect(scope.coveredCriteria).toEqual([]);
      expect(scope.coveredIndicators).toEqual([]);
    }
  });

  it('rejects a final competency from another grade instead of leaking criteria across cells', () => {
    const scope = resolveAssessmentScope({
      gradeId: 'lvl_p4',
      domainId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p1_f_locomotion',
      kind: 'diagnostic',
    });

    expect(scope.unresolved).toBe(true);
    expect(scope.finalCompetencyId).toBeNull();
    expect(scope.criteria).toEqual([]);
    expect(scope.indicators).toEqual([]);
  });

  it('keeps assessment selection ASSESSMENT-only and reports incomplete canonical coverage explicitly', () => {
    const scope = resolveAssessmentScope(
      {
        gradeId: 'lvl_p4',
        domainId: 'f_locomotion',
        finalCompetencyId: 'fc_lvl_p4_f_locomotion',
        kind: 'diagnostic',
      },
      P1FC_COMBINED_SEMANTIC_CATALOG
    );
    const result = selectEducationalSituations(
      [
        assessmentSituation(scope),
        {
          ...assessmentSituation(scope),
          id: 'learning-not-an-assessment',
          relationTypes: ['DIRECT'],
          objectiveRelations: [{ objectiveId: 'assessment-objective', relationType: 'DIRECT' }],
        },
      ],
      {
        gradeId: 'lvl_p4',
        domainId: 'f_locomotion',
        lessonType: 'DIAGNOSTIC',
        objectiveIds: ['assessment-objective'],
        durationMinutes: 45,
        assessmentScope: scope,
      }
    );

    expect(result.selectedSituations.map((item) => item.id)).toEqual([
      'assessment-without-evidence',
    ]);
    expect(result.assessmentCoverage).toMatchObject({
      scopeResolved: true,
      coveredCriteriaIds: [],
      coveredIndicatorIds: [],
      missingCriteriaIds: scope.requiredCriteria.map((item) => item.id),
      missingIndicatorIds: scope.requiredIndicators.map((item) => item.id),
    });
    expect(result.failureCode).toBe('ASSESSMENT_COVERAGE_MISSING');
  });

  it('counts only structured evidence as covered canonical assessment scope', () => {
    const scope = resolveAssessmentScope({
      gradeId: 'lvl_p4',
      domainId: 'f_fundamentals',
      finalCompetencyId: 'fc_lvl_p4_f_fundamentals',
      kind: 'summative',
    });
    const result = selectEducationalSituations([assessmentSituation(scope, true)], {
      gradeId: 'lvl_p4',
      domainId: 'f_fundamentals',
      lessonType: 'SUMMATIVE',
      objectiveIds: ['assessment-objective'],
      durationMinutes: 45,
      assessmentScope: scope,
    });

    expect(result.assessmentCoverage).toMatchObject({
      scopeResolved: true,
      coveredCriteriaIds: scope.requiredCriteria.map((item) => item.id),
      coveredIndicatorIds: scope.requiredIndicators.map((item) => item.id),
      coveredRequirementIds: scope.requirements.map((item) => item.id),
      missingCriteriaIds: [],
      missingIndicatorIds: [],
      missingRequirementIds: [],
    });
    expect(result.failureCode).toBeUndefined();
  });

  it('passes scope only to assessment memo generation and leaves ordinary learning behavior unchanged', () => {
    const scope = resolveAssessmentScope({
      gradeId: 'lvl_p4',
      domainId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p4_f_locomotion',
      kind: 'diagnostic',
    });
    const source = {
      referenceSessionId: 'assessment-scope-reference',
      fieldId: 'f_locomotion',
      fieldName: 'الميدان البدني',
      finalCompetency: scope.finalCompetency?.label || '',
      segmentGoal: 'هدف تقويمي',
      sessionNumber: 1,
      globalNumber: 1,
      weekNumber: 1,
      type: 'تقويم تشخيصي' as const,
      typeLabel: 'تقويم تشخيصي',
      objective: 'هدف تقويمي',
      objectiveId: 'assessment-objective',
      tools: ['أقماع'],
    };
    const diagnostic = autoGenerateLessonPlan(source, {
      teacher,
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 20,
      assessmentScope: scope,
      situations: [assessmentSituation(scope)],
    });
    expect(diagnostic.generationWarnings?.map((warning) => warning.code)).toContain(
      'ASSESSMENT_COVERAGE_MISSING'
    );

    const learning = autoGenerateLessonPlan(
      { ...source, type: 'تعلمية' as const, typeLabel: 'تعلمية' },
      {
        teacher,
        levelName: 'السنة الرابعة ابتدائي',
        durationMinutes: 20,
        assessmentScope: scope,
        situations: [
          {
            ...assessmentSituation(scope),
            id: 'learning-direct',
            lessonTypes: ['LEARNING'],
            relationTypes: ['DIRECT'],
            objectiveRelations: [{ objectiveId: 'assessment-objective', relationType: 'DIRECT' }],
          },
        ],
      }
    );
    expect(learning.generationWarnings?.map((warning) => warning.code)).not.toContain(
      'ASSESSMENT_COVERAGE_MISSING'
    );
  });
});
