import { describe, expect, it } from 'vitest';
import {
  EducationalSituationLessonType,
  lessonMainWorkBudgetMinutes,
  selectEducationalSituations,
  snapshotSituation,
} from '../src/services/educationalSituation.selector.service';
import type { EducationalSituation } from '../src/types/spex';

const makeSituation = (
  id: string,
  overrides: Partial<EducationalSituation> = {}
): EducationalSituation => ({
  id,
  name: id,
  externalId: id,
  grade: 1,
  gradeId: 'lvl_p1',
  fieldId: 'f_locomotion',
  domainId: 'f_locomotion',
  fieldName: 'التنقل',
  objectiveIds: ['obj-a'],
  objectiveTexts: ['الهدف أ'],
  sourceGoal: 'جري سريع وتغيير الاتجاه وفق إشارة',
  organization: 'مجموعات',
  equipment: ['أقماع'],
  origin: 'REFERENCE_SEED',
  status: 'APPROVED',
  approvalStatus: 'APPROVED',
  productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
  objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'DIRECT' }],
  ...overrides,
});

const select = (
  items: EducationalSituation[],
  lessonType: EducationalSituationLessonType = 'LEARNING',
  extra: Partial<Parameters<typeof selectEducationalSituations>[1]> = {}
) =>
  selectEducationalSituations(items, {
    gradeId: 'lvl_p1',
    domainId: 'f_locomotion',
    lessonType,
    objectiveIds: ['obj-a'],
    durationMinutes: 60,
    ...extra,
  });

describe('pedagogical educational-situation selection engine', () => {
  it('uses exact grade and domain gates', () => {
    const result = select([
      makeSituation('grade-match'),
      makeSituation('wrong-grade', { grade: 2, gradeId: 'lvl_p2' }),
      makeSituation('wrong-domain', { fieldId: 'f_fundamentals', domainId: 'f_fundamentals' }),
    ]);
    expect(result.selectedSituations.map((item) => item.id)).toEqual(['grade-match']);
    expect(result.excluded).toEqual(
      expect.arrayContaining([
        { situationId: 'wrong-grade', reason: 'GRADE_MISMATCH' },
        { situationId: 'wrong-domain', reason: 'DOMAIN_MISMATCH' },
      ])
    );
  });

  it('requires approved automatic eligibility and excludes review/archive records', () => {
    const result = select([
      makeSituation('auto'),
      makeSituation('review', { productionEligibility: 'REVIEW_ONLY' }),
      makeSituation('archive', { productionEligibility: 'SOURCE_ARCHIVE_ONLY' }),
      makeSituation('pending', { approvalStatus: 'PENDING_REVIEW' }),
    ]);
    expect(result.selectedSituations.map((item) => item.id)).toEqual(['auto']);
    expect(result.excluded.filter((item) => item.reason === 'NOT_AUTO_ELIGIBLE')).toHaveLength(2);
  });

  it('keeps the explicit legacy teacher compatibility default', () => {
    expect(
      select([makeSituation('teacher', { origin: 'TEACHER', productionEligibility: undefined })])
        .selectedSituations
    ).toHaveLength(1);
  });

  it('prefers DIRECT learning relations and never silently promotes support-only input', () => {
    const direct = makeSituation('direct');
    const supportive = makeSituation('supportive', {
      objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'SUPPORTIVE' }],
    });
    expect(select([supportive]).failureCode).toBe('NO_DIRECT_MATCH');
    expect(select([supportive, direct]).selectedSituations[0].id).toBe('direct');
  });

  it('does not use assessment-only situations as instructional learning core', () => {
    const result = select([
      makeSituation('assessment', {
        objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'ASSESSMENT' }],
      }),
    ]);
    expect(result.selectedSituations).toHaveLength(0);
    expect(result.failureCode).toBe('NO_DIRECT_MATCH');
  });

  it('selects explicitly INTEGRATIVE relations and reports incomplete target coverage', () => {
    const result = select(
      [
        makeSituation('integration', {
          objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'INTEGRATIVE' }],
        }),
      ],
      'INTEGRATIVE',
      { integrativeObjectiveIds: ['obj-a', 'obj-b'] }
    );
    expect(result.selectedSituations.map((item) => item.id)).toEqual(['integration']);
    expect(result.failureCode).toBe('INTEGRATIVE_COVERAGE_INCOMPLETE');
  });

  it('allows DIRECT to fill an integrative gap without inventing a relation', () => {
    const result = select(
      [
        makeSituation('integrative', {
          objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'INTEGRATIVE' }],
        }),
        makeSituation('direct-gap', {
          objectiveIds: ['obj-b'],
          objectiveRelations: [{ objectiveId: 'obj-b', relationType: 'DIRECT' }],
        }),
      ],
      'INTEGRATIVE',
      { objectiveIds: [], integrativeObjectiveIds: ['obj-a', 'obj-b'], maxSituations: 2 }
    );
    expect(result.selectedSituations.map((item) => item.id)).toEqual(['integrative', 'direct-gap']);
    expect(result.failureCode).toBeUndefined();
  });

  it('requires ASSESSMENT relation evidence for diagnostic and summative selection', () => {
    const assessment = makeSituation('assessment', {
      objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'ASSESSMENT' }],
    });
    expect(select([assessment], 'DIAGNOSTIC').selectedSituations.map((item) => item.id)).toEqual([
      'assessment',
    ]);
    expect(select([assessment], 'SUMMATIVE').selectedSituations.map((item) => item.id)).toEqual([
      'assessment',
    ]);
    expect(select([makeSituation('learning')], 'DIAGNOSTIC').failureCode).toBe(
      'ASSESSMENT_COVERAGE_MISSING'
    );
  });

  it('honors explicit lesson type metadata and aliases', () => {
    const learning = makeSituation('learning', { lessonTypes: ['LEARNING'] });
    const integrative = makeSituation('integrative', {
      lessonTypes: ['إدماجية'],
      objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'INTEGRATIVE' }],
    });
    expect(select([learning], 'INTEGRATIVE').selectedSituations).toHaveLength(0);
    expect(select([integrative], 'INTEGRATIVE').selectedSituations).toHaveLength(1);
  });

  it('uses deterministic requirement signals to rank a more suitable candidate', () => {
    const generic = makeSituation('generic', { sourceGoal: 'نشاط حركي عام' });
    const exact = makeSituation('exact', { sourceGoal: 'جري سريع وتغيير الاتجاه وفق إشارة' });
    expect(
      select([generic, exact], 'LEARNING', { requirements: ['speed', 'direction', 'signal'] })
        .candidates[0].situation.id
    ).toBe('exact');
  });

  it('applies phase and difficulty ranking without treating missing difficulty as basic', () => {
    const basic = makeSituation('basic', {
      difficulty: 'basic',
      phaseSuitability: ['preparatory'],
    });
    const missing = makeSituation('missing', { difficulty: null });
    expect(select([missing, basic]).candidates[0].situation.id).toBe('basic');
  });

  it('respects equipment preference, recent-use avoidance, explicit exclusions and preferences', () => {
    const old = makeSituation('old', { equipment: ['حبل'] });
    const current = makeSituation('current', { equipment: ['أقماع'] });
    const result = select([old, current, makeSituation('excluded')], 'LEARNING', {
      availableEquipment: ['أقماع'],
      previousSituationIds: ['old'],
      excludedSituationIds: ['excluded'],
      preferredSituationIds: ['current'],
    });
    expect(result.selectedSituations[0].id).toBe('current');
    expect(result.excluded).toContainEqual({ situationId: 'excluded', reason: 'EXCLUDED' });
  });

  it('uses stable situation id ascending as the final tie-breaker', () => {
    const result = select([makeSituation('zeta'), makeSituation('alpha')], 'LEARNING', {
      maxSituations: 1,
    });
    expect(result.selectedSituations.map((item) => item.id)).toEqual(['alpha']);
  });

  it('keeps confidence, evidence and provenance metadata explainable without changing semantic rank', () => {
    const result = select([
      makeSituation('with-evidence', {
        objectiveRelations: [
          {
            objectiveId: 'obj-a',
            relationType: 'DIRECT',
            confidence: 0.7,
            evidence: { source: 'reviewed' },
            relevanceScore: 0.9,
          },
        ],
      }),
    ]);
    expect(result.candidates[0].relationTypes[0]).toMatchObject({
      confidence: 0.7,
      evidence: { source: 'reviewed' },
    });
    expect(result.candidates[0].ranking.relationTier).toBe(3);
  });

  it('applies the existing timing contract and never creates a paired memo', () => {
    expect(lessonMainWorkBudgetMinutes('lvl_p1', 60)).toBe(40);
    expect(lessonMainWorkBudgetMinutes('lvl_p2', 60)).toBe(40);
    expect(lessonMainWorkBudgetMinutes('lvl_p3', 60)).toBe(40);
    expect(lessonMainWorkBudgetMinutes('lvl_p4', 90)).toBe(65);
    expect(lessonMainWorkBudgetMinutes('lvl_p5', 60)).toBe(40);
    expect(
      select([makeSituation('one'), makeSituation('two')], 'LEARNING', { maxSituations: 1 })
        .selectedSituations
    ).toHaveLength(1);
  });

  it('does not exceed a known duration budget and warns for unknown durations', () => {
    const tooLong = makeSituation('too-long', { grade: 4, gradeId: 'lvl_p4', durationMinutes: 70 });
    expect(
      select([tooLong], 'LEARNING', { gradeId: 'lvl_p4', durationMinutes: 90 }).failureCode
    ).toBe('INSUFFICIENT_DURATION_COVERAGE');
    const unknown = select([makeSituation('unknown', { durationMinutes: null })]);
    expect(unknown.selectedSituations).toHaveLength(1);
    expect(unknown.warnings).toContain('DURATION_UNKNOWN');
  });

  it('reports structured failure for an empty eligible set without random fallback', () => {
    const result = select([], 'LEARNING');
    expect(result.selectedSituations).toEqual([]);
    expect(result.failureCode).toBe('NO_ELIGIBLE_SITUATION');
  });

  it('preserves immutable memo snapshot behavior', () => {
    const source = makeSituation('snapshot', { equipment: ['كرة'], variations: 'نسخة' });
    const snapshot = snapshotSituation(source);
    snapshot.equipment.push('اختبار');
    snapshot.name = 'مذكرة';
    expect(source.equipment).toEqual(['كرة']);
    expect(source.name).toBe('snapshot');
  });
});
