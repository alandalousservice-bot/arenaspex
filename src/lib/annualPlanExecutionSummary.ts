import type { TeacherLearningPlanDomain } from '../services/teacherLearningPlan.service';

export interface AnnualPlanExecutionSummary {
  selectedObjectiveCount: number;
  learningMeetingCount: number;
  diagnosticMeetingCount: number;
  integrationMeetingCount: number;
  summativeMeetingCount: number;
  plannedMeetingCount: number;
  meetingDurationMinutes: number;
  plannedExecutionMinutes: number;
  plannedExecutionHours: number;
}

function gradeFromLevelId(levelId: string): number {
  return Number(levelId.match(/(\d+)$/)?.[1] || 0);
}

export function meetingDurationMinutesForLevel(levelId: string): number {
  return gradeFromLevelId(levelId) === 4 ? 90 : 60;
}

function isMeaningfulObjective(objective: TeacherLearningPlanDomain['objectives'][number]) {
  if (objective.isPlaceholder && !objective.text.trim()) return false;
  return Boolean(
    objective.text.trim() ||
    objective.sourceReferenceId ||
    objective.competencyComponentIds?.length ||
    objective.learningContent?.trim() ||
    objective.executionContent?.trim() ||
    objective.situations?.length
  );
}

/** Derives workload from the teacher's current domain plan, never from a bank or class count. */
export function buildAnnualPlanExecutionSummary(
  levelId: string,
  domain: TeacherLearningPlanDomain
): AnnualPlanExecutionSummary {
  const grade = gradeFromLevelId(levelId);
  const selectedObjectiveCount = domain.objectives.filter(isMeaningfulObjective).length;
  const learningMeetingCount = selectedObjectiveCount * (grade >= 1 && grade <= 4 ? 2 : 1);
  const diagnosticMeetingCount = domain.diagnostic ? 1 : 0;
  const integrationMeetingCount = domain.integrationPoints.length;
  const summativeMeetingCount = domain.summative ? 1 : 0;
  const plannedMeetingCount =
    learningMeetingCount + diagnosticMeetingCount + integrationMeetingCount + summativeMeetingCount;
  const meetingDurationMinutes = meetingDurationMinutesForLevel(levelId);
  const plannedExecutionMinutes = plannedMeetingCount * meetingDurationMinutes;
  return {
    selectedObjectiveCount,
    learningMeetingCount,
    diagnosticMeetingCount,
    integrationMeetingCount,
    summativeMeetingCount,
    plannedMeetingCount,
    meetingDurationMinutes,
    plannedExecutionMinutes,
    plannedExecutionHours: plannedExecutionMinutes / 60,
  };
}
