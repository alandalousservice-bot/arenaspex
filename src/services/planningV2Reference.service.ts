import type {
  TeacherLearningPlanData,
  TeacherLearningPlanDomain,
  TeacherLearningObjective,
} from '../types/spex';
import { COMPLETE_ANNUAL_CURRICULUM } from '../data/algerianCurriculum';
import {
  resolveTeacherLearningPlan,
  type TeacherLearningPlan,
} from './teacherLearningPlan.service';

export const PLANNING_V2_VERSION = 'planning-v2' as const;
export const PLANNING_V2_SEQUENCE = [
  'D',
  'L1',
  'L2',
  'L3',
  'L4',
  'I1',
  'L5',
  'L6',
  'L7',
  'L8',
  'I2',
  'S',
] as const;
export type PlanningV2Slot = (typeof PLANNING_V2_SEQUENCE)[number];
export type PlanningV2ObjectiveSource = 'CANONICAL' | 'TEACHER_OBJECTIVE' | 'LEGACY_EMBEDDED';

export interface PlanningV2Reference {
  version: typeof PLANNING_V2_VERSION;
  referenceSessionId: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  slot: PlanningV2Slot;
  sequenceIndex: number;
  lessonType: 'DIAGNOSTIC' | 'LEARNING' | 'INTEGRATIVE' | 'SUMMATIVE';
  objectiveSourceType?: PlanningV2ObjectiveSource;
  objectiveId?: string | null;
  teacherObjectiveId?: string | null;
  objective?: string;
  coveredReferenceIds?: string[];
}

export const planningV2ReferenceId = (gradeId: string, domainId: string, slot: PlanningV2Slot) =>
  `${gradeId}:${domainId}:${slot}`;

const sourceFor = (objective: TeacherLearningObjective): PlanningV2ObjectiveSource =>
  objective.teacherObjectiveId
    ? 'TEACHER_OBJECTIVE'
    : objective.sourceReferenceId
      ? 'CANONICAL'
      : 'LEGACY_EMBEDDED';

function domainPlan(
  plan: TeacherLearningPlan | TeacherLearningPlanData,
  domainId: string
): TeacherLearningPlanDomain | undefined {
  return (plan as TeacherLearningPlanData).domains.find((domain) => domain.fieldId === domainId);
}

export function buildPlanningV2References(
  gradeId: string,
  domainId: string,
  teacherLearningPlan?: TeacherLearningPlanData | TeacherLearningPlan
): PlanningV2Reference[] {
  const curriculum = COMPLETE_ANNUAL_CURRICULUM[gradeId];
  const field = curriculum?.fields[domainId];
  if (!curriculum || !field) throw new Error('PLANNING_V2_CONTEXT_INVALID');
  const plan = resolveTeacherLearningPlan(gradeId, teacherLearningPlan);
  const objectives =
    domainPlan(plan, domainId)
      ?.objectives.slice()
      .sort((a, b) => a.orderIndex - b.orderIndex) || [];
  const learning = PLANNING_V2_SEQUENCE.filter(
    (slot): slot is `L${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}` => slot.startsWith('L')
  ).map((slot, index) => {
    const objective = objectives[index];
    const reference: PlanningV2Reference = {
      version: PLANNING_V2_VERSION,
      referenceSessionId: planningV2ReferenceId(gradeId, domainId, slot),
      gradeId,
      domainId,
      finalCompetencyId: `fc_${gradeId}_${domainId}`,
      slot,
      sequenceIndex: PLANNING_V2_SEQUENCE.indexOf(slot),
      lessonType: 'LEARNING',
      objectiveSourceType: objective ? sourceFor(objective) : undefined,
      objectiveId: objective?.sourceReferenceId || null,
      teacherObjectiveId: objective?.teacherObjectiveId || null,
      objective: objective?.text || undefined,
    };
    return reference;
  });
  const bySlot = new Map(learning.map((item) => [item.slot, item]));
  const refs: PlanningV2Reference[] = PLANNING_V2_SEQUENCE.map((slot, sequenceIndex) => {
    const existing = bySlot.get(slot as (typeof learning)[number]['slot']);
    if (existing) return existing;
    const lessonType = slot === 'D' ? 'DIAGNOSTIC' : slot === 'S' ? 'SUMMATIVE' : 'INTEGRATIVE';
    const coveredSlots =
      slot === 'I1' ? ['L1', 'L2', 'L3', 'L4'] : slot === 'I2' ? ['L5', 'L6', 'L7', 'L8'] : [];
    return {
      version: PLANNING_V2_VERSION,
      referenceSessionId: planningV2ReferenceId(gradeId, domainId, slot),
      gradeId,
      domainId,
      finalCompetencyId: `fc_${gradeId}_${domainId}`,
      slot,
      sequenceIndex,
      lessonType,
      ...(coveredSlots.length
        ? {
            coveredReferenceIds: coveredSlots.map((covered) =>
              planningV2ReferenceId(gradeId, domainId, covered as PlanningV2Slot)
            ),
          }
        : {}),
    };
  });
  return refs;
}

export function markPlanningV2Plan<T extends TeacherLearningPlanData | TeacherLearningPlan>(
  plan: T
): T {
  return { ...plan, planningVersion: PLANNING_V2_VERSION } as T;
}

export function buildAllPlanningV2References(
  gradeId: string,
  plan?: TeacherLearningPlanData | TeacherLearningPlan
) {
  return ['f_locomotion', 'f_fundamentals', 'f_structuring'].flatMap((domainId) =>
    buildPlanningV2References(gradeId, domainId, plan)
  );
}
