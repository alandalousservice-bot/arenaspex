import type {
  EducationalSituation,
  EducationalSituationSnapshot,
  LessonPhaseName,
} from '../types/spex';
import type {
  EducationalSituationLessonType,
  RequirementCoverage,
  SituationSelectionCandidate,
} from './educationalSituation.selector.service';
import { snapshotSituation } from './educationalSituation.selector.service';

export type SequencingWarning =
  | 'NO_MAIN_DIRECT_ACTIVITY'
  | 'INTEGRATIVE_COVERAGE_INCOMPLETE'
  | 'ASSESSMENT_SEQUENCE_INCOMPLETE'
  | 'PHASE_BUDGET_UNFILLED'
  | 'PHASE_BUDGET_OVERFLOW'
  | 'UNKNOWN_DURATION_ALLOCATION'
  | 'INSUFFICIENT_SELECTED_SITUATIONS'
  | 'NO_VALID_SEQUENCE';
export type TimingStatus = 'COMPLETE' | 'PARTIAL' | 'INVALID';

export interface LessonPhaseBudgets {
  warmup: number;
  main: number;
  final: number;
}

export interface MainWorkCoverage {
  requiredObjectiveIds: string[];
  coveredObjectiveIds: string[];
  missingObjectiveIds: string[];
  hasDirectActivity: boolean;
  hasAssessmentActivity: boolean;
}

export interface SequencedLessonActivity {
  id: string;
  situationId: string | null;
  title: string;
  phase: LessonPhaseName;
  allocatedDurationMinutes: number;
  sourceDurationMinutes: number | null;
  allocationSource: 'SOURCE_DURATION_WEIGHTED' | 'PLANNER_DERIVED' | 'PHASE_RESERVATION';
  difficulty: string | null;
  relationType: string | null;
  objectiveIds: string[];
  instructionalRationale: string;
  equipment: string[];
  situationSnapshot?: EducationalSituationSnapshot;
}

export interface LessonSituationSequencingInput {
  gradeId: string | number;
  fieldId: string;
  objectiveId?: string;
  lessonType: EducationalSituationLessonType;
  lessonDurationMinutes: number;
  selectedSituations: Array<EducationalSituation | SituationSelectionCandidate>;
  selectionWarnings?: string[];
  integratedObjectiveIds?: string[];
  requirements?: string[];
  phasePreferences?: Partial<Record<'warmup' | 'main' | 'final', string[]>>;
}

export interface LessonSituationSequence {
  lessonDurationMinutes: number;
  phaseBudgets: LessonPhaseBudgets;
  orderedActivities: SequencedLessonActivity[];
  phaseTotals: LessonPhaseBudgets;
  mainWorkCoverage: MainWorkCoverage;
  equipment: string[];
  warnings: SequencingWarning[];
  timingStatus: TimingStatus;
  pedagogicalRationale: string;
}

type Candidate = {
  situation: EducationalSituation;
  sourceIndex: number;
  selectorRank: number;
  objectiveIds: string[];
  relationType: string | null;
  requirementCoverage: RequirementCoverage | null;
};

const labels: Record<'warmup' | 'main' | 'final', LessonPhaseName> = {
  warmup: 'المرحلة التحضيرية',
  main: 'المرحلة الرئيسية',
  final: 'المرحلة الختامية',
};
const phaseOrder: Array<'warmup' | 'main' | 'final'> = ['warmup', 'main', 'final'];

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('ar')
    .normalize('NFKC')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function gradeNumber(value: string | number): number {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function lessonPhaseBudgets(
  gradeId: string | number,
  lessonDurationMinutes: number
): LessonPhaseBudgets {
  if (lessonDurationMinutes === 90 || gradeNumber(gradeId) === 4)
    return { warmup: 15, main: 65, final: 10 };
  if (lessonDurationMinutes === 60) return { warmup: 10, main: 40, final: 10 };
  const edge = Math.min(10, Math.max(1, Math.floor(lessonDurationMinutes / 5)));
  return { warmup: edge, main: Math.max(1, lessonDurationMinutes - edge * 2), final: edge };
}

function unwrap(
  value: EducationalSituation | SituationSelectionCandidate,
  index: number
): Candidate {
  if ('situation' in value && 'ranking' in value) {
    const relation =
      value.relationTypes.find((item) => value.matchedObjectiveIds.includes(item.objectiveId)) ??
      value.relationTypes[0];
    return {
      situation: value.situation,
      sourceIndex: index,
      selectorRank:
        value.ranking.relationTier * 100 + value.ranking.requirementRatio * 10 - index / 1000,
      objectiveIds: value.matchedObjectiveIds.length
        ? value.matchedObjectiveIds
        : value.situation.objectiveIds,
      relationType: relation?.relationType ?? null,
      requirementCoverage: value.requirementCoverage,
    };
  }
  return {
    situation: value,
    sourceIndex: index,
    selectorRank: 0,
    objectiveIds: value.objectiveIds,
    relationType: value.objectiveRelations?.[0]?.relationType ?? value.relationTypes?.[0] ?? null,
    requirementCoverage: null,
  };
}

function difficultyRank(value: string | null | undefined): number {
  if (!value) return 0;
  const normalized = normalize(value);
  if (/basic|اساس|بسيط/.test(normalized)) return 1;
  if (/controlled|موجه|متحكم/.test(normalized)) return 2;
  if (/complex|مركب|تحد/.test(normalized)) return 3;
  return 2;
}

function relationRank(candidate: Candidate, lessonType: EducationalSituationLessonType): number {
  if (lessonType === 'LEARNING')
    return candidate.relationType === 'DIRECT'
      ? 3
      : candidate.relationType === 'SUPPORTIVE'
        ? 1
        : 0;
  if (lessonType === 'INTEGRATIVE')
    return candidate.relationType === 'INTEGRATIVE'
      ? 3
      : candidate.relationType === 'DIRECT'
        ? 2
        : 0;
  return candidate.relationType === 'ASSESSMENT' ? 3 : 0;
}

function choosePhase(
  candidate: Candidate,
  input: LessonSituationSequencingInput
): 'warmup' | 'main' | 'final' {
  if (input.lessonType === 'DIAGNOSTIC' || input.lessonType === 'SUMMATIVE') return 'main';
  const suitability = (candidate.situation.phaseSuitability ?? []).map(normalize);
  const preferred = phaseOrder.find((phase) =>
    input.phasePreferences?.[phase]?.some((value) => suitability.includes(normalize(value)))
  );
  if (preferred) return preferred;
  if (suitability.some((value) => /warm|prepar|تهيئ|احماء/.test(value))) return 'warmup';
  if (suitability.some((value) => /final|close|ختام|تهدئ/.test(value))) return 'final';
  if (
    candidate.relationType === 'SUPPORTIVE' &&
    difficultyRank(candidate.situation.difficulty) <= 1
  )
    return 'warmup';
  return 'main';
}

function rationale(
  candidate: Candidate,
  phase: 'warmup' | 'main' | 'final',
  lessonType: EducationalSituationLessonType
): string {
  if (lessonType === 'DIAGNOSTIC')
    return 'موقف ملاحظاتي لجمع أدلة قابلة للرصد دون تحويل التقويم إلى تدرج تعليمي.';
  if (lessonType === 'SUMMATIVE') return 'موقف تقويمي تمثيلي يحافظ على صلاحية الحكم النهائي.';
  if (lessonType === 'INTEGRATIVE')
    return candidate.relationType === 'INTEGRATIVE'
      ? 'توظيف مدمج للأهداف السابقة في تطبيق مترابط.'
      : 'تغطية مباشرة لهدف مدمج لم يكتمل في الموقف المدمج.';
  if (phase === 'warmup') return 'تنشيط تمهيدي أو دعم مبكر يهيئ للعمل الأساسي.';
  if (phase === 'final') return 'تطبيق ختامي أو عودة هادئة وفق ملاءمة الموقف.';
  return candidate.relationType === 'DIRECT'
    ? 'عمل أساسي مباشر على الهدف التعلمي.'
    : 'دعم تكميلي بعد تثبيت العمل المباشر.';
}

function aggregateEquipment(candidates: Candidate[]): string[] {
  const values = new Map<string, string>();
  for (const candidate of candidates)
    for (const item of candidate.situation.equipment ?? []) {
      const label = item.replace(/\s+/g, ' ').trim();
      if (label) values.set(normalize(label), values.get(normalize(label)) ?? label);
    }
  return [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'ar'))
    .map(([, label]) => label);
}

function allocate(
  activities: SequencedLessonActivity[],
  budget: number,
  warnings: Set<SequencingWarning>
): SequencedLessonActivity[] {
  if (!activities.length) return activities;
  const weights = activities.map((activity) => Math.max(1, activity.sourceDurationMinutes ?? 1));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const allocations = weights.map((weight) =>
    Math.max(1, Math.floor((budget * weight) / totalWeight))
  );
  let remainder = budget - allocations.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index += 1, remainder -= 1)
    allocations[index % allocations.length] += 1;
  if (activities.some((activity) => activity.sourceDurationMinutes == null))
    warnings.add('UNKNOWN_DURATION_ALLOCATION');
  if (activities.reduce((sum, activity) => sum + (activity.sourceDurationMinutes ?? 0), 0) > budget)
    warnings.add('PHASE_BUDGET_OVERFLOW');
  return activities.map((activity, index) => ({
    ...activity,
    allocatedDurationMinutes: allocations[index],
    allocationSource:
      activity.sourceDurationMinutes == null ? 'PLANNER_DERIVED' : 'SOURCE_DURATION_WEIGHTED',
  }));
}

function reservation(
  phase: 'warmup' | 'main' | 'final',
  duration: number
): SequencedLessonActivity {
  return {
    id: `phase:${phase}`,
    situationId: null,
    title:
      phase === 'warmup'
        ? 'تهيئة وإحماء'
        : phase === 'final'
          ? 'عودة إلى الهدوء وتقويم ختامي'
          : 'العمل الأساسي المخطط',
    phase: labels[phase],
    allocatedDurationMinutes: duration,
    sourceDurationMinutes: null,
    allocationSource: 'PHASE_RESERVATION',
    difficulty: null,
    relationType: null,
    objectiveIds: [],
    instructionalRationale: 'حجز زمني ثابت؛ لا يمثل موقفًا جديدًا من البنك.',
    equipment: [],
  };
}

export function sequenceLessonSituations(
  input: LessonSituationSequencingInput
): LessonSituationSequence {
  const budgets = lessonPhaseBudgets(input.gradeId, input.lessonDurationMinutes);
  const warnings = new Set<SequencingWarning>();
  const candidates = input.selectedSituations.map(unwrap);
  const targets = [
    ...new Set([
      ...(input.objectiveId ? [input.objectiveId] : []),
      ...(input.integratedObjectiveIds ?? []),
    ]),
  ];
  const ordered = [...candidates].sort((left, right) => {
    const phaseDifference =
      phaseOrder.indexOf(choosePhase(left, input)) - phaseOrder.indexOf(choosePhase(right, input));
    return (
      phaseDifference ||
      relationRank(right, input.lessonType) - relationRank(left, input.lessonType) ||
      difficultyRank(left.situation.difficulty) - difficultyRank(right.situation.difficulty) ||
      (right.requirementCoverage?.ratio ?? 0) - (left.requirementCoverage?.ratio ?? 0) ||
      right.selectorRank - left.selectorRank ||
      left.situation.id.localeCompare(right.situation.id) ||
      left.sourceIndex - right.sourceIndex
    );
  });
  if (!ordered.length) warnings.add('INSUFFICIENT_SELECTED_SITUATIONS');
  const phaseOf = (candidate: Candidate) => choosePhase(candidate, input);
  const directInMain = ordered.some(
    (candidate) =>
      phaseOf(candidate) === 'main' &&
      relationRank(candidate, input.lessonType) >= (input.lessonType === 'LEARNING' ? 3 : 2)
  );
  const assessmentInMain = ordered.some(
    (candidate) => phaseOf(candidate) === 'main' && candidate.relationType === 'ASSESSMENT'
  );
  if (input.lessonType === 'LEARNING' && !directInMain) warnings.add('NO_MAIN_DIRECT_ACTIVITY');
  if ((input.lessonType === 'DIAGNOSTIC' || input.lessonType === 'SUMMATIVE') && !assessmentInMain)
    warnings.add('ASSESSMENT_SEQUENCE_INCOMPLETE');
  const covered = [
    ...new Set(
      ordered
        .filter((candidate) => phaseOf(candidate) === 'main')
        .flatMap((candidate) => candidate.objectiveIds)
    ),
  ];
  const missing = targets.filter((id) => !covered.includes(id));
  if (input.lessonType === 'INTEGRATIVE' && missing.length)
    warnings.add('INTEGRATIVE_COVERAGE_INCOMPLETE');
  const byPhase: Record<'warmup' | 'main' | 'final', SequencedLessonActivity[]> = {
    warmup: [],
    main: [],
    final: [],
  };
  for (const candidate of ordered) {
    const phase = phaseOf(candidate);
    byPhase[phase].push({
      id: `situation:${candidate.situation.id}`,
      situationId: candidate.situation.id,
      title: candidate.situation.name,
      phase: labels[phase],
      allocatedDurationMinutes: 0,
      sourceDurationMinutes: candidate.situation.durationMinutes ?? null,
      allocationSource:
        candidate.situation.durationMinutes == null
          ? 'PLANNER_DERIVED'
          : 'SOURCE_DURATION_WEIGHTED',
      difficulty: candidate.situation.difficulty ?? null,
      relationType: candidate.relationType,
      objectiveIds: [...candidate.objectiveIds],
      instructionalRationale: rationale(candidate, phase, input.lessonType),
      equipment: [...candidate.situation.equipment],
      situationSnapshot: snapshotSituation(candidate.situation),
    });
  }
  for (const phase of phaseOrder) {
    if (!byPhase[phase].length) byPhase[phase].push(reservation(phase, budgets[phase]));
    byPhase[phase] = allocate(byPhase[phase], budgets[phase], warnings);
  }
  const phaseTotals = phaseOrder.reduce(
    (totals, phase) => {
      totals[phase] = byPhase[phase].reduce(
        (sum, activity) => sum + activity.allocatedDurationMinutes,
        0
      );
      return totals;
    },
    { warmup: 0, main: 0, final: 0 }
  );
  const total = phaseTotals.warmup + phaseTotals.main + phaseTotals.final;
  if (total !== input.lessonDurationMinutes)
    warnings.add(
      total < input.lessonDurationMinutes ? 'PHASE_BUDGET_UNFILLED' : 'PHASE_BUDGET_OVERFLOW'
    );
  if (!ordered.length) warnings.add('NO_VALID_SEQUENCE');
  const timingStatus: TimingStatus =
    warnings.has('PHASE_BUDGET_OVERFLOW') || warnings.has('NO_VALID_SEQUENCE')
      ? 'INVALID'
      : directInMain || input.lessonType !== 'LEARNING'
        ? 'COMPLETE'
        : 'PARTIAL';
  return {
    lessonDurationMinutes: input.lessonDurationMinutes,
    phaseBudgets: budgets,
    orderedActivities: phaseOrder.flatMap((phase) => byPhase[phase]),
    phaseTotals,
    mainWorkCoverage: {
      requiredObjectiveIds: targets,
      coveredObjectiveIds: covered,
      missingObjectiveIds: missing,
      hasDirectActivity: directInMain,
      hasAssessmentActivity: assessmentInMain,
    },
    equipment: aggregateEquipment(candidates),
    warnings: [
      ...warnings,
      ...(input.selectionWarnings?.includes('DURATION_UNKNOWN')
        ? ['UNKNOWN_DURATION_ALLOCATION' as const]
        : []),
    ].filter((warning, index, all) => all.indexOf(warning) === index),
    timingStatus,
    pedagogicalRationale:
      input.lessonType === 'LEARNING'
        ? 'تدرج من التهيئة إلى العمل المباشر ثم التطبيق والتثبيت.'
        : input.lessonType === 'INTEGRATIVE'
          ? 'تدرج يدمج الأهداف السابقة ويظهر نقص التغطية.'
          : input.lessonType === 'DIAGNOSTIC'
            ? 'تسلسل ملاحظاتي يوسع عينة الأداء دون افتراض تعليم جديد.'
            : 'تسلسل تقويمي تمثيلي يحافظ على ثبات الحكم.',
  };
}
