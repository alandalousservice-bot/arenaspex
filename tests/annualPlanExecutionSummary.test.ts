import { describe, expect, it } from 'vitest';
import { buildAnnualPlanExecutionSummary } from '../src/lib/annualPlanExecutionSummary';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';

const domain = (levelId: string) => seedTeacherLearningPlan(levelId).domains[0];

describe('Annual Plan execution summary', () => {
  it('uses selected objectives and integrations, with paired meetings for G1-G4', () => {
    const value = domain('lvl_p3');
    value.objectives = value.objectives.slice(0, 6);
    value.integrationPoints = value.integrationPoints.slice(0, 2);
    const summary = buildAnnualPlanExecutionSummary('lvl_p3', value);
    expect(summary).toMatchObject({
      selectedObjectiveCount: 6,
      learningMeetingCount: 12,
      diagnosticMeetingCount: 1,
      integrationMeetingCount: 2,
      summativeMeetingCount: 1,
      plannedMeetingCount: 16,
      plannedExecutionMinutes: 960,
      plannedExecutionHours: 16,
    });
  });

  it('keeps G5 at one meeting per objective and G4 at 90 minutes', () => {
    const g5 = domain('lvl_p5');
    g5.objectives = g5.objectives.slice(0, 5);
    g5.integrationPoints = g5.integrationPoints.slice(0, 2);
    expect(buildAnnualPlanExecutionSummary('lvl_p5', g5)).toMatchObject({
      selectedObjectiveCount: 5,
      learningMeetingCount: 5,
      plannedMeetingCount: 9,
      plannedExecutionHours: 9,
    });
    const g4 = domain('lvl_p4');
    g4.objectives = g4.objectives.slice(0, 5);
    expect(buildAnnualPlanExecutionSummary('lvl_p4', g4).meetingDurationMinutes).toBe(90);
  });

  it('does not depend on objective bank size or class count', () => {
    const value = domain('lvl_p1');
    value.objectives = value.objectives.slice(0, 3);
    const first = buildAnnualPlanExecutionSummary('lvl_p1', value);
    const second = buildAnnualPlanExecutionSummary('lvl_p1', {
      ...value,
      objectives: value.objectives.slice(),
    });
    expect(second).toEqual(first);
  });
});
