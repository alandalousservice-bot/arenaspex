import { describe, expect, it } from 'vitest';
import {
  generateLearningObjectivePath,
  validateLearningObjectivePath,
} from '../src/services/learningObjectivePath.service';

describe('adaptive learning objective paths', () => {
  it.each([6, 7, 8] as const)('generates complete %s-lesson coverage', (count) => {
    const path = generateLearningObjectivePath({
      gradeId: 'lvl_p1',
      domainId: 'f_fundamentals',
      finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
      learningLessonCount: count,
    });
    expect(path.objectives).toHaveLength(count);
    expect(path.coverage.coveredRequirementIds.sort()).toEqual(
      path.coverage.requiredRequirementIds.sort()
    );
  });

  it('rejects unsupported counts and incomplete or foreign coverage', () => {
    expect(() =>
      generateLearningObjectivePath({
        gradeId: 'lvl_p1',
        domainId: 'f_fundamentals',
        finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
        learningLessonCount: 5 as 6,
      })
    ).toThrow('OBJECTIVE_PATH_COUNT_UNSUPPORTED');
    expect(() =>
      validateLearningObjectivePath(
        {
          gradeId: 'lvl_p1',
          domainId: 'f_fundamentals',
          finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
          learningLessonCount: 7,
        },
        {
          learningLessonCount: 7,
          gradeId: 'lvl_p1',
          domainId: 'f_fundamentals',
          finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
          objectives: Array.from({ length: 7 }, (_, i) => ({
            position: i + 1,
            text: 'هدف',
            coveredRequirementIds: ['foreign'],
          })),
          coverage: { requiredRequirementIds: [], coveredRequirementIds: [] },
        }
      )
    ).toThrow('OBJECTIVE_PATH_REQUIREMENT_INVALID');
  });
});
