import { INITIAL_KNOWLEDGE_BANK } from '../data/knowledgeBankData';
import type { PrismaClient } from '@prisma/client';
import { isDiagnosticWeakMastery } from './assessmentMastery.js';

export const DIAGNOSTIC_INTERVENTION_STATUSES = [
  'SELECTED',
  'APPLIED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type DiagnosticInterventionStatus = (typeof DIAGNOSTIC_INTERVENTION_STATUSES)[number];

export type InterventionInput = {
  studentAssessmentId: string;
  criterionResultId: string;
  resourceId?: string | null;
  customText?: string | null;
  teacherNote?: string | null;
};

const resourceById = new Map(INITIAL_KNOWLEDGE_BANK.map((item) => [item.id, item]));

export function isDiagnosticInterventionStatus(
  value: unknown
): value is DiagnosticInterventionStatus {
  return (
    typeof value === 'string' &&
    DIAGNOSTIC_INTERVENTION_STATUSES.includes(value as DiagnosticInterventionStatus)
  );
}

export function interventionResourceSnapshot(resourceId: string) {
  const resource = resourceById.get(resourceId);
  if (!resource || resource.category !== 'remedial' || !resource.approved) return null;
  return {
    title: resource.title,
    description: resource.description,
    remedialProblem: resource.remedialProblem || null,
    targetSkill: resource.targetSkill || null,
    equipment: resource.equipment || [],
    source: resource.origin || null,
  };
}

export async function createDiagnosticIntervention(
  prisma: PrismaClient,
  teacherId: string,
  sessionId: string,
  input: InterventionInput
) {
  const session = await prisma.assessmentSession.findFirst({
    where: { id: sessionId, teacherId },
    select: { id: true, teacherId: true, assessmentType: true },
  });
  if (!session) throw new Error('INTERVENTION_SESSION_NOT_FOUND');
  if (session.assessmentType !== 'DIAGNOSTIC') throw new Error('INTERVENTION_DIAGNOSTIC_ONLY');
  const assessment = await prisma.studentAssessment.findFirst({
    where: { id: input.studentAssessmentId, assessmentSessionId: session.id },
    select: { id: true },
  });
  if (!assessment) throw new Error('INTERVENTION_ASSESSMENT_MISMATCH');
  const criterion = await prisma.criterionResult.findFirst({
    where: { id: input.criterionResultId, studentAssessmentId: assessment.id },
    select: { id: true, masteryLevel: true },
  });
  if (!criterion) throw new Error('INTERVENTION_CRITERION_MISMATCH');
  if (!isDiagnosticWeakMastery(criterion.masteryLevel)) throw new Error('INTERVENTION_NOT_WEAK');
  const customText = input.customText?.trim() || null;
  const resourceId = input.resourceId?.trim() || null;
  if (customText && resourceId) throw new Error('INTERVENTION_SINGLE_SOURCE_REQUIRED');
  if (!customText && !resourceId) throw new Error('INTERVENTION_CONTENT_REQUIRED');
  const snapshot = resourceId ? interventionResourceSnapshot(resourceId) : null;
  if (resourceId && !snapshot) throw new Error('INTERVENTION_RESOURCE_INVALID');
  return prisma.diagnosticIntervention.create({
    data: {
      id: `diagnostic_intervention_${teacherId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teacherId,
      studentAssessmentId: assessment.id,
      criterionResultId: criterion.id,
      resourceId,
      resourceTitleSnapshot: snapshot?.title || null,
      resourceBodySnapshot: snapshot || undefined,
      customText,
      teacherNote: input.teacherNote?.trim() || null,
      status: 'SELECTED',
    },
  });
}

export function transitionIntervention(
  status: DiagnosticInterventionStatus,
  current: { appliedAt?: Date | null; completedAt?: Date | null } = {},
  now = new Date()
) {
  return {
    status,
    ...(status === 'APPLIED' ? { appliedAt: current.appliedAt || now } : {}),
    ...(status === 'COMPLETED'
      ? { appliedAt: current.appliedAt || now, completedAt: current.completedAt || now }
      : {}),
  };
}
