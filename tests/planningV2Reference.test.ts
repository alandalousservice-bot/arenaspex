import { describe, expect, it } from 'vitest';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import {
  buildAllPlanningV2References,
  buildPlanningV2References,
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
});
