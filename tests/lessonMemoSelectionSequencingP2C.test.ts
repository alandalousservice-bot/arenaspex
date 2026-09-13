import { describe, expect, it } from 'vitest';
import { autoGenerateLessonPlan } from '../src/services/lessonPlan.generator.service';
import type { EducationalSituation } from '../src/types/spex';

const source = (
  type: 'تعلمية' | 'تقويم تشخيصي' | 'إدماجية' | 'تقويم تحصيلي',
  objectiveId = 'obj-1'
) => ({
  referenceSessionId: `p2c-${type}`,
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  finalCompetency: 'كفاءة حركية منظمة.',
  segmentGoal: 'هدف المقطع',
  sessionNumber: 1,
  globalNumber: 1,
  weekNumber: 1,
  type,
  typeLabel: type,
  objective: 'ينجز مساراً حركياً منظماً.',
  objectiveId,
  objectiveGroupId: null,
  tools: ['أقماع'],
});

function situation(
  id: string,
  relationType: 'DIRECT' | 'INTEGRATIVE' | 'ASSESSMENT',
  lessonType: 'LEARNING' | 'INTEGRATIVE' | 'DIAGNOSTIC' | 'SUMMATIVE',
  objectiveIds = ['obj-1']
): EducationalSituation {
  return {
    id,
    name: id,
    grade: 4,
    gradeId: 'lvl_p4',
    fieldId: 'f_locomotion',
    domainId: 'f_locomotion',
    fieldName: 'الوضعيات والتنقلات',
    objectiveIds,
    objectiveTexts: ['هدف مختلف عن نص الحصة.'],
    sourceGoal: 'هدف الحصة',
    organization: 'أفواج صغيرة',
    equipment: ['أقماع'],
    origin: 'REFERENCE_SEED',
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
    lessonTypes: [lessonType],
    relationTypes: [relationType],
    objectiveRelations: objectiveIds.map((objectiveId) => ({ objectiveId, relationType })),
    durationMinutes: 20,
  };
}

function snapshotIds(plan: ReturnType<typeof autoGenerateLessonPlan>): string[] {
  return (plan.lessonRows ?? [])
    .map((row) => row.situationSnapshot?.situationId)
    .filter((id): id is string => Boolean(id));
}

function phaseTotals(plan: ReturnType<typeof autoGenerateLessonPlan>) {
  return (plan.lessonRows ?? []).reduce(
    (totals, row) => {
      totals[row.phase] += row.durationMinutes;
      return totals;
    },
    { 'المرحلة التحضيرية': 0, 'المرحلة الرئيسية': 0, 'المرحلة الختامية': 0 }
  );
}

describe('MEMO-DEEP-CLEAN-P2C characterization', () => {
  it.each([
    ['LEARNING', 'تعلمية' as const, 'DIRECT' as const],
    ['DIAGNOSTIC', 'تقويم تشخيصي' as const, 'ASSESSMENT' as const],
    ['SUMMATIVE', 'تقويم تحصيلي' as const, 'ASSESSMENT' as const],
  ])('keeps canonical selection output for %s', (_label, type, relationType) => {
    const plan = autoGenerateLessonPlan(source(type), {
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 60,
      situations: [
        situation(`${type}-1`, relationType, _label as 'LEARNING' | 'DIAGNOSTIC' | 'SUMMATIVE'),
      ],
    });
    expect(snapshotIds(plan)).toEqual([`${type}-1`]);
    expect(phaseTotals(plan)).toEqual({
      'المرحلة التحضيرية': 10,
      'المرحلة الرئيسية': 40,
      'المرحلة الختامية': 10,
    });
    expect(plan.generationWarnings).toEqual([]);
  });

  it('keeps integrative selection, objective coverage, and deterministic order', () => {
    const plan = autoGenerateLessonPlan(source('إدماجية', 'obj-1'), {
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 90,
      situations: [
        situation('integrative-1', 'INTEGRATIVE', 'INTEGRATIVE', ['obj-1']),
        situation('integrative-2', 'INTEGRATIVE', 'INTEGRATIVE', ['obj-2']),
      ],
      pedagogicalParts: [source('إدماجية', 'obj-1'), source('إدماجية', 'obj-2')],
    });
    expect(snapshotIds(plan)).toEqual(['integrative-1', 'integrative-2']);
    expect(phaseTotals(plan)).toEqual({
      'المرحلة التحضيرية': 15,
      'المرحلة الرئيسية': 65,
      'المرحلة الختامية': 10,
    });
    expect(plan.generationWarnings).toEqual([]);
  });

  it.each([
    ['السنة الرابعة ابتدائي', 45, 10, 30, 5],
    ['السنة الرابعة ابتدائي', 90, 15, 65, 10],
    ['السنة الخامسة ابتدائي', 60, 10, 40, 10],
  ])('preserves phase totals for %s/%s minutes', (levelName, duration, warmup, main, final) => {
    const plan = autoGenerateLessonPlan(source('تعلمية'), {
      levelName,
      durationMinutes: duration,
      situations: [situation('timed-learning', 'DIRECT', 'LEARNING')],
    });
    expect(phaseTotals(plan)).toEqual({
      'المرحلة التحضيرية': warmup,
      'المرحلة الرئيسية': main,
      'المرحلة الختامية': final,
    });
    expect(plan.durationMinutes).toBe(duration);
  });

  it('preserves Grade 4 TWO_45 and ONE_90 operational mode timing', () => {
    const two45 = autoGenerateLessonPlan(source('تعلمية'), {
      levelName: 'السنة الرابعة ابتدائي',
      grade4WeeklyScheduleMode: 'TWO_45',
      situations: [],
    });
    const one90 = autoGenerateLessonPlan(source('تعلمية'), {
      levelName: 'السنة الرابعة ابتدائي',
      grade4WeeklyScheduleMode: 'ONE_90',
      situations: [],
    });
    expect(two45.durationMinutes).toBe(45);
    expect(phaseTotals(two45)).toEqual({
      'المرحلة التحضيرية': 10,
      'المرحلة الرئيسية': 30,
      'المرحلة الختامية': 5,
    });
    expect(one90.durationMinutes).toBe(90);
    expect(phaseTotals(one90)).toEqual({
      'المرحلة التحضيرية': 15,
      'المرحلة الرئيسية': 65,
      'المرحلة الختامية': 10,
    });
  });

  it('keeps explicit review warnings when no canonical candidate can satisfy the lesson', () => {
    const plan = autoGenerateLessonPlan(source('تعلمية'), {
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 60,
      situations: [situation('assessment-only', 'ASSESSMENT', 'LEARNING')],
    });
    expect(snapshotIds(plan)).toEqual([]);
    expect(plan.generationWarnings?.map((warning) => warning.code)).toContain('NO_DIRECT_MATCH');
  });
});
