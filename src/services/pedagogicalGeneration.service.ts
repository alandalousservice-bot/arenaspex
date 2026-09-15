import { COMPLETE_ANNUAL_CURRICULUM } from '../data/algerianCurriculum';
import { getObjectiveBankItem } from '../data/objectiveBankRegistry';
import {
  resolveAssessmentScope,
  assessmentScopeRequirementLabels,
} from '../domain/pedagogicalKnowledge/assessmentScopeAdapter';
import type { EducationalSituationLessonType } from './educationalSituation.selector.service';

export type PedagogicalGenerationIntent =
  | 'GENERATE_SITUATION'
  | 'GENERATE_ALTERNATIVE'
  | 'GENERATE_FOR_OBJECTIVE'
  | 'ADAPT_SITUATION'
  | 'GENERATE_OBJECTIVE'
  | 'REFORMULATE_OBJECTIVE';

export interface PedagogicalSituationGenerationRequest {
  intent: PedagogicalGenerationIntent;
  gradeId: string;
  domainId: string;
  finalCompetencyId?: string | null;
  objectiveIds: string[];
  objectiveText?: string;
  lessonType: EducationalSituationLessonType;
  motorSkills: string[];
  requirements: string[];
  equipment: string[];
  availableEquipment?: string[];
  durationMinutes?: number | null;
  studentCount?: number | null;
  groupingPreference?: string;
  difficulty?: string;
  recentSituationIds: string[];
  recentSituationTitles?: string[];
  sourceSituationId?: string | null;
  sourceSituation?: {
    id: string;
    title: string;
    executionContent?: string;
  };
  teacherInstruction?: string;
}

export interface PedagogicalGenerationContext {
  readonly intent: PedagogicalGenerationIntent;
  readonly gradeId: string;
  readonly gradeName: string;
  readonly domainId: string;
  readonly domainName: string;
  readonly finalCompetencyId: string;
  readonly finalCompetency: string;
  readonly objectiveIds: readonly string[];
  readonly objectiveText: string;
  readonly objectiveLabels: readonly string[];
  readonly objectiveRequirements: readonly string[];
  readonly objectiveExecutionContent: readonly string[];
  readonly lessonType: EducationalSituationLessonType;
  readonly assessmentScope?: ReturnType<typeof resolveAssessmentScope>;
  readonly motorSkills: readonly string[];
  readonly requirements: readonly string[];
  readonly equipment: readonly string[];
  readonly availableEquipment: readonly string[];
  readonly durationMinutes: number | null;
  readonly studentCount: number | null;
  readonly groupingPreference: string;
  readonly difficulty: string;
  readonly recentSituationIds: readonly string[];
  readonly recentSituationTitles: readonly string[];
  readonly sourceSituationId: string | null;
  readonly sourceSituation?: {
    readonly id: string;
    readonly title: string;
    readonly executionContent: string;
  };
  readonly teacherInstruction: string;
}

export interface GeneratedPedagogicalSituationCandidate {
  objectiveText?: string;
  title: string;
  description: string;
  shortDescription: string;
  pedagogicalIdea: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  situationType: 'PEDAGOGICAL_SITUATION';
  lessonType: EducationalSituationLessonType;
  servedObjectiveIds: string[];
  servedObjectiveLabels: string[];
  organization: string;
  equipment: string[];
  instructions: string;
  learnerInstruction: string;
  executionSteps: string[];
  executionConditions: string;
  successCriteria: string;
  observationIndicators: string;
  variants: string;
  durationMinutes: number | null;
  studentCountGuidance: string;
  grouping: string;
  phase: string;
  motorSkills: string[];
  requirements: string[];
  difficulty: string;
  tags: string[];
  safetyNotes: string[];
  proposedRelationType: 'DIRECT' | 'INTEGRATIVE' | 'ASSESSMENT';
  governance: {
    visibility: 'PERSONAL';
    approvalStatus: 'PERSONAL';
    productionEligibility: 'REVIEW_ONLY';
    autoPublic: false;
    autoApproved: false;
  };
}

export interface PedagogicalGenerationValidation {
  status: 'VALID' | 'VALID_WITH_WARNINGS' | 'INVALID';
  errors: string[];
  warnings: string[];
}

export interface PedagogicalGenerationResult {
  context: PedagogicalGenerationContext;
  candidate: GeneratedPedagogicalSituationCandidate;
  validation: PedagogicalGenerationValidation;
}

export interface PedagogicalGenerationProvider {
  generate(context: PedagogicalGenerationContext): GeneratedPedagogicalSituationCandidate;
  generateAsync?(
    context: PedagogicalGenerationContext
  ): Promise<GeneratedPedagogicalSituationCandidate>;
}

const LESSON_TYPES: EducationalSituationLessonType[] = [
  'LEARNING',
  'INTEGRATIVE',
  'DIAGNOSTIC',
  'SUMMATIVE',
];

const FIELD_FOCUS: Record<string, string> = {
  f_locomotion: 'الوضعيات والتنقلات والتحكم في الفضاء',
  f_fundamentals: 'الحركات القاعدية والتحكم الحركي',
  f_structuring: 'تنظيم الحركة والعمل الجماعي',
};

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const normalizedText = (value: string): string => clean(value).replace(/\s+/gu, ' ');
const unique = (values: readonly string[]): string[] => [
  ...new Set(values.map(clean).filter(Boolean)),
];

function invalid(message: string): Error {
  return new Error(message);
}

export function buildPedagogicalGenerationContext(
  request: PedagogicalSituationGenerationRequest
): PedagogicalGenerationContext {
  const level = COMPLETE_ANNUAL_CURRICULUM[request.gradeId];
  const field = level?.fields[request.domainId];
  if (!level) throw invalid('GENERATION_GRADE_UNSUPPORTED');
  if (!field) throw invalid('GENERATION_DOMAIN_UNSUPPORTED');
  if (!LESSON_TYPES.includes(request.lessonType)) throw invalid('GENERATION_LESSON_TYPE_INVALID');

  const objectiveIds = unique(request.objectiveIds || []);
  const objectiveItems = objectiveIds.map((id) =>
    getObjectiveBankItem(request.gradeId, request.domainId, id)
  );
  if (objectiveItems.some((item) => !item)) throw invalid('GENERATION_OBJECTIVE_NOT_CANONICAL');
  if (request.intent === 'GENERATE_FOR_OBJECTIVE' && objectiveIds.length === 0)
    throw invalid('GENERATION_OBJECTIVE_REQUIRED');
  if (
    (request.intent === 'GENERATE_ALTERNATIVE' || request.intent === 'ADAPT_SITUATION') &&
    !clean(request.sourceSituationId)
  )
    throw invalid('GENERATION_SOURCE_REQUIRED');
  if (
    request.sourceSituation &&
    clean(request.sourceSituation.id) !== clean(request.sourceSituationId)
  ) {
    throw invalid('GENERATION_SOURCE_SCOPE_INVALID');
  }

  const finalCompetencyId =
    clean(request.finalCompetencyId) || `fc_${request.gradeId}_${request.domainId}`;
  if (finalCompetencyId !== `fc_${request.gradeId}_${request.domainId}`)
    throw invalid('GENERATION_FINAL_COMPETENCY_SCOPE_INVALID');

  const assessmentScope =
    request.lessonType === 'DIAGNOSTIC' || request.lessonType === 'SUMMATIVE'
      ? resolveAssessmentScope({
          gradeId: request.gradeId,
          domainId: request.domainId,
          finalCompetencyId,
          kind: request.lessonType === 'DIAGNOSTIC' ? 'diagnostic' : 'summative',
        })
      : undefined;
  if (assessmentScope && assessmentScope.unresolved)
    throw invalid('GENERATION_ASSESSMENT_SCOPE_UNRESOLVED');

  const objectiveLabels = objectiveItems.filter(Boolean).map((item) => item!.objectiveText);
  const objectiveRequirements = objectiveItems
    .filter(Boolean)
    .flatMap((item) => [item!.learningContent, item!.mobilizedKnowledge]);

  return {
    intent: request.intent,
    gradeId: request.gradeId,
    gradeName: level.levelName,
    domainId: request.domainId,
    domainName: field.fieldName,
    finalCompetencyId,
    finalCompetency: field.finalCompetency,
    objectiveIds,
    objectiveText: clean(request.objectiveText),
    objectiveLabels,
    objectiveRequirements: unique(objectiveRequirements),
    objectiveExecutionContent: unique(
      objectiveItems.filter(Boolean).map((item) => item!.executionContent)
    ),
    lessonType: request.lessonType,
    assessmentScope,
    motorSkills: unique(request.motorSkills || []),
    requirements: unique(request.requirements || []),
    equipment: unique(request.equipment || []),
    availableEquipment: unique(request.availableEquipment || request.equipment || []),
    durationMinutes: request.durationMinutes == null ? null : Number(request.durationMinutes),
    studentCount: request.studentCount == null ? null : Number(request.studentCount),
    groupingPreference: clean(request.groupingPreference),
    difficulty: clean(request.difficulty) || 'متوسط',
    recentSituationIds: unique(request.recentSituationIds || []),
    recentSituationTitles: unique(request.recentSituationTitles || []),
    sourceSituationId: clean(request.sourceSituationId) || null,
    sourceSituation: request.sourceSituation
      ? {
          id: clean(request.sourceSituation.id),
          title: clean(request.sourceSituation.title),
          executionContent: clean(request.sourceSituation.executionContent),
        }
      : undefined,
    teacherInstruction: clean(request.teacherInstruction),
  };
}

export const deterministicPedagogicalGenerationProvider: PedagogicalGenerationProvider = {
  generate(context) {
    const focus = FIELD_FOCUS[context.domainId] || context.domainName;
    const objective = context.objectiveLabels[0] || context.finalCompetency;
    const assessmentRequirements = context.assessmentScope
      ? assessmentScopeRequirementLabels(context.assessmentScope)
      : [];
    const requirements = unique([
      ...context.requirements,
      ...assessmentRequirements,
      ...context.objectiveRequirements,
    ]);
    const relation =
      context.lessonType === 'DIAGNOSTIC' || context.lessonType === 'SUMMATIVE'
        ? 'ASSESSMENT'
        : context.lessonType === 'INTEGRATIVE'
          ? 'INTEGRATIVE'
          : 'DIRECT';
    const alternative = context.intent === 'GENERATE_ALTERNATIVE' ? 'بديل تطبيقي — ' : '';
    const grouping =
      context.groupingPreference ||
      (context.studentCount && context.studentCount > 24 ? 'أفواج صغيرة متوازية' : 'أفواج صغيرة');
    const steps = [
      `يهيئ الأستاذ فضاءً منظمًا في ${focus} ويشرح الهدف والمعيار.`,
      `ينجز المتعلمون ${objective} في مسارات متساوية مع تناوب الأدوار.`,
      context.intent === 'GENERATE_ALTERNATIVE'
        ? 'يغير المتعلمون ترتيب المسارات والأدوار ثم يعيدون الإنجاز بإشارة منظمة.'
        : 'يعيد المتعلمون الإنجاز مع تصحيح واحد واضح ثم ينهون النشاط بإشارة منظمة.',
    ];
    return {
      title: `${alternative}موقف تطبيقي: ${objective.replace(/[.،؛:]+$/u, '').slice(0, 80)}`,
      objectiveText:
        context.intent === 'GENERATE_OBJECTIVE' || context.intent === 'REFORMULATE_OBJECTIVE'
          ? objective
          : undefined,
      description: `وضعية تربوية منظمة في ${focus} تخدم الهدف المرجعي دون تغيير صياغته، وتتيح الملاحظة والتدرج الآمن.`,
      shortDescription: `وضعية منظمة تخدم ${objective}.`,
      pedagogicalIdea: `توظيف ${focus} في إنجاز قابل للملاحظة والتدرج.`,
      gradeId: context.gradeId,
      domainId: context.domainId,
      finalCompetencyId: context.finalCompetencyId,
      situationType: 'PEDAGOGICAL_SITUATION',
      lessonType: context.lessonType,
      servedObjectiveIds: [...context.objectiveIds],
      servedObjectiveLabels: [...context.objectiveLabels],
      organization: `${grouping} على مسارات متساوية، مع تناوب الأدوار بين الإنجاز والملاحظة.`,
      equipment: [...context.availableEquipment],
      instructions:
        'عند الإشارة ينفذ المتعلم المسار المحدد وفق الهدف، ثم يعود إلى نقطة البداية بهدوء ويستبدل دوره.',
      learnerInstruction: `أنجز ${objective} وفق المسار والإشارة واحترم سلامة زملائك.`,
      executionSteps: steps,
      executionConditions: `يحافظ المتعلم على المسافة ويتبع التعليمات دون دفع أو تجاوز${requirements.length ? `، مع مراعاة ${requirements.slice(0, 2).join(' و')}` : ''}.`,
      successCriteria:
        context.lessonType === 'DIAGNOSTIC' || context.lessonType === 'SUMMATIVE'
          ? 'تظهر الاستجابة القابلة للملاحظة وفق عناصر التقويم المحددة في السياق المرجعي.'
          : 'يحقق المتعلم الهدف في محاولتين متتاليتين مع احترام المسار والتعليمات والسلامة.',
      observationIndicators:
        context.lessonType === 'DIAGNOSTIC' || context.lessonType === 'SUMMATIVE'
          ? 'تسجل الملاحظة على المعايير والمؤشرات المرجعية دون إضافة معيار غير معتمد.'
          : 'دقة تنفيذ الحركة، الاستجابة للتعليمات، التحكم في المسار، واحترام التنظيم الجماعي.',
      variants:
        'للتبسيط: تقصير المسار أو تقليل عدد التعليمات. للتصعيب: تغيير الإشارة أو إضافة مسار جديد.',
      durationMinutes: context.durationMinutes,
      studentCountGuidance: context.studentCount
        ? `ينظم النشاط وفق عدد المتعلمين المصرح به: ${context.studentCount}.`
        : 'يضبط الأستاذ عدد الأفواج وفق مساحة الممارسة.',
      grouping,
      phase: 'المرحلة الرئيسية',
      motorSkills: [...context.motorSkills],
      requirements,
      difficulty: context.difficulty,
      tags: ['موقف تربوي', 'مراجعة الأستاذ'],
      safetyNotes: ['احترام المسافات', 'منع الدفع والتجاوز', 'إيقاف النشاط عند الحاجة'],
      proposedRelationType: relation,
      governance: {
        visibility: 'PERSONAL',
        approvalStatus: 'PERSONAL',
        productionEligibility: 'REVIEW_ONLY',
        autoPublic: false,
        autoApproved: false,
      },
    };
  },
};

export function normalizePedagogicalCandidate(
  candidate: GeneratedPedagogicalSituationCandidate
): GeneratedPedagogicalSituationCandidate {
  return {
    ...candidate,
    title: clean(candidate.title),
    description: clean(candidate.description),
    shortDescription: clean(candidate.shortDescription),
    pedagogicalIdea: clean(candidate.pedagogicalIdea),
    organization: clean(candidate.organization),
    equipment: unique(candidate.equipment),
    instructions: clean(candidate.instructions),
    learnerInstruction: clean(candidate.learnerInstruction),
    executionSteps: unique(candidate.executionSteps),
    executionConditions: clean(candidate.executionConditions),
    successCriteria: clean(candidate.successCriteria),
    observationIndicators: clean(candidate.observationIndicators),
    variants: clean(candidate.variants),
    studentCountGuidance: clean(candidate.studentCountGuidance),
    grouping: clean(candidate.grouping),
    phase: clean(candidate.phase),
    motorSkills: unique(candidate.motorSkills),
    requirements: unique(candidate.requirements),
    tags: unique(candidate.tags),
    safetyNotes: unique(candidate.safetyNotes),
    servedObjectiveIds: unique(candidate.servedObjectiveIds),
    servedObjectiveLabels: unique(candidate.servedObjectiveLabels),
    durationMinutes:
      candidate.durationMinutes == null ? null : Math.round(candidate.durationMinutes),
  };
}

export function validatePedagogicalCandidate(
  context: PedagogicalGenerationContext,
  candidate: GeneratedPedagogicalSituationCandidate
): PedagogicalGenerationValidation {
  const errors: string[] = [];
  const normalized = normalizePedagogicalCandidate(candidate);
  if (context.intent === 'GENERATE_OBJECTIVE' || context.intent === 'REFORMULATE_OBJECTIVE') {
    if (!normalized.objectiveText?.trim()) errors.push('GENERATION_OBJECTIVE_OUTPUT_INCOMPLETE');
    if (normalized.gradeId !== context.gradeId || normalized.domainId !== context.domainId)
      errors.push('GENERATION_SCOPE_MISMATCH');
    if (normalized.finalCompetencyId !== context.finalCompetencyId)
      errors.push('GENERATION_COMPETENCY_MISMATCH');
    return { status: errors.length ? 'INVALID' : 'VALID', errors, warnings: [] };
  }
  if (
    !normalized.title ||
    !normalized.description ||
    !normalized.shortDescription ||
    !normalized.pedagogicalIdea ||
    !normalized.organization
  )
    errors.push('GENERATION_OUTPUT_INCOMPLETE');
  if (!normalized.instructions || !normalized.executionSteps.length)
    errors.push('GENERATION_EXECUTION_INCOMPLETE');
  if (!normalized.successCriteria || !normalized.observationIndicators)
    errors.push('GENERATION_OBSERVATION_INCOMPLETE');
  if (normalized.gradeId !== context.gradeId || normalized.domainId !== context.domainId)
    errors.push('GENERATION_SCOPE_MISMATCH');
  if (normalized.finalCompetencyId !== context.finalCompetencyId)
    errors.push('GENERATION_COMPETENCY_MISMATCH');
  if (normalized.lessonType !== context.lessonType) errors.push('GENERATION_LESSON_TYPE_MISMATCH');
  if (normalized.servedObjectiveIds.some((id) => !context.objectiveIds.includes(id)))
    errors.push('GENERATION_OBJECTIVE_NOT_REQUESTED');
  if (context.lessonType === 'LEARNING' && normalized.proposedRelationType !== 'DIRECT')
    errors.push('GENERATION_DIRECT_RELATION_REQUIRED');
  if (context.lessonType === 'INTEGRATIVE' && normalized.proposedRelationType !== 'INTEGRATIVE')
    errors.push('GENERATION_INTEGRATIVE_RELATION_REQUIRED');
  if (
    (context.lessonType === 'DIAGNOSTIC' || context.lessonType === 'SUMMATIVE') &&
    normalized.proposedRelationType !== 'ASSESSMENT'
  )
    errors.push('GENERATION_ASSESSMENT_RELATION_REQUIRED');
  if (context.durationMinutes != null && normalized.durationMinutes !== context.durationMinutes)
    errors.push('GENERATION_DURATION_MISMATCH');
  if (
    normalized.durationMinutes != null &&
    (!Number.isFinite(normalized.durationMinutes) ||
      normalized.durationMinutes <= 0 ||
      normalized.durationMinutes > 180)
  )
    errors.push('GENERATION_DURATION_INVALID');
  if (
    context.intent === 'GENERATE_ALTERNATIVE' &&
    context.sourceSituation &&
    (normalizedText(normalized.title) === normalizedText(context.sourceSituation.title) ||
      normalizedText(normalized.executionSteps.join(' ')) ===
        normalizedText(context.sourceSituation.executionContent))
  )
    errors.push('GENERATION_ALTERNATIVE_NOT_DISTINCT');
  const forbidden = /\b(?:openai|gemini|claude|llm|provider|prompt|token|api key|ذكاء اصطناعي)\b/iu;
  if (
    [
      normalized.title,
      normalized.description,
      normalized.instructions,
      normalized.organization,
    ].some((value) => forbidden.test(value))
  )
    errors.push('GENERATION_PROVIDER_CONTENT_FORBIDDEN');
  if (
    normalized.governance.autoPublic ||
    normalized.governance.autoApproved ||
    normalized.governance.approvalStatus !== 'PERSONAL'
  )
    errors.push('GENERATION_GOVERNANCE_INVALID');
  return { status: errors.length ? 'INVALID' : 'VALID', errors, warnings: [] };
}

export function generatePedagogicalSituation(
  request: PedagogicalSituationGenerationRequest,
  provider: PedagogicalGenerationProvider = deterministicPedagogicalGenerationProvider
): PedagogicalGenerationResult {
  const context = buildPedagogicalGenerationContext(request);
  let candidate: GeneratedPedagogicalSituationCandidate;
  try {
    candidate = normalizePedagogicalCandidate(provider.generate(context));
  } catch {
    throw invalid('GENERATION_PROVIDER_FAILED');
  }
  const validation = validatePedagogicalCandidate(context, candidate);
  if (validation.status === 'INVALID')
    throw invalid(validation.errors[0] || 'GENERATION_OUTPUT_INVALID');
  return { context, candidate, validation };
}

export async function generatePedagogicalSituationAsync(
  request: PedagogicalSituationGenerationRequest,
  provider: PedagogicalGenerationProvider
): Promise<PedagogicalGenerationResult> {
  const context = buildPedagogicalGenerationContext(request);
  let candidate: GeneratedPedagogicalSituationCandidate;
  try {
    candidate = normalizePedagogicalCandidate(
      provider.generateAsync ? await provider.generateAsync(context) : provider.generate(context)
    );
  } catch {
    throw invalid('GENERATION_PROVIDER_FAILED');
  }
  const validation = validatePedagogicalCandidate(context, candidate);
  if (validation.status === 'INVALID')
    throw invalid(validation.errors[0] || 'GENERATION_OUTPUT_INVALID');
  return { context, candidate, validation };
}

export function resolvePedagogicalGenerationProvider(): PedagogicalGenerationProvider | null {
  const configured = (process.env.PEDAGOGICAL_GENERATION_PROVIDER || '').trim().toLowerCase();
  if (configured === 'openai') return null;
  if (
    (process.env.NODE_ENV !== 'production' &&
      process.env.PEDAGOGICAL_GENERATION_ALLOW_LOCAL === 'true') ||
    configured === 'deterministic'
  )
    return deterministicPedagogicalGenerationProvider;
  return null;
}
