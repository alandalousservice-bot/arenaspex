import { z } from 'zod';
import { COMPLETE_ANNUAL_CURRICULUM } from '../data/algerianCurriculum';
import type { TeacherLearningPlanData } from '../types/spex';

export const TEACHER_LEARNING_PLAN_KIND = 'teacher_learning_plan' as const;

const objectiveSchema = z.object({
  id: z.string().trim().min(1).max(160),
  text: z.string().trim().min(1).max(2000),
  orderIndex: z.number().int().positive(),
  sourceReferenceId: z.string().trim().max(240).nullable().optional(),
});

const integrationPointSchema = z.object({
  id: z.string().trim().min(1).max(160),
  afterObjectiveId: z.string().trim().max(160).nullable(),
  orderIndex: z.number().int().positive(),
  label: z.enum(['إدماجية 1', 'إدماجية 2']),
});

const teacherLearningPlanDomainSchema = z.object({
  fieldId: z.string().trim().min(1),
  finalCompetencyId: z.string().trim().max(240).optional(),
  objectives: z.array(objectiveSchema).min(1),
  integrationPoints: z.array(integrationPointSchema),
});

export const teacherLearningPlanSchema = z
  .object({
    version: z.literal(1),
    levelId: z.string().trim().min(1),
    domains: z.array(teacherLearningPlanDomainSchema).min(1),
  })
  .superRefine((plan, context) => {
    const curriculum = COMPLETE_ANNUAL_CURRICULUM[plan.levelId];
    if (!curriculum) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['levelId'],
        message: 'مستوى غير معروف.',
      });
      return;
    }

    const officialFieldIds = Object.keys(curriculum.fields);
    const seenFields = new Set<string>();
    const objectiveIds = new Set<string>();
    const integrationIds = new Set<string>();

    plan.domains.forEach((domain, domainIndex) => {
      if (!officialFieldIds.includes(domain.fieldId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['domains', domainIndex, 'fieldId'],
          message: 'الميدان غير تابع للمستوى الرسمي.',
        });
      }
      if (seenFields.has(domain.fieldId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['domains', domainIndex, 'fieldId'],
          message: 'لا يمكن تكرار الميدان داخل خطة الأستاذ.',
        });
      }
      seenFields.add(domain.fieldId);

      const domainObjectiveIds = new Set(domain.objectives.map((objective) => objective.id));
      domain.objectives.forEach((objective, objectiveIndex) => {
        if (objectiveIds.has(objective.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['domains', domainIndex, 'objectives', objectiveIndex, 'id'],
            message: 'معرّف الهدف مكرر.',
          });
        }
        objectiveIds.add(objective.id);
      });

      domain.integrationPoints.forEach((point, pointIndex) => {
        if (integrationIds.has(point.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['domains', domainIndex, 'integrationPoints', pointIndex, 'id'],
            message: 'معرّف الإدماجية مكرر.',
          });
        }
        integrationIds.add(point.id);
        if (point.afterObjectiveId !== null && !domainObjectiveIds.has(point.afterObjectiveId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['domains', domainIndex, 'integrationPoints', pointIndex, 'afterObjectiveId'],
            message: 'الإدماجية تشير إلى هدف غير موجود.',
          });
        }
      });
    });

    if (seenFields.size !== officialFieldIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['domains'],
        message: 'يجب أن تشمل الخطة الميادين الرسمية للمستوى.',
      });
    }
  });

export type TeacherLearningPlan = z.infer<typeof teacherLearningPlanSchema>;
export type TeacherLearningPlanDomain = TeacherLearningPlan['domains'][number];

export function parseTeacherLearningPlan(value: unknown): TeacherLearningPlan {
  return teacherLearningPlanSchema.parse(value);
}

/**
 * The array order is the teacher's chosen order. Numeric order metadata is
 * normalized server-side so it never becomes an identity or stale sort key.
 */
export function normalizeTeacherLearningPlan(plan: TeacherLearningPlan): TeacherLearningPlan {
  const parsed = parseTeacherLearningPlan(plan);
  return {
    ...parsed,
    domains: parsed.domains.map((domain) => ({
      ...domain,
      objectives: domain.objectives.map((objective, index) => ({
        ...objective,
        text: objective.text.trim(),
        orderIndex: index + 1,
      })),
      integrationPoints: domain.integrationPoints.map((point, index) => ({
        ...point,
        orderIndex: index + 1,
      })),
    })),
  };
}

function seedObjectiveId(levelId: string, fieldId: string, sessionNumber: number): string {
  return `teacher-objective:${levelId}:${fieldId}:${sessionNumber}`;
}

function newObjectiveId(levelId: string, fieldId: string): string {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `teacher-objective:${levelId}:${fieldId}:${randomId}`;
}

function integrationId(levelId: string, fieldId: string, label: string): string {
  return `teacher-integration:${levelId}:${fieldId}:${label}`;
}

export function seedTeacherLearningPlan(
  levelId: string,
  wordingOverrides: Record<string, { objective?: string } | undefined> = {}
): TeacherLearningPlan {
  const curriculum = COMPLETE_ANNUAL_CURRICULUM[levelId];
  if (!curriculum) throw new Error('مستوى غير معروف.');

  return normalizeTeacherLearningPlan({
    version: 1,
    levelId,
    domains: Object.values(curriculum.fields).map((field) => {
      const learningSessions = field.sessionsList.filter((session) => session.type === 'تعلمية');
      const objectives = learningSessions.map((session) => ({
        id: seedObjectiveId(levelId, field.fieldId, session.sessionNumber),
        text:
          wordingOverrides[`${field.fieldId}__${session.sessionNumber}`]?.objective?.trim() ||
          session.objective,
        orderIndex: session.sessionNumber,
        sourceReferenceId: `${field.fieldId}__${session.sessionNumber}`,
      }));
      const integrationPoints = field.sessionsList
        .filter((session) => session.type === 'إدماجية')
        .slice(0, 2)
        .map((session, index) => {
          const sessionPosition = field.sessionsList.indexOf(session);
          const objectivesBefore = learningSessions.filter(
            (learningSession) => field.sessionsList.indexOf(learningSession) < sessionPosition
          );
          const objectiveBefore = objectives.find(
            (objective) =>
              objective.sourceReferenceId ===
              `${field.fieldId}__${objectivesBefore.at(-1)?.sessionNumber}`
          );
          return {
            id: integrationId(levelId, field.fieldId, `إدماجية ${index + 1}`),
            afterObjectiveId: objectiveBefore?.id || null,
            orderIndex: index + 1,
            label: `إدماجية ${index + 1}` as 'إدماجية 1' | 'إدماجية 2',
          };
        });

      if (integrationPoints.length < 2) {
        integrationPoints.push({
          id: integrationId(levelId, field.fieldId, 'إدماجية 2'),
          afterObjectiveId: objectives.at(-2)?.id || objectives.at(-1)?.id || null,
          orderIndex: 2,
          label: 'إدماجية 2',
        });
      }

      return {
        fieldId: field.fieldId,
        finalCompetencyId: `fc_${levelId}_${field.fieldId}`,
        objectives,
        integrationPoints,
      };
    }),
  });
}

export function addTeacherLearningObjective(
  plan: TeacherLearningPlan,
  fieldId: string,
  text: string,
  id = newObjectiveId(plan.levelId, fieldId)
): TeacherLearningPlan {
  const value = text.trim();
  if (!value) throw new Error('اكتب هدفاً تعليمياً صالحاً.');
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) =>
      domain.fieldId === fieldId
        ? {
            ...domain,
            objectives: [
              ...domain.objectives,
              {
                id,
                text: value,
                orderIndex: domain.objectives.length + 1,
                sourceReferenceId: null,
              },
            ],
          }
        : domain
    ),
  });
}

export function updateTeacherLearningObjective(
  plan: TeacherLearningPlan,
  fieldId: string,
  objectiveId: string,
  text: string
): TeacherLearningPlan {
  const value = text.trim();
  if (!value) throw new Error('اكتب هدفاً تعليمياً صالحاً.');
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) =>
      domain.fieldId === fieldId
        ? {
            ...domain,
            objectives: domain.objectives.map((objective) =>
              objective.id === objectiveId ? { ...objective, text: value } : objective
            ),
          }
        : domain
    ),
  });
}

export function deleteTeacherLearningObjective(
  plan: TeacherLearningPlan,
  fieldId: string,
  objectiveId: string
): TeacherLearningPlan {
  const domain = plan.domains.find((item) => item.fieldId === fieldId);
  if (!domain || domain.objectives.length <= 1)
    throw new Error('يجب أن يحتفظ الميدان بهدف تعليمي واحد على الأقل.');
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((item) =>
      item.fieldId === fieldId
        ? {
            ...item,
            objectives: item.objectives.filter((objective) => objective.id !== objectiveId),
            integrationPoints: item.integrationPoints.map((point) =>
              point.afterObjectiveId === objectiveId ? { ...point, afterObjectiveId: null } : point
            ),
          }
        : item
    ),
  });
}

export function reorderTeacherLearningObjectives(
  plan: TeacherLearningPlan,
  fieldId: string,
  objectiveId: string,
  direction: 'up' | 'down'
): TeacherLearningPlan {
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) => {
      if (domain.fieldId !== fieldId) return domain;
      const index = domain.objectives.findIndex((objective) => objective.id === objectiveId);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= domain.objectives.length) return domain;
      const objectives = [...domain.objectives];
      [objectives[index], objectives[nextIndex]] = [objectives[nextIndex], objectives[index]];
      return { ...domain, objectives };
    }),
  });
}

export function asTeacherLearningPlanData(plan: TeacherLearningPlan): TeacherLearningPlanData {
  return normalizeTeacherLearningPlan(plan) as TeacherLearningPlanData;
}
