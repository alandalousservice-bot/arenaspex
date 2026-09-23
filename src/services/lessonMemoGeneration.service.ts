import { Grade4WeeklyScheduleMode, LessonPlan } from '../types/spex';
import {
  autoGenerateLessonPlan,
  AutoGenerateContext,
  AutoGenerateSessionSource,
  LessonMemoTeacherIdentity,
} from './lessonPlan.generator.service';
import { EducationalSituation } from '../types/spex';
import type { CanonicalAssessmentScope } from '../domain/pedagogicalKnowledge/assessmentScopeAdapter';
import { resolveObjective, type TeacherObjectiveRecord } from './objectiveResolver.service';

export interface LessonMemoGenerationContext {
  teacher: LessonMemoTeacherIdentity;
  classId?: string;
  academicYearId?: string;
  classPlannedSessionId?: string;
  source: AutoGenerateSessionSource;
  pedagogicalParts?: AutoGenerateSessionSource[];
  grade4WeeklyScheduleMode?: Grade4WeeklyScheduleMode | null;
  className?: string;
  levelId?: string;
  levelName: string;
  plannedDate: string;
  durationMinutes: number;
  plannedStartTime?: string | null;
  venue?: string | null;
  inspectorName?: string;
  situations?: EducationalSituation[];
  assessmentScope?: CanonicalAssessmentScope;
  previousSituationIds?: string[];
  teacherObjective?: TeacherObjectiveRecord;
}

export interface LessonMemoTeacherProfileRecord extends LessonMemoTeacherIdentity {
  eduSchoolName?: string | null;
}

/** Maps only the DB profile belonging to the already-authenticated identity. */
export function resolveLessonMemoTeacherIdentity(
  authenticatedUserId: string,
  profile: LessonMemoTeacherProfileRecord | null | undefined
): LessonMemoTeacherIdentity {
  if (!profile || profile.id !== authenticatedUserId) {
    throw new Error('MEMO_TEACHER_PROFILE_IDENTITY_MISMATCH');
  }
  const clean = (value?: string | null) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;
  return {
    id: authenticatedUserId,
    firstName: clean(profile.firstName),
    lastName: clean(profile.lastName),
    schoolName: clean(profile.eduSchoolName) || clean(profile.schoolName),
  };
}

export function resolveMemoGenerationContext(
  context: LessonMemoGenerationContext
): LessonMemoGenerationContext {
  if (
    !context.teacher.id ||
    (context.classPlannedSessionId && (!context.classId || !context.academicYearId))
  ) {
    throw new Error('MEMO_GENERATION_CONTEXT_INVALID');
  }
  if (!context.source.referenceSessionId) {
    throw new Error('MEMO_GENERATION_REFERENCE_INVALID');
  }
  if (context.source.teacherObjectiveId && !context.teacherObjective) {
    throw new Error('OBJECTIVE_PRIVATE_REFERENCE_INVALID');
  }
  if (!Number.isFinite(context.durationMinutes) || context.durationMinutes <= 0) {
    throw new Error('MEMO_GENERATION_DURATION_INVALID');
  }
  return context;
}

export function generateLessonMemoDraft(context: LessonMemoGenerationContext): LessonPlan {
  const resolved = resolveMemoGenerationContext(context);
  const objectiveResolution = resolved.source.teacherObjectiveId
    ? resolveObjective(
        resolved.source.fieldId === 'f_locomotion' ||
          resolved.source.fieldId === 'f_fundamentals' ||
          resolved.source.fieldId === 'f_structuring'
          ? resolved.levelId || `lvl_p${String(resolved.levelName).match(/[1-5]/)?.[0] || '1'}`
          : resolved.levelId || `lvl_p${String(resolved.levelName).match(/[1-5]/)?.[0] || '1'}`,
        resolved.source.fieldId,
        {
          id: resolved.source.teacherObjectiveId,
          text: resolved.source.objective,
          orderIndex: 0,
          sourceReferenceId: null,
          teacherObjectiveId: resolved.source.teacherObjectiveId,
        },
        resolved.teacherObjective
      )
    : undefined;
  const generationContext: AutoGenerateContext = {
    teacher: resolved.teacher,
    className: resolved.className,
    levelId: resolved.levelId,
    levelName: resolved.levelName,
    classId: resolved.classId,
    academicYearId: resolved.academicYearId,
    classPlannedSessionId: resolved.classPlannedSessionId,
    referenceSessionId: resolved.source.referenceSessionId,
    date: resolved.plannedDate,
    durationMinutes: resolved.durationMinutes,
    plannedStartTime: resolved.plannedStartTime,
    venue: resolved.venue,
    inspectorName: resolved.inspectorName,
    situations: resolved.situations,
    assessmentScope: resolved.assessmentScope,
    previousSituationIds: resolved.previousSituationIds,
    grade4WeeklyScheduleMode: resolved.grade4WeeklyScheduleMode,
    pedagogicalParts: resolved.pedagogicalParts,
  };
  const plan = autoGenerateLessonPlan(resolved.source, generationContext);
  if (!objectiveResolution) return plan;
  return {
    ...plan,
    generalObjective: objectiveResolution.text,
    sessionTitle: objectiveResolution.text,
    objectiveSnapshot: objectiveResolution,
  };
}

/**
 * Keeps the UI's save boundary explicit without replacing the server's
 * ownership checks. A planned memo cannot be reassigned to another session.
 */
export function saveLessonMemo(plan: LessonPlan, existing?: LessonPlan): LessonPlan {
  if (
    existing?.classPlannedSessionId &&
    plan.classPlannedSessionId !== existing.classPlannedSessionId
  ) {
    throw new Error('MEMO_PERSISTENCE_IDENTITY_CONFLICT');
  }
  return {
    ...plan,
    manualEdits: plan.manualEdits ?? existing?.manualEdits,
  };
}

export function regenerationRequiresConfirmation(
  existing: LessonPlan | undefined,
  confirmRegeneration = false
): boolean {
  return Boolean(existing?.manualEdits && !confirmRegeneration);
}

export function loadLessonMemoForSession(
  lessonPlans: LessonPlan[],
  context: Pick<
    LessonMemoGenerationContext,
    'teacher' | 'classId' | 'academicYearId' | 'classPlannedSessionId'
  >
): LessonPlan | undefined {
  return lessonPlans.find(
    (plan) =>
      plan.teacherId === context.teacher.id &&
      plan.classId === context.classId &&
      plan.academicYearId === context.academicYearId &&
      plan.classPlannedSessionId === context.classPlannedSessionId
  );
}

export function regenerateLessonMemo(
  context: LessonMemoGenerationContext,
  existing?: LessonPlan,
  confirmRegeneration = false
): LessonPlan {
  if (regenerationRequiresConfirmation(existing, confirmRegeneration)) {
    const error = new Error('REGENERATION_CONFIRMATION_REQUIRED') as Error & { code?: string };
    error.code = 'REGENERATION_CONFIRMATION_REQUIRED';
    throw error;
  }
  const regenerated = generateLessonMemoDraft(context);
  if (existing && !existing.classPlannedSessionId) {
    return {
      ...regenerated,
      id: existing.id,
      memoSource: existing.memoSource,
    };
  }
  return regenerated;
}
