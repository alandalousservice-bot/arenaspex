import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { autoGenerateLessonPlan } from '../src/services/lessonPlan.generator.service';

const memoView = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
const commandCenter = readFileSync('src/components/lesson/LessonCommandCenterView.tsx', 'utf8');
const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
const router = readFileSync('src/server/apiRouter.ts', 'utf8');

describe('scheduled Lesson Memo binding', () => {
  it('resolves exact scheduled context and rejects fallback selection', () => {
    expect(memoView).toContain('fetchTeacherPlanningSessions');
    expect(memoView).toContain("query.get('classPlannedSessionId')");
    expect(memoView).toContain('scheduledMode');
    expect(memoView).toContain('scheduledContext.session.id');
    expect(memoView).toContain('حصة مبرمجة');
    expect(memoView).not.toContain('مذكرة مرجعية/غير مرتبطة بحصة مبرمجة');
  });

  it('generates a grade-four scheduled memo at 90 minutes with balanced rows', () => {
    const plan = autoGenerateLessonPlan(
      {
        fieldId: 'f_fundamentals',
        fieldName: 'الميدان البدني',
        finalCompetency: 'كفاءة ختامية',
        segmentGoal: 'هدف المقطع',
        sessionNumber: 1,
        globalNumber: 1,
        weekNumber: 1,
        type: 'تعلمية',
        typeLabel: 'تعلمية',
        objective: 'ينجز تنقلات حركية منظمة.',
        tools: ['أقماع'],
      },
      {
        levelName: 'السنة الرابعة ابتدائي',
        className: 'السنة الرابعة أ',
        classPlannedSessionId: 'cps-class-year-ref',
        academicYearId: '2026-2027',
        classId: 'class-a',
        date: '2026-09-10',
        durationMinutes: 90,
      }
    );
    expect(plan.id).toBe('lp_session_cps-class-year-ref');
    expect(plan.classPlannedSessionId).toBe('cps-class-year-ref');
    expect(plan.durationMinutes).toBe(90);
    expect(plan.lessonRows?.reduce((sum, row) => sum + row.durationMinutes, 0)).toBe(90);
  });

  it('keeps Command Center and completion on the same planned-session identity', () => {
    expect(commandCenter).toContain('currentSession.classPlannedSessionId');
    expect(commandCenter).toContain('onCompletePlannedSession');
    expect(commandCenter).toContain('classPlannedSessionId: currentSession.classPlannedSessionId');
    expect(store).toContain('updateTeacherPlanningSession(classId, sessionId, { status })');
    expect(store).toContain('if (entry.classPlannedSessionId)');
  });

  it('protects scheduled memo ownership and prevents relation reassignment', () => {
    expect(router).toContain('validatePlannedLesson');
    expect(router).toContain('id: item.classPlannedSessionId');
    expect(router).toContain('teacherId: user.id');
    expect(router).toContain('لا يمكن نقل المذكرة إلى حصة تشغيلية أخرى.');
  });
});
