import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TeacherPlanningSession } from '../src/services/api';
import type { ClassRoom, LessonPlan } from '../src/types/spex';
import { autoGenerateLessonPlan } from '../src/services/lessonPlan.generator.service';
import {
  findOperationalLessonPlan,
  isOwnedOperationalSession,
  sortOperationalSessions,
} from '../src/services/lessonPlanWorkflow.service';

const lessonView = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
const generator = readFileSync('src/services/lessonPlan.generator.service.ts', 'utf8');
const planner = readFileSync('src/components/curriculum/AnnualDistributionCalendar.tsx', 'utf8');

const classRoom = {
  id: 'class-a',
  teacherId: 'teacher-a',
  levelId: 'lvl_p1',
  levelName: 'السنة الأولى ابتدائي',
  name: 'الأولى أ',
} as ClassRoom;

function session(overrides: Partial<TeacherPlanningSession> = {}): TeacherPlanningSession {
  return {
    id: 'session-1',
    teacherId: 'teacher-a',
    classId: 'class-a',
    academicYearId: '2026-2027',
    referenceSessionId: 'lvl_p1:f_fundamentals:sequence:1',
    plannedDate: '2026-09-15',
    durationMinutes: 60,
    status: 'مبرمجة',
    startTime: '08:00',
    venue: 'الملعب',
    operationalNote: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    reference: {
      referenceSessionId: 'lvl_p1:f_fundamentals:sequence:1',
      grade: 1,
      domainId: 'f_fundamentals',
      fieldName: 'الوضعيات والتنقلات',
      finalCompetency: 'كفاءة',
      learningSectionId: 'lvl_p1:f_fundamentals',
      objectiveId: 'objective-1',
      objectiveGroupId: 'group-1',
      objective: 'الهدف الأول',
      sessionType: 'تعلمية',
      sessionTypeLabel: 'تعلمية',
      sequenceIndex: 1,
      fieldSessionNumber: 1,
    },
    ...overrides,
  };
}

function plan(overrides: Partial<LessonPlan> = {}): LessonPlan {
  return {
    id: 'plan-1',
    teacherId: 'teacher-a',
    institutionName: 'مدرسة',
    teacherName: 'أستاذ',
    levelName: classRoom.levelName || '',
    className: classRoom.name,
    fieldName: 'الوضعيات والتنقلات',
    competencyTitle: 'كفاءة',
    segmentTitle: 'مقطع',
    sessionTitle: 'الهدف الأول',
    sessionType: 'تعلمية',
    date: '2026-09-15',
    durationMinutes: 60,
    equipmentNeeded: [],
    generalObjective: 'الهدف الأول',
    proceduralObjectives: { motor: '', cognitive: '' },
    warmupPhase: { duration: '10 دقيقة', generalWarmup: '', specificWarmup: '', organization: '' },
    mainPhase: {
      duration: '40 دقيقة',
      problemSituation: '',
      learningSituation1: { title: '', description: '', dosing: '', criteria: '' },
      learningSituation2: { title: '', description: '', dosing: '', criteria: '' },
      guidedApplication: { title: '', description: '', rules: '' },
    },
    coolDownPhase: { duration: '10 دقائق', activities: '', assessmentAndDialogue: '' },
    safetyRules: [],
    aiGenerated: false,
    version: 2,
    createdAt: '2026-08-30T00:00:00.000Z',
    ...overrides,
  };
}

function generationSource(planned: TeacherPlanningSession) {
  const reference = planned.reference!;
  return {
    fieldId: reference.domainId,
    fieldName: reference.fieldName,
    finalCompetency: reference.finalCompetency,
    segmentGoal: reference.objective,
    sessionNumber: reference.fieldSessionNumber,
    globalNumber: reference.sequenceIndex,
    weekNumber: 1,
    type: reference.sessionType as LessonPlan['sessionType'],
    typeLabel: reference.sessionTypeLabel,
    objective: reference.objective,
    tools: [],
  };
}

describe('session-first Lesson Memo workflow', () => {
  it('orders operational sessions by date, time, then canonical sequence', () => {
    const ordered = sortOperationalSessions([
      session({
        id: 'late',
        plannedDate: '2026-09-16',
        reference: { ...session().reference!, sequenceIndex: 1 },
      }),
      session({
        id: 'second',
        startTime: '09:00',
        reference: { ...session().reference!, sequenceIndex: 2 },
      }),
      session({
        id: 'first',
        startTime: '08:00',
        reference: { ...session().reference!, sequenceIndex: 1 },
      }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(['first', 'second', 'late']);
  });

  it('accepts only the authenticated teacher/class/year session scope', () => {
    const selected = session();
    expect(
      isOwnedOperationalSession(selected, {
        teacherId: 'teacher-a',
        classId: 'class-a',
        academicYearId: '2026-2027',
      })
    ).toBe(true);
    expect(
      isOwnedOperationalSession(session({ teacherId: 'teacher-b' }), {
        teacherId: 'teacher-a',
        classId: 'class-a',
        academicYearId: '2026-2027',
      })
    ).toBe(false);
    expect(
      isOwnedOperationalSession(session({ classId: 'class-b' }), {
        teacherId: 'teacher-a',
        classId: 'class-a',
        academicYearId: '2026-2027',
      })
    ).toBe(false);
  });

  it('reuses the existing memo only for the exact operational session identity', () => {
    const selected = session();
    const existing = plan({
      classId: selected.classId,
      academicYearId: selected.academicYearId,
      classPlannedSessionId: selected.id,
    });
    expect(findOperationalLessonPlan([existing], selected, 'teacher-a')).toBe(existing);
    expect(
      findOperationalLessonPlan([existing], session({ id: 'session-2' }), 'teacher-a')
    ).toBeUndefined();
    expect(findOperationalLessonPlan([existing], selected, 'teacher-b')).toBeUndefined();
  });

  it('persists the exact scheduled session context and date during generation', () => {
    const selected = session();
    const generated = autoGenerateLessonPlan(generationSource(selected), {
      levelName: classRoom.levelName || '',
      className: classRoom.name,
      classId: selected.classId,
      academicYearId: selected.academicYearId,
      classPlannedSessionId: selected.id,
      referenceSessionId: selected.referenceSessionId,
      date: selected.plannedDate,
      durationMinutes: selected.durationMinutes,
    });
    expect(generated.classId).toBe('class-a');
    expect(generated.academicYearId).toBe('2026-2027');
    expect(generated.classPlannedSessionId).toBe('session-1');
    expect(generated.referenceSessionId).toBe(selected.referenceSessionId);
    expect(generated.date).toBe('2026-09-15');
    expect(generated.durationMinutes).toBe(60);
  });

  it('keeps standalone generation separate from operational sessions', () => {
    const generated = autoGenerateLessonPlan(generationSource(session()), {
      levelName: classRoom.levelName || '',
    });
    expect(generated.classPlannedSessionId).toBeUndefined();
    expect(generated.classId).toBeUndefined();
    expect(generated.academicYearId).toBeUndefined();
    expect(lessonView).toContain('مذكرة مستقلة');
    expect(lessonView).toContain('هذه المذكرة غير مرتبطة بحصة مبرمجة في الكراس اليومي.');
  });

  it('uses one canonical deep-link contract and never initializes planning from memo generation', () => {
    expect(lessonView).toContain('classId');
    expect(lessonView).toContain('classPlannedSessionId');
    expect(lessonView).toContain('academicYearId');
    expect(planner).toContain('classPlannedSessionId=${encodeURIComponent(row.session.id)}');
    expect(lessonView).not.toContain('initializeTeacherPlanningSessions');
    expect(lessonView).not.toContain('/sessions/initialize');
  });

  it('preserves operational linkage fields in the generator and edit flow', () => {
    expect(generator).toContain('classPlannedSessionId: ctx.classPlannedSessionId');
    expect(generator).toContain('referenceSessionId: ctx.referenceSessionId');
    expect(lessonView).toContain('...draft');
    expect(lessonView).toContain('findOperationalLessonPlan');
  });

  it('does not provide an objective/date-only auto-link path', () => {
    expect(lessonView).not.toContain('findOperationalLessonPlan(lessonPlans, {');
    expect(lessonView).not.toContain('objective ===');
    expect(lessonView).not.toContain('plannedDate === plan.date');
  });
});
