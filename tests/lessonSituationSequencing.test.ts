import { describe, expect, it } from 'vitest';
import type { EducationalSituation } from '../src/types/spex';
import {
  lessonPhaseBudgets,
  sequenceLessonSituations,
} from '../src/services/lessonSituationSequencing.service';

const makeSituation = (
  id: string,
  overrides: Partial<EducationalSituation> = {}
): EducationalSituation => ({
  id,
  name: id,
  grade: 1,
  gradeId: 'lvl_p1',
  fieldId: 'f_locomotion',
  domainId: 'f_locomotion',
  fieldName: 'التنقل',
  objectiveIds: ['obj-a'],
  objectiveTexts: ['الهدف أ'],
  sourceGoal: 'تنفيذ مهارة حركية وفق تعليمات',
  organization: 'مجموعات',
  equipment: ['أقماع', 'كرات'],
  origin: 'REFERENCE_SEED',
  status: 'APPROVED',
  approvalStatus: 'APPROVED',
  productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
  objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'DIRECT' }],
  ...overrides,
});

const sequence = (
  selectedSituations: EducationalSituation[],
  overrides: Partial<Parameters<typeof sequenceLessonSituations>[0]> = {}
) =>
  sequenceLessonSituations({
    gradeId: 'lvl_p1',
    fieldId: 'f_locomotion',
    objectiveId: 'obj-a',
    lessonType: 'LEARNING',
    lessonDurationMinutes: 60,
    selectedSituations,
    ...overrides,
  });

describe('MEMO-G2 lesson situation sequencing engine', () => {
  it('defines the approved 60 and 90 minute phase budgets', () => {
    expect(lessonPhaseBudgets('lvl_p1', 60)).toEqual({ warmup: 10, main: 40, final: 10 });
    expect(lessonPhaseBudgets('lvl_p4', 90)).toEqual({ warmup: 15, main: 65, final: 10 });
    expect(lessonPhaseBudgets('الرابعة', 90)).toEqual({ warmup: 15, main: 65, final: 10 });
  });

  it('is deterministic, stable by phase and id, and does not duplicate situations', () => {
    const input = [
      makeSituation('main-b', { phaseSuitability: ['main'] }),
      makeSituation('warmup-a', { phaseSuitability: ['warmup'], difficulty: 'basic' }),
      makeSituation('main-a', { phaseSuitability: ['main'] }),
    ];
    const first = sequence(input);
    const second = sequence([...input].reverse());
    expect(first).toEqual(second);
    expect(
      first.orderedActivities.filter((item) => item.situationId).map((item) => item.situationId)
    ).toEqual(['warmup-a', 'main-a', 'main-b']);
  });

  it('uses phase suitability and keeps a planner reservation when no bank item fills a phase', () => {
    const result = sequence([makeSituation('direct-main', { phaseSuitability: ['main'] })]);
    expect(result.orderedActivities.map((item) => item.id)).toEqual([
      'phase:warmup',
      'situation:direct-main',
      'phase:final',
    ]);
    expect(result.phaseTotals).toEqual({ warmup: 10, main: 40, final: 10 });
    expect(result.timingStatus).toBe('COMPLETE');
  });

  it('requires DIRECT instructional coverage in the main phase', () => {
    const result = sequence([
      makeSituation('support', {
        objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'SUPPORTIVE' }],
        phaseSuitability: ['warmup'],
      }),
    ]);
    expect(result.warnings).toContain('NO_MAIN_DIRECT_ACTIVITY');
    expect(result.timingStatus).toBe('PARTIAL');
  });

  it('keeps Grades 1-3 as one memo instance and Grade 5 on a single 60-minute plan', () => {
    for (const gradeId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p5']) {
      const result = sequence([makeSituation(`${gradeId}-main`)], { gradeId });
      expect(result.lessonDurationMinutes).toBe(60);
      expect(result.phaseTotals).toEqual({ warmup: 10, main: 40, final: 10 });
      expect(result.orderedActivities.filter((item) => item.situationId)).toHaveLength(1);
    }
  });

  it('uses the 90-minute Grade 4 allocation without inventing a paired lesson', () => {
    const result = sequence([makeSituation('grade-four-main')], {
      gradeId: 'lvl_p4',
      lessonDurationMinutes: 90,
    });
    expect(result.phaseBudgets).toEqual({ warmup: 15, main: 65, final: 10 });
    expect(result.phaseTotals).toEqual({ warmup: 15, main: 65, final: 10 });
    expect(result.orderedActivities.filter((item) => item.situationId)).toHaveLength(1);
  });

  it('orders basic/supportive preparation before direct main work and preserves equipment', () => {
    const result = sequence([
      makeSituation('direct', { phaseSuitability: ['main'], durationMinutes: 30 }),
      makeSituation('basic', {
        objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'SUPPORTIVE' }],
        phaseSuitability: ['warmup'],
        difficulty: 'basic',
        equipment: ['كرات', 'أقماع'],
      }),
    ]);
    expect(result.orderedActivities.map((item) => item.situationId).filter(Boolean)).toEqual([
      'basic',
      'direct',
    ]);
    expect(result.equipment).toEqual(['أقماع', 'كرات']);
    expect(
      result.orderedActivities.find((item) => item.situationId === 'direct')
        ?.allocatedDurationMinutes
    ).toBe(40);
  });

  it('covers integrative targets and reports missing coverage', () => {
    const complete = sequence(
      [
        makeSituation('integration', {
          objectiveIds: ['obj-a', 'obj-b'],
          objectiveRelations: [
            { objectiveId: 'obj-a', relationType: 'INTEGRATIVE' },
            { objectiveId: 'obj-b', relationType: 'INTEGRATIVE' },
          ],
        }),
      ],
      { lessonType: 'INTEGRATIVE', integratedObjectiveIds: ['obj-a', 'obj-b'] }
    );
    expect(complete.mainWorkCoverage.missingObjectiveIds).toEqual([]);
    expect(complete.warnings).not.toContain('INTEGRATIVE_COVERAGE_INCOMPLETE');

    const incomplete = sequence([makeSituation('partial', { objectiveIds: ['obj-a'] })], {
      lessonType: 'INTEGRATIVE',
      integratedObjectiveIds: ['obj-a', 'obj-b'],
    });
    expect(incomplete.warnings).toContain('INTEGRATIVE_COVERAGE_INCOMPLETE');
  });

  it('keeps diagnostic and summative activities in the assessment main phase', () => {
    for (const lessonType of ['DIAGNOSTIC', 'SUMMATIVE'] as const) {
      const result = sequence(
        [
          makeSituation(`${lessonType}-assessment`, {
            objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'ASSESSMENT' }],
            phaseSuitability: ['warmup'],
          }),
        ],
        { lessonType }
      );
      expect(result.orderedActivities.find((item) => item.situationId)?.phase).toBe(
        'المرحلة الرئيسية'
      );
      expect(result.mainWorkCoverage.hasAssessmentActivity).toBe(true);
      expect(result.warnings).not.toContain('ASSESSMENT_SEQUENCE_INCOMPLETE');
    }
  });

  it('warns when assessment coverage is missing and when duration is unknown', () => {
    const result = sequence(
      [
        makeSituation('unknown-assessment', {
          objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'SUPPORTIVE' }],
        }),
      ],
      { lessonType: 'DIAGNOSTIC' }
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining(['ASSESSMENT_SEQUENCE_INCOMPLETE', 'UNKNOWN_DURATION_ALLOCATION'])
    );
  });

  it('uses weighted known durations, explicit snapshots, and no random identifiers', () => {
    const original = makeSituation('snapshot-source', { durationMinutes: 20 });
    const result = sequence([original, makeSituation('second', { durationMinutes: 40 })]);
    const sourceActivity = result.orderedActivities.find(
      (item) => item.situationId === 'snapshot-source'
    );
    expect(sourceActivity?.allocatedDurationMinutes).toBe(13);
    expect(sourceActivity?.situationSnapshot?.situationId).toBe('snapshot-source');
    expect(original.name).toBe('snapshot-source');
    expect(result.orderedActivities.every((item) => !item.id.includes('random'))).toBe(true);
  });

  it('reports an explicit invalid result when no situations are selected', () => {
    const result = sequence([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'INSUFFICIENT_SELECTED_SITUATIONS',
        'NO_MAIN_DIRECT_ACTIVITY',
        'NO_VALID_SEQUENCE',
      ])
    );
    expect(result.timingStatus).toBe('INVALID');
  });

  it('keeps selection metadata and legacy snapshot compatibility without persistence', () => {
    const result = sequence([makeSituation('selected')], {
      selectionWarnings: ['DURATION_UNKNOWN'],
      phasePreferences: { warmup: ['warmup'] },
    });
    expect(result.warnings).toContain('UNKNOWN_DURATION_ALLOCATION');
    expect(
      result.orderedActivities.find((item) => item.situationId === 'selected')?.situationSnapshot
    ).toMatchObject({
      situationId: 'selected',
      organization: 'مجموعات',
    });
  });
});
