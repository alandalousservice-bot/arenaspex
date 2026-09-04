import { z } from 'zod';
import { COMPLETE_ANNUAL_CURRICULUM } from '../data/algerianCurriculum';
import type { TeacherLearningPlanData } from '../types/spex';

export const TEACHER_LEARNING_PLAN_KIND = 'teacher_learning_plan' as const;

const objectiveSchema = z.object({
  id: z.string().trim().min(1).max(160),
  text: z.string().trim().min(1).max(2000),
  orderIndex: z.number().int().positive(),
  sourceReferenceId: z.string().trim().max(240).nullable().optional(),
  learningContent: z.string().trim().max(4000).optional(),
  executionContent: z.string().trim().max(4000).optional(),
  resources: z.array(z.string().trim().max(500)).max(30).optional(),
  pedagogicalKnowledge: z.string().trim().max(2000).optional(),
  guidance: z.string().trim().max(2000).optional(),
  teacherNotes: z.string().trim().max(2000).optional(),
  situations: z
    .array(
      z.object({
        situationId: z.string().trim().min(1),
        name: z.string().trim().min(1).max(500),
        organization: z.string().trim().max(1000),
        equipment: z.array(z.string().trim().max(500)).max(30),
        variations: z.string().trim().max(2000).optional(),
      })
    )
    .max(20)
    .optional(),
});

const integrationPointSchema = z.object({
  id: z.string().trim().min(1).max(160),
  afterObjectiveId: z.string().trim().max(160).nullable(),
  orderIndex: z.number().int().positive(),
  label: z.string().trim().min(1).max(100),
  objective: z.string().trim().max(2000).optional(),
  learningContent: z.string().trim().max(4000).optional(),
  executionContent: z.string().trim().max(4000).optional(),
  resources: z.array(z.string().trim().max(500)).max(30).optional(),
  pedagogicalKnowledge: z.string().trim().max(2000).optional(),
  guidance: z.string().trim().max(2000).optional(),
  teacherNotes: z.string().trim().max(2000).optional(),
  situations: objectiveSchema.shape.situations,
});

const teacherLearningPlanDomainSchema = z.object({
  fieldId: z.string().trim().min(1),
  finalCompetencyId: z.string().trim().max(240).optional(),
  objectives: z.array(objectiveSchema).min(1),
  integrationPoints: z.array(integrationPointSchema),
});

const teacherLearningPlanShapeSchema = z.object({
  version: z.literal(1),
  levelId: z.string().trim().min(1),
  domains: z.array(teacherLearningPlanDomainSchema).min(1),
});

export const teacherLearningPlanSchema = teacherLearningPlanShapeSchema.superRefine(
  (plan, context) => {
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
  }
);

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
  const shaped = teacherLearningPlanShapeSchema.parse(plan);
  const seenObjectiveIds = new Set<string>();
  const seenIntegrationIds = new Set<string>();
  const sanitized = {
    ...shaped,
    domains: shaped.domains.map((domain) => {
      const domainObjectiveIds = new Set<string>();
      const objectives = domain.objectives.filter((objective) => {
        if (seenObjectiveIds.has(objective.id) || domainObjectiveIds.has(objective.id)) {
          return false;
        }
        seenObjectiveIds.add(objective.id);
        domainObjectiveIds.add(objective.id);
        return true;
      });
      const labels = new Set<string>();
      const integrationPoints = domain.integrationPoints
        .filter((point) => {
          if (seenIntegrationIds.has(point.id) || labels.has(point.label)) return false;
          seenIntegrationIds.add(point.id);
          labels.add(point.label);
          return true;
        })
        .map((point) =>
          point.afterObjectiveId && !domainObjectiveIds.has(point.afterObjectiveId)
            ? { ...point, afterObjectiveId: null }
            : point
        );
      return { ...domain, objectives, integrationPoints };
    }),
  };
  const parsed = teacherLearningPlanSchema.parse(sanitized);
  return {
    ...parsed,
    domains: parsed.domains.map((domain) => ({
      ...domain,
      objectives: domain.objectives.map((objective, index) => ({
        ...objective,
        text: objective.text.trim(),
        orderIndex: index + 1,
        learningContent: objective.learningContent?.trim() || '',
        executionContent: objective.executionContent?.trim() || '',
        resources: objective.resources || [],
        pedagogicalKnowledge: objective.pedagogicalKnowledge?.trim() || '',
        guidance: objective.guidance?.trim() || '',
        teacherNotes: objective.teacherNotes?.trim() || '',
        situations: objective.situations || [],
      })),
      integrationPoints: [...domain.integrationPoints]
        .sort((left, right) => {
          const objectivePosition = new Map(
            domain.objectives.map((objective, objectiveIndex) => [objective.id, objectiveIndex])
          );
          const leftPosition = left.afterObjectiveId
            ? (objectivePosition.get(left.afterObjectiveId) ?? -1)
            : -1;
          const rightPosition = right.afterObjectiveId
            ? (objectivePosition.get(right.afterObjectiveId) ?? -1)
            : -1;
          return leftPosition - rightPosition || left.orderIndex - right.orderIndex;
        })
        .map((point, index) => ({
          ...point,
          orderIndex: index + 1,
          label: `إدماجية ${index + 1}`,
          objective: point.objective?.trim() || '',
          learningContent: point.learningContent?.trim() || '',
          executionContent: point.executionContent?.trim() || '',
          resources: point.resources || [],
          pedagogicalKnowledge: point.pedagogicalKnowledge?.trim() || '',
          guidance: point.guidance?.trim() || '',
          teacherNotes: point.teacherNotes?.trim() || '',
          situations: point.situations || [],
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

function newIntegrationId(levelId: string, fieldId: string): string {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `teacher-integration:${levelId}:${fieldId}:${randomId}`;
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
            label: `إدماجية ${index + 1}`,
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

/** Resolve a persisted plan when valid, otherwise bootstrap one from the
 * official curriculum and compatible legacy wording overrides. */
export function resolveTeacherLearningPlan(
  levelId: string,
  persistedPlan: unknown,
  wordingOverrides: Record<string, { objective?: string } | undefined> = {}
): TeacherLearningPlan {
  const shaped = teacherLearningPlanShapeSchema.safeParse(persistedPlan);
  if (shaped.success && shaped.data.levelId === levelId) {
    try {
      return normalizeTeacherLearningPlan(shaped.data);
    } catch {
      // Invalid persisted structure falls back to the immutable official seed.
    }
  }
  return seedTeacherLearningPlan(levelId, wordingOverrides);
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

type TeacherLearningItemFields = {
  text?: string;
  objective?: string;
  learningContent?: string;
  executionContent?: string;
  resources?: string[];
  pedagogicalKnowledge?: string;
  guidance?: string;
  teacherNotes?: string;
  situations?: TeacherLearningPlan['domains'][number]['objectives'][number]['situations'];
};

export function updateTeacherLearningObjectiveDetails(
  plan: TeacherLearningPlan,
  fieldId: string,
  objectiveId: string,
  fields: TeacherLearningItemFields
): TeacherLearningPlan {
  const text = fields.text?.trim();
  if (fields.text !== undefined && !text) throw new Error('اكتب هدفاً تعليمياً صالحاً.');
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) =>
      domain.fieldId === fieldId
        ? {
            ...domain,
            objectives: domain.objectives.map((objective) =>
              objective.id === objectiveId
                ? {
                    ...objective,
                    ...(text === undefined ? {} : { text }),
                    ...fields,
                    ...(text === undefined ? {} : { text }),
                  }
                : objective
            ),
          }
        : domain
    ),
  });
}

export function addTeacherLearningIntegration(
  plan: TeacherLearningPlan,
  fieldId: string,
  afterObjectiveId: string | null,
  fields: TeacherLearningItemFields = {}
): TeacherLearningPlan {
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) =>
      domain.fieldId === fieldId
        ? {
            ...domain,
            integrationPoints: [
              ...domain.integrationPoints,
              {
                id: newIntegrationId(plan.levelId, fieldId),
                afterObjectiveId,
                orderIndex: domain.integrationPoints.length + 1,
                label: `إدماجية ${domain.integrationPoints.length + 1}`,
                objective: fields.objective?.trim() || '',
                learningContent: fields.learningContent?.trim() || '',
                executionContent: fields.executionContent?.trim() || '',
                resources: fields.resources || [],
                pedagogicalKnowledge: fields.pedagogicalKnowledge?.trim() || '',
                guidance: fields.guidance?.trim() || '',
                teacherNotes: fields.teacherNotes?.trim() || '',
                situations: fields.situations || [],
              },
            ],
          }
        : domain
    ),
  });
}

export function updateTeacherLearningIntegration(
  plan: TeacherLearningPlan,
  fieldId: string,
  integrationIdValue: string,
  fields: TeacherLearningItemFields & { afterObjectiveId?: string | null }
): TeacherLearningPlan {
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) =>
      domain.fieldId === fieldId
        ? {
            ...domain,
            integrationPoints: domain.integrationPoints.map((point) =>
              point.id === integrationIdValue
                ? {
                    ...point,
                    ...fields,
                    ...(fields.objective === undefined
                      ? {}
                      : { objective: fields.objective.trim() }),
                  }
                : point
            ),
          }
        : domain
    ),
  });
}

export function deleteTeacherLearningIntegration(
  plan: TeacherLearningPlan,
  fieldId: string,
  integrationIdValue: string
): TeacherLearningPlan {
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) =>
      domain.fieldId === fieldId
        ? {
            ...domain,
            integrationPoints: domain.integrationPoints.filter(
              (point) => point.id !== integrationIdValue
            ),
          }
        : domain
    ),
  });
}

export function reorderTeacherLearningIntegrations(
  plan: TeacherLearningPlan,
  fieldId: string,
  integrationIdValue: string,
  direction: 'up' | 'down'
): TeacherLearningPlan {
  return normalizeTeacherLearningPlan({
    ...plan,
    domains: plan.domains.map((domain) => {
      if (domain.fieldId !== fieldId) return domain;
      const index = domain.integrationPoints.findIndex((point) => point.id === integrationIdValue);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= domain.integrationPoints.length) return domain;
      const integrationPoints = [...domain.integrationPoints];
      [integrationPoints[index], integrationPoints[nextIndex]] = [
        integrationPoints[nextIndex],
        integrationPoints[index],
      ];
      return { ...domain, integrationPoints };
    }),
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
