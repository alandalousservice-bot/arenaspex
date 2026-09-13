import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { autoGenerateLessonPlan } from '../src/services/lessonPlan.generator.service';
import { generateLessonMemoDraft } from '../src/services/lessonMemoGeneration.service';
import { resolveGrade4WeeklyScheduleMode } from '../src/services/classPlanningConfiguration.service';
import type { EducationalSituation, User } from '../src/types/spex';

const teacher = {
  id: 'teacher-memo-p1',
  username: 'teacher-memo-p1',
  spexId: 'SPX-MEMO-P1',
  firstName: 'اختبار',
  lastName: 'المذكرات',
  email: 'memo-p1@example.test',
  role: 'teacher',
  directorateId: '',
  districtId: '',
  status: 'active',
} as User;

const source = {
  referenceSessionId: 'ref-memo-p1',
  fieldId: 'f_locomotion',
  fieldName: 'الميدان البدني',
  finalCompetency: 'ينجز وضعيات حركية منظمة.',
  segmentGoal: 'هدف الحصة',
  sessionNumber: 1,
  globalNumber: 1,
  weekNumber: 1,
  type: 'تقويم تشخيصي' as const,
  typeLabel: 'تقويم تشخيصي',
  objective: 'يقيس قدراته الحركية الأساسية.',
  objectiveId: 'objective-memo-p1',
  objectiveGroupId: null,
  tools: ['أقماع'],
};

function situation(
  id: string,
  relationType: 'DIRECT' | 'ASSESSMENT',
  lessonType: 'LEARNING' | 'DIAGNOSTIC' | 'SUMMATIVE' = 'DIAGNOSTIC',
  productionEligibility: EducationalSituation['productionEligibility'] = 'AUTO_GENERATION_ELIGIBLE'
): EducationalSituation {
  return {
    id,
    name: id,
    grade: 4,
    gradeId: 'lvl_p4',
    fieldId: 'f_locomotion',
    domainId: 'f_locomotion',
    fieldName: 'الميدان البدني',
    objectiveIds: ['objective-memo-p1'],
    objectiveTexts: ['هدف مختلف عن نص الحصة.'],
    sourceGoal: 'هدف تقويمي واضح',
    organization: 'أفواج صغيرة',
    equipment: ['أقماع'],
    origin: 'REFERENCE_SEED',
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    productionEligibility,
    lessonTypes: [lessonType],
    relationTypes: [relationType],
    objectiveRelations: [{ objectiveId: 'objective-memo-p1', relationType }],
    durationMinutes: 20,
  };
}

function snapshotIds(plan: ReturnType<typeof autoGenerateLessonPlan>): string[] {
  return (plan.lessonRows || [])
    .map((row) => row.situationSnapshot?.situationId)
    .filter((id): id is string => Boolean(id));
}

describe('MEMO-DEEP-CLEAN-P1', () => {
  it('uses assessment relations for single-part diagnostic and summative memos', () => {
    const diagnostic = autoGenerateLessonPlan(source, {
      teacher,
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 60,
      situations: [
        situation('diagnostic-direct', 'DIRECT'),
        situation('diagnostic-assessment', 'ASSESSMENT'),
      ],
    });
    expect(snapshotIds(diagnostic)).toContain('diagnostic-assessment');
    expect(snapshotIds(diagnostic)).not.toContain('diagnostic-direct');
    expect(diagnostic.generationWarnings?.map((warning) => warning.code)).not.toContain(
      'ASSESSMENT_COVERAGE_MISSING'
    );

    const summative = autoGenerateLessonPlan(
      { ...source, type: 'تقويم تحصيلي', typeLabel: 'تقويم تحصيلي' },
      {
        teacher,
        levelName: 'السنة الرابعة ابتدائي',
        durationMinutes: 60,
        situations: [
          situation('summative-direct', 'DIRECT', 'SUMMATIVE'),
          situation('summative-assessment', 'ASSESSMENT', 'SUMMATIVE'),
        ],
      }
    );
    expect(snapshotIds(summative)).toContain('summative-assessment');
    expect(snapshotIds(summative)).not.toContain('summative-direct');
  });

  it('returns an explicit assessment review state when assessment coverage is absent', () => {
    const plan = autoGenerateLessonPlan(source, {
      teacher,
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 60,
      situations: [situation('diagnostic-only-learning', 'DIRECT')],
    });
    expect(plan.generationWarnings?.map((warning) => warning.code)).toContain(
      'ASSESSMENT_COVERAGE_MISSING'
    );
    expect(plan.lessonRows?.some((row) => row.learningContent.includes('اختيار موقف تربوي'))).toBe(
      true
    );
  });

  it('keeps approved but review-only situations out of automatic assessment selection', () => {
    const plan = autoGenerateLessonPlan(source, {
      teacher,
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 60,
      situations: [
        situation('assessment-review-only', 'ASSESSMENT', 'DIAGNOSTIC', 'REVIEW_ONLY'),
        situation('assessment-auto', 'ASSESSMENT'),
      ],
    });
    expect(snapshotIds(plan)).toContain('assessment-auto');
    expect(snapshotIds(plan)).not.toContain('assessment-review-only');
  });

  it('preserves learning direct selection and explicit Grade 4 timing modes', () => {
    const learningSource = { ...source, type: 'تعلمية' as const, typeLabel: 'تعلمية' };
    const plan = autoGenerateLessonPlan(learningSource, {
      teacher,
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 60,
      situations: [
        situation('learning-direct', 'DIRECT', 'LEARNING'),
        situation('learning-assessment', 'ASSESSMENT', 'LEARNING'),
      ],
    });
    expect(snapshotIds(plan)).toContain('learning-direct');
    expect(snapshotIds(plan)).not.toContain('learning-assessment');

    expect(resolveGrade4WeeklyScheduleMode('TWO_45')).toBe('TWO_45');
    expect(resolveGrade4WeeklyScheduleMode('ONE_90')).toBe('ONE_90');
    expect(resolveGrade4WeeklyScheduleMode(null)).toBe('ONE_90');
    expect(
      autoGenerateLessonPlan(learningSource, {
        teacher,
        levelName: 'السنة الرابعة ابتدائي',
        grade4WeeklyScheduleMode: 'TWO_45',
        situations: [],
      }).durationMinutes
    ).toBe(45);
    expect(
      autoGenerateLessonPlan(learningSource, {
        teacher,
        levelName: 'السنة الرابعة ابتدائي',
        grade4WeeklyScheduleMode: 'ONE_90',
        situations: [],
      }).durationMinutes
    ).toBe(90);
  });

  it('allows pure standalone generation without class identity', () => {
    const plan = generateLessonMemoDraft({
      teacher,
      source,
      levelName: 'السنة الخامسة ابتدائي',
      plannedDate: '2026-10-04',
      durationMinutes: 60,
      situations: [],
    });
    expect(plan.classId).toBeUndefined();
    expect(plan.academicYearId).toBeUndefined();
    expect(plan.classPlannedSessionId).toBeUndefined();
  });

  it('uses the class-resolved annual mode and passes it through the memo contract', () => {
    const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');
    const view = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
    const generation = readFileSync('src/services/lessonMemoGeneration.service.ts', 'utf8');
    expect(apiRouter).toContain('grade4WeeklyScheduleModeForClass(classId, academicYearId)');
    expect(apiRouter).toContain('grade4WeeklyScheduleMode,');
    expect(view).toContain('grade4WeeklyScheduleMode: annualGrade4WeeklyScheduleMode');
    expect(generation).not.toContain("pedagogicalParts.length > 1 ? 'ONE_90'");
  });
});
