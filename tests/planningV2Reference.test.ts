import { describe, expect, it } from 'vitest';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import {
  buildAllPlanningV2References,
  buildPlanningV2References,
  markPlanningV2Plan,
  PLANNING_V2_SEQUENCE,
} from '../src/services/planningV2Reference.service';

describe('Planning V2 reference contract', () => {
  it.each(['lvl_p1', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    'builds the approved 12-slot sequence for %s',
    (gradeId) => {
      const refs = buildAllPlanningV2References(gradeId, seedTeacherLearningPlan(gradeId));
      expect(refs).toHaveLength(36);
      expect(refs.filter((ref) => ref.domainId === 'f_locomotion').map((ref) => ref.slot)).toEqual([
        ...PLANNING_V2_SEQUENCE,
      ]);
    }
  );

  it('keeps identity independent from wording and isolates I1/I2 coverage', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const first = buildPlanningV2References('lvl_p1', 'f_fundamentals', plan);
    const changed = structuredClone(plan);
    changed.domains[1].objectives[0].text = 'صياغة مختلفة';
    const second = buildPlanningV2References('lvl_p1', 'f_fundamentals', changed);
    expect(second.map((ref) => ref.referenceSessionId)).toEqual(
      first.map((ref) => ref.referenceSessionId)
    );
    expect(first.find((ref) => ref.slot === 'I1')?.coveredReferenceIds).toEqual(
      ['L1', 'L2', 'L3', 'L4'].map((slot) => `lvl_p1:f_fundamentals:${slot}`)
    );
    expect(first.find((ref) => ref.slot === 'I2')?.coveredReferenceIds).toEqual(
      ['L5', 'L6', 'L7', 'L8'].map((slot) => `lvl_p1:f_fundamentals:${slot}`)
    );
  });

  it('represents diagnostic and summative without learning objectives', () => {
    const refs = buildPlanningV2References(
      'lvl_p2',
      'f_locomotion',
      seedTeacherLearningPlan('lvl_p2')
    );
    expect(refs.find((ref) => ref.slot === 'D')).toMatchObject({ lessonType: 'DIAGNOSTIC' });
    expect(refs.find((ref) => ref.slot === 'S')).toMatchObject({ lessonType: 'SUMMATIVE' });
    expect(refs.find((ref) => ref.slot === 'D')).not.toHaveProperty('objectiveId');
    expect(refs.find((ref) => ref.slot === 'S')).not.toHaveProperty('objectiveId');
  });

  it('preserves canonical and teacher-owned objective source identity', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const domain = plan.domains.find((item) => item.fieldId === 'f_fundamentals')!;
    domain.objectives = [
      { ...domain.objectives[0], sourceReferenceId: 'G1-D2-OBJ-01' },
      {
        ...domain.objectives[1],
        sourceReferenceId: undefined,
        teacherObjectiveId: 'teacher-objective-qa-1',
      },
    ];
    const refs = buildPlanningV2References('lvl_p1', 'f_fundamentals', plan);
    expect(refs.find((item) => item.slot === 'L1')).toMatchObject({
      objectiveSourceType: 'CANONICAL',
      objectiveId: 'G1-D2-OBJ-01',
    });
    expect(refs.find((item) => item.slot === 'L2')).toMatchObject({
      objectiveSourceType: 'TEACHER_OBJECTIVE',
      teacherObjectiveId: 'teacher-objective-qa-1',
    });
  });

  it('marks explicit V2 writes without mutating legacy plan identity', () => {
    const legacy = seedTeacherLearningPlan('lvl_p1');
    expect(legacy.planningVersion).toBeUndefined();
    expect(markPlanningV2Plan(legacy, 7).learningLessonCount).toBe(7);
    expect(markPlanningV2Plan(legacy, 7).planningVersion).toBe('planning-v2');
    expect(
      buildPlanningV2References('lvl_p1', 'f_fundamentals', markPlanningV2Plan(legacy, 7))
    ).toHaveLength(11);
    expect(
      buildPlanningV2References('lvl_p1', 'f_fundamentals', markPlanningV2Plan(legacy, 7)).map(
        (item) => item.slot
      )
    ).toEqual(['D', 'L1', 'L2', 'L3', 'L4', 'I1', 'L5', 'L6', 'L7', 'I2', 'S']);
  });

  it('composes six learning references with 3+3 integrative coverage', () => {
    const plan = markPlanningV2Plan(seedTeacherLearningPlan('lvl_p1'), 6);
    const refs = buildPlanningV2References('lvl_p1', 'f_locomotion', plan);
    expect(refs.filter((ref) => ref.lessonType === 'LEARNING')).toHaveLength(6);
    expect(refs).toHaveLength(10);
    expect(refs.find((ref) => ref.slot === 'I1')?.coveredReferenceIds).toHaveLength(3);
    expect(refs.find((ref) => ref.slot === 'I2')?.coveredReferenceIds).toHaveLength(3);
  });

  it('preserves heterogeneous 7/6/6 counts across plan serialization and reload', () => {
    const plan = markPlanningV2Plan(seedTeacherLearningPlan('lvl_p1'), 7);
    const persisted = {
      ...plan,
      domains: plan.domains.map((domain, index) => ({
        ...domain,
        objectives: domain.objectives.slice(0, index === 0 ? 7 : 6),
      })),
    };
    const reloaded = JSON.parse(JSON.stringify(persisted));
    expect(reloaded.learningLessonCount).toBe(7);
    const counts = [7, 6, 6];
    const references = reloaded.domains.map((domain: { fieldId: string }, index: number) =>
      buildPlanningV2References('lvl_p1', domain.fieldId, {
        ...reloaded,
        learningLessonCount: counts[index],
      })
    );
    expect(references.map((items) => items.length)).toEqual([11, 10, 10]);
    expect(references.flat().map((item) => item.referenceSessionId)).toHaveLength(31);
  });
});
