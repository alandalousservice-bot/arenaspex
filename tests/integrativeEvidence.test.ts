import { describe, expect, it } from 'vitest';
import {
  deriveIntegrativeEvidence,
  deriveIntegrativeOptions,
} from '../src/services/integrativeEvidence.service';

function plan(objectiveCount: number) {
  const objectives = Array.from({ length: objectiveCount }, (_, index) => ({
    id: `objective-${index + 1}`,
    text: `هدف ${index + 1}`,
    orderIndex: index + 1,
    sourceReferenceId: `ref-${index + 1}`,
    teacherObjectiveId: null,
  }));
  return {
    version: 1 as const,
    levelId: 'lvl_p4',
    domains: [
      {
        fieldId: 'f_fundamentals',
        objectives,
        integrationPoints: [
          {
            id: 'integration-1',
            afterObjectiveId: objectives[Math.floor(objectiveCount / 2) - 1].id,
            orderIndex: 1,
            label: 'إدماجية 1',
          },
          {
            id: 'integration-2',
            afterObjectiveId: objectives[objectiveCount - 1].id,
            orderIndex: 2,
            label: 'إدماجية 2',
          },
        ],
      },
    ],
  } as any;
}

describe('durable integrative evidence', () => {
  it('derives distinct first and second blocks from plan anchors', () => {
    const value = plan(6);
    const first = deriveIntegrativeEvidence(value, 'f_fundamentals', 'integration-1', {
      gradeLevelId: 'lvl_p4',
      finalCompetencyId: 'fc_lvl_p4_fundamentals',
    });
    const second = deriveIntegrativeEvidence(value, 'f_fundamentals', 'integration-2', {
      gradeLevelId: 'lvl_p4',
      finalCompetencyId: 'fc_lvl_p4_fundamentals',
    });
    expect(first.number).toBe(1);
    expect(second.number).toBe(2);
    expect(first.coveredReferences.map((item) => item.referenceId)).toEqual([
      'ref-1',
      'ref-2',
      'ref-3',
    ]);
    expect(second.coveredReferences.map((item) => item.referenceId)).toEqual([
      'ref-4',
      'ref-5',
      'ref-6',
    ]);
  });

  it('supports dynamic block sizes and deduplicates pedagogical references', () => {
    const value = plan(5);
    value.domains[0].objectives[1].sourceReferenceId =
      value.domains[0].objectives[0].sourceReferenceId;
    const first = deriveIntegrativeEvidence(value, 'f_fundamentals', 'integration-1', {
      gradeLevelId: 'lvl_p4',
      finalCompetencyId: null,
    });
    expect(first.coveredReferences).toHaveLength(1);
    expect(new Set(first.coveredReferences.map((item) => item.referenceId)).size).toBe(1);
  });

  it('exposes standalone options in server order with semantic labels', () => {
    const options = deriveIntegrativeOptions(plan(7), 'f_fundamentals', {
      gradeLevelId: 'lvl_p4',
      finalCompetencyId: 'fc_lvl_p4_fundamentals',
    });
    expect(options.map((item) => [item.pointId, item.number, item.label])).toEqual([
      ['integration-1', 1, 'إدماجية 1'],
      ['integration-2', 2, 'إدماجية 2'],
    ]);
    expect(options[0].coveredReferences.map((item) => item.objectiveText)).toEqual([
      'هدف 1',
      'هدف 2',
      'هدف 3',
    ]);
  });

  it('does not fabricate options for an unknown domain', () => {
    expect(
      deriveIntegrativeOptions(plan(6), 'f_locomotion', {
        gradeLevelId: 'lvl_p4',
        finalCompetencyId: 'fc_lvl_p4_locomotion',
      })
    ).toEqual([]);
  });
});
