import type { EducationalSituationLessonType } from './educationalSituation.selector.service';

export interface PedagogicalSituationGenerationContext {
  grade: number;
  fieldId: string;
  fieldName: string;
  finalCompetency?: string;
  objective: string;
  lessonType: EducationalSituationLessonType;
  requirements?: string[];
  equipment?: string[];
  durationMinutes?: number | null;
  learnerCount?: number | null;
  previousSituationTitles?: string[];
  difficulty?: string;
  phase?: string;
}

/**
 * Structured output for a teacher-reviewable situation. The provider boundary
 * is deliberately independent from the UI so a future provider can be added
 * without changing the memo or bank contracts.
 */
export interface GeneratedPedagogicalSituation {
  title: string;
  description: string;
  organization: string;
  equipment: string[];
  instructions: string;
  executionConditions: string;
  successCriteria: string;
  observationIndicators: string;
  variants: string;
  durationMinutes: number | null;
  grouping: string;
  phase: string;
  motorSkills: string[];
  requirements: string[];
  difficulty: string;
  tags: string[];
}

export interface PedagogicalSituationGenerationProvider {
  generate(context: PedagogicalSituationGenerationContext): GeneratedPedagogicalSituation;
}

const fieldFocus: Record<string, string> = {
  f_locomotion: 'التنقل وتغيير الاتجاه',
  f_fundamentals: 'الحركات القاعدية والتحكم الحركي',
  f_structuring: 'تنظيم الحركة والعمل الجماعي',
};

function clean(value: string | undefined): string {
  return value?.trim() || '';
}

function objectiveTitle(objective: string, fieldName: string): string {
  const normalized = clean(objective).replace(/[.،؛:]+$/u, '');
  if (!normalized) return `مسار تطبيقي في ${fieldName}`;
  return `مسار تطبيقي: ${normalized.slice(0, 70)}`;
}

/** A deterministic local provider used until a reviewed external provider is introduced. */
export const localPedagogicalSituationProvider: PedagogicalSituationGenerationProvider = {
  generate(context) {
    const focus = fieldFocus[context.fieldId] || context.fieldName;
    const equipment = Array.from(new Set((context.equipment || []).filter(Boolean)));
    const requirements = Array.from(new Set((context.requirements || []).filter(Boolean)));
    const duration = context.durationMinutes || null;
    const grouping =
      context.learnerCount && context.learnerCount > 24 ? 'أفواج صغيرة متوازية' : 'أفواج صغيرة';
    return {
      title: objectiveTitle(context.objective, context.fieldName),
      description: `ينجز المتعلمون وضعية تطبيقية في ${focus} انطلاقًا من الهدف: ${context.objective || 'تنمية الكفاءة الحركية'}. يتدرج النشاط من المحاولة المنظمة إلى إعادة الإنجاز مع احترام السلامة.`,
      organization: `${grouping} على مسارات متساوية، مع تناوب الأدوار بين الإنجاز والملاحظة.`,
      equipment,
      instructions: `عند الإشارة ينفذ المتعلم المسار المحدد وفق الهدف، ثم يعود إلى نقطة البداية بهدوء ويستبدل دوره مع زميله.`,
      executionConditions: `يحافظ المتعلم على المسافة، يتبع المسار والإشارة، ويطبق ${requirements.length ? requirements.join(' و') : 'التوجيهات الحركية'} دون دفع أو تجاوز.`,
      successCriteria: `يحقق المتعلم الهدف في محاولتين متتاليتين مع احترام المسار والتعليمات والسلامة.`,
      observationIndicators: `دقة تنفيذ الحركة، الاستجابة للإشارة، التحكم في الاتجاه، واحترام التنظيم الجماعي.`,
      variants: `للتبسيط: تقصير المسار أو تقليل عدد التعليمات. للتصعيب: تغيير الإشارة أو إضافة مسار واتجاه جديد.`,
      durationMinutes: duration,
      grouping,
      phase: context.phase || 'المرحلة الرئيسية',
      motorSkills: requirements.length ? requirements : [focus],
      requirements,
      difficulty: context.difficulty || 'متوسط',
      tags: ['موقف مولد للمراجعة', context.lessonType, context.fieldId],
    };
  },
};

export function generatePedagogicalSituation(
  context: PedagogicalSituationGenerationContext,
  provider: PedagogicalSituationGenerationProvider = localPedagogicalSituationProvider
): GeneratedPedagogicalSituation {
  if (!Number.isInteger(context.grade) || context.grade < 1 || context.grade > 5)
    throw new Error('SITUATION_GENERATION_GRADE_INVALID');
  if (!clean(context.fieldId) || !clean(context.fieldName))
    throw new Error('SITUATION_GENERATION_FIELD_INVALID');
  if (!clean(context.objective)) throw new Error('SITUATION_GENERATION_OBJECTIVE_REQUIRED');
  const generated = provider.generate({
    ...context,
    objective: context.objective.trim(),
    fieldName: context.fieldName.trim(),
  });
  if (!generated.title.trim() || !generated.description.trim() || !generated.successCriteria.trim())
    throw new Error('SITUATION_GENERATION_OUTPUT_INCOMPLETE');
  return generated;
}
