import { describe, expect, it } from 'vitest';
import { autoGenerateLessonPlan } from '../src/services/lessonPlan.generator.service';
import {
  annualDistributionLessonMemoIdFor,
  isAnnualDistributionLessonMemo,
  scheduledLessonMemoIdFor,
  standaloneLessonMemoIdFor,
} from '../src/services/lessonMemoIdentity.service';
import { regenerateLessonMemo } from '../src/services/lessonMemoGeneration.service';
import type { LessonPlan, User } from '../src/types/spex';

const teacher = {
  id: 'teacher-p2b',
  username: 'teacher-p2b',
  spexId: 'SPX-P2B',
  firstName: 'اختبار',
  lastName: 'الهوية',
  email: 'memo-p2b@example.test',
  role: 'teacher',
  directorateId: '',
  districtId: '',
  status: 'active',
} as User;

const source = {
  referenceSessionId: 'lvl_p4:f_locomotion:sequence:7',
  fieldId: 'f_locomotion',
  fieldName: 'الميدان الأول',
  finalCompetency: 'كفاءة ختامية',
  segmentGoal: 'هدف المقطع',
  sessionNumber: 3,
  globalNumber: 7,
  weekNumber: 4,
  type: 'تعلمية' as const,
  typeLabel: 'تعلمية 3',
  objective: 'هدف ثابت',
  tools: ['أقماع'],
};

function generatedSource(objective: string) {
  return { ...source, objective };
}

function plan(overrides: Partial<LessonPlan> = {}): LessonPlan {
  return {
    id: 'legacy-standalone-memo',
    memoSource: 'standalone',
    teacherId: teacher.id,
    institutionName: '',
    teacherName: '',
    levelName: 'السنة الرابعة ابتدائي',
    className: '',
    fieldName: source.fieldName,
    competencyTitle: source.finalCompetency,
    segmentTitle: source.fieldName,
    sessionTitle: source.objective,
    sessionType: 'تعلمية',
    date: '2026-10-04',
    durationMinutes: 60,
    equipmentNeeded: [],
    generalObjective: source.objective,
    proceduralObjectives: { motor: '', cognitive: '' },
    warmupPhase: {
      duration: '10 دقيقة',
      generalWarmup: '',
      specificWarmup: '',
      organization: '',
    },
    mainPhase: {
      duration: '40 دقيقة',
      problemSituation: '',
      learningSituation1: { title: '', description: '', dosing: '', criteria: '' },
      learningSituation2: { title: '', description: '', dosing: '', criteria: '' },
      guidedApplication: { title: '', description: '', rules: '' },
    },
    coolDownPhase: { duration: '10 دقيقة', activities: '', assessmentAndDialogue: '' },
    safetyRules: [],
    aiGenerated: true,
    version: 1,
    createdAt: '2026-10-04T08:00:00.000Z',
    ...overrides,
  };
}

describe('MEMO-DEEP-CLEAN-P2B', () => {
  it('uses stable structural identity for the same standalone reference', () => {
    const first = autoGenerateLessonPlan(generatedSource('صياغة أولى'), {
      teacher,
      levelName: teacher.username,
    });
    const second = autoGenerateLessonPlan(generatedSource('صياغة معدلة'), {
      teacher,
      levelName: teacher.username,
    });
    expect(first.id).toBe(second.id);
    expect(first.id).toBe(
      standaloneLessonMemoIdFor({
        teacherId: teacher.id,
        referenceSessionId: source.referenceSessionId,
      })
    );
  });

  it('separates annual identity by teacher, class, year, and reference', () => {
    const base = annualDistributionLessonMemoIdFor({
      teacherId: teacher.id,
      classId: 'class-a',
      academicYearId: '2026-2027',
      referenceSessionId: source.referenceSessionId,
    });
    expect(base).not.toBe(
      annualDistributionLessonMemoIdFor({
        teacherId: teacher.id,
        classId: 'class-a',
        academicYearId: '2027-2028',
        referenceSessionId: source.referenceSessionId,
      })
    );
    expect(base).not.toBe(
      annualDistributionLessonMemoIdFor({
        teacherId: teacher.id,
        classId: 'class-b',
        academicYearId: '2026-2027',
        referenceSessionId: source.referenceSessionId,
      })
    );
    expect(base).not.toBe(
      annualDistributionLessonMemoIdFor({
        teacherId: teacher.id,
        classId: 'class-a',
        academicYearId: '2026-2027',
        referenceSessionId: 'lvl_p5:f_locomotion:sequence:7',
      })
    );
    expect(
      isAnnualDistributionLessonMemo(
        plan({
          id: 'lp_annual_legacy_class_2026-2027_reference',
          memoSource: undefined,
          classPlannedSessionId: undefined,
        })
      )
    ).toBe(true);
  });

  it('keeps scheduled identity bound to the operational session', () => {
    expect(scheduledLessonMemoIdFor('cps-g4-two45-a')).not.toBe(
      scheduledLessonMemoIdFor('cps-g4-two45-b')
    );
    expect(scheduledLessonMemoIdFor('cps-g4-one90')).toBe('lp_session_cps-g4-one90');
  });

  it('preserves an existing standalone or annual identity during regeneration', () => {
    const existing = plan({ id: 'lp_annual_legacy_class_2026-2027_reference' });
    const regenerated = regenerateLessonMemo(
      {
        teacher,
        levelName: existing.levelName,
        classId: 'class-a',
        academicYearId: '2026-2027',
        plannedDate: existing.date,
        durationMinutes: existing.durationMinutes,
        source,
      },
      existing,
      true
    );
    expect(regenerated.id).toBe(existing.id);
    expect(regenerated.memoSource).toBe(existing.memoSource);
  });
});
