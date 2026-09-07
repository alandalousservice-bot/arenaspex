import { deepFreeze } from './catalog';
import { P1A_GRADE_ONE_DOMAIN_ONE_CATALOG } from './releases/p1aGradeOneDomainOne';
import {
  P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
  type P1CGradeId,
} from './releases/p1cDomainOneGradesTwoToFive';

export type DomainOneOperationalGradeId = 'lvl_p1' | P1CGradeId;

export type OperationalSemanticClassification =
  | 'EXACT_MATCH'
  | 'SEMANTIC_MATCH_WORDING_DIFFERS'
  | 'SAME_MEANING_DIFFERENT_WORDING'
  | 'NARROWER_THAN_CORE_CONCEPT'
  | 'BROADER_THAN_CORE_CONCEPT'
  | 'DIFFERENT_MEANING'
  | 'PARTIAL_OVERLAP'
  | 'DUPLICATE_OF_ANOTHER_OPERATIONAL_OBJECTIVE'
  | 'NO_SAFE_MAPPING';

export type OperationalReconciliationDecision =
  | 'RETAIN'
  | 'ALIAS'
  | 'REVIEWED_MAP'
  | 'REPLACE_LATER'
  | 'KEEP_UNMAPPED'
  | 'PRODUCT_DECISION_REQUIRED';

export interface OperationalObjectiveReconciliation {
  id: string;
  gradeId: DomainOneOperationalGradeId;
  domainId: 'f_locomotion';
  sourcePath: 'src/data/algerianCurriculum.ts';
  sourceReferenceId: string;
  sessionNumber: number;
  operationalWording: string;
  canonicalConceptCandidateId: string | null;
  canonicalRequirementIds: readonly string[];
  classification: OperationalSemanticClassification;
  decision: OperationalReconciliationDecision;
  evidence: string;
  safeAlias: boolean;
  safeReviewedMapping: boolean;
  productionReplacementEventuallyRequired: boolean;
  risk: 'low' | 'medium' | 'high';
}

export const P1D_SOURCE_IDENTITY_FLOW = deepFreeze({
  source: 'src/data/algerianCurriculum.ts -> fields.f_locomotion.sessionsList',
  sourceReferenceId: 'f_locomotion__{learningSessionNumber}',
  teacherObjectiveId: 'teacher-objective:{levelId}:f_locomotion:{learningSessionNumber}',
  canonicalReference: '{levelId}:f_locomotion:objective:{teacherObjectiveId}[:meeting:{1|2}]',
  annualDistribution:
    'CanonicalPlanningSession.objectiveId/objectiveGroupId -> level/week pedagogical unit and slot',
  classPlannedSession:
    'Canonical referenceSessionId is copied into each class-owned ClassPlannedSession',
  downstream:
    'Daily Notebook and Lesson Memo resolve the class session through referenceSessionId and its canonical planning context',
  knowledgeCore: 'sourceReferenceId -> reviewed grade/domain mapping -> ObjectiveConcept',
});

type DecisionSpec = readonly [
  sessionNumber: number,
  operationalWording: string,
  conceptIndex: number | null,
  classification: OperationalSemanticClassification,
  decision: OperationalReconciliationDecision,
  evidence: string,
  risk: 'low' | 'medium' | 'high',
];

const specs: Readonly<Record<DomainOneOperationalGradeId, readonly DecisionSpec[]>> = {
  lvl_p1: [
    [
      2,
      'يتعرف على وضعيات الجسم الأساسية (الوقوف، الجلوس، الانبطاح، الاستلقاء) وينجزها حسب التعليمات.',
      1,
      'EXACT_MATCH',
      'ALIAS',
      'Exact wording and requirement scope in the frozen Grade 1 pilot.',
      'low',
    ],
    [
      3,
      'ينتقل من وضعية إلى أخرى بطريقة منظمة استجابة للإشارة.',
      2,
      'EXACT_MATCH',
      'ALIAS',
      'Exact wording and requirement scope in the frozen Grade 1 pilot.',
      'low',
    ],
    [
      4,
      'ينجز تنقلات بسيطة (المشي، الجري الخفيف) في اتجاهات مختلفة.',
      3,
      'EXACT_MATCH',
      'ALIAS',
      'Exact wording and requirement scope in the frozen Grade 1 pilot.',
      'low',
    ],
    [
      6,
      'يتحكم في التنقل الأمامي والخلفي مع المحافظة على التوازن.',
      4,
      'EXACT_MATCH',
      'ALIAS',
      'Exact wording and requirement scope in the frozen Grade 1 pilot.',
      'low',
    ],
    [
      7,
      'ينجز تنقلات جانبية وتغيير الاتجاه داخل فضاء محدد.',
      5,
      'EXACT_MATCH',
      'ALIAS',
      'Exact wording and requirement scope in the frozen Grade 1 pilot.',
      'low',
    ],
    [
      8,
      'يربط بين وضعيات الجسم والتنقلات في مسار حركي بسيط.',
      6,
      'EXACT_MATCH',
      'ALIAS',
      'Exact wording and requirement scope in the frozen Grade 1 pilot.',
      'low',
    ],
    [
      9,
      'ينجز سلسلة حركية تجمع بين عدة وضعيات وتنقلات.',
      7,
      'EXACT_MATCH',
      'ALIAS',
      'Exact wording and requirement scope in the frozen Grade 1 pilot.',
      'low',
    ],
  ],
  lvl_p2: [
    [
      2,
      'يؤدي وضعيات جسمية متنوعة (وقوف، جلوس، انبطاح، توازن) وفق التعليمات.',
      1,
      'SEMANTIC_MATCH_WORDING_DIFFERS',
      'REVIEWED_MAP',
      'Examples narrow the wording but preserve the concept of varied postures under instructions.',
      'low',
    ],
    [
      3,
      'ينتقل بين وضعيات مختلفة بطريقة منظمة وسلسة.',
      2,
      'EXACT_MATCH',
      'ALIAS',
      'Operational and canonical wording are identical.',
      'low',
    ],
    [
      4,
      'ينجز تنقلات أمامية وخلفية وجانبية مع التحكم في الجسم.',
      3,
      'EXACT_MATCH',
      'ALIAS',
      'Operational and canonical wording are identical.',
      'low',
    ],
    [
      6,
      'يتحكم في تغيير الاتجاه أثناء التنقل داخل فضاء محدد.',
      4,
      'EXACT_MATCH',
      'ALIAS',
      'Operational and canonical wording are identical.',
      'low',
    ],
    [
      7,
      'ينجز تنقلات مع تغيير السرعة حسب الإشارة أو الموقف.',
      5,
      'SEMANTIC_MATCH_WORDING_DIFFERS',
      'REVIEWED_MAP',
      'Changing speed according to signal/situation is the same reviewed adaptation concept.',
      'low',
    ],
    [
      8,
      'يربط بين وضعيات الجسم والتنقلات في مسار حركي منظم.',
      6,
      'SEMANTIC_MATCH_WORDING_DIFFERS',
      'REVIEWED_MAP',
      'Both representations link posture and locomotion in an organized path.',
      'low',
    ],
    [
      9,
      'ينجز سلسلة حركية تجمع بين الوضعيات والتنقلات المختلفة.',
      7,
      'SEMANTIC_MATCH_WORDING_DIFFERS',
      'REVIEWED_MAP',
      'Both representations describe a combined posture/locomotion sequence.',
      'low',
    ],
  ],
  lvl_p3: [
    [
      2,
      'ينجز وضعيات جسمية متنوعة مع المحافظة على التوازن والثبات.',
      null,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'The approved progression starts controlled running; this objective teaches generic static postures.',
      'high',
    ],
    [
      3,
      'ينتقل بين وضعيات مختلفة بطريقة منسقة وسريعة.',
      null,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'Generic posture transitions do not establish the referenced walk-to-jog progression.',
      'high',
    ],
    [
      4,
      'يؤدي تنقلات متنوعة (أمامية، خلفية، جانبية) داخل مسارات محددة.',
      null,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'Directional locomotion is not the approved graded running sequence.',
      'high',
    ],
    [
      6,
      'يتحكم في تغيير الاتجاه أثناء التنقل وتجاوز مسارات متنوعة.',
      null,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'Path changes do not cover the approved stationary throwing concept.',
      'high',
    ],
    [
      7,
      'ينجز تنقلات مع تغيير السرعة حسب طبيعة الوضعية الحركية.',
      3,
      'PARTIAL_OVERLAP',
      'PRODUCT_DECISION_REQUIRED',
      'Speed variation overlaps progressive running but does not prove the light-to-fast running sequence.',
      'medium',
    ],
    [
      8,
      'يربط بين عدة وضعيات وتنقلات في سلسلة حركية منظمة.',
      6,
      'NARROWER_THAN_CORE_CONCEPT',
      'REPLACE_LATER',
      'The canonical concept requires linking running and throwing; throwing is absent.',
      'high',
    ],
    [
      9,
      'ينجز مساراً حركياً مركباً يجمع بين التوازن والتنقل وتغيير الاتجاه.',
      7,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'The canonical integrated concept is explicitly a coherent running/throwing sequence.',
      'high',
    ],
  ],
  lvl_p4: [
    [
      2,
      'يؤدي وضعيات توازن مختلفة مع التحكم في وضعية الجسم.',
      1,
      'PARTIAL_OVERLAP',
      'REPLACE_LATER',
      'Body control overlaps, but running posture and step mechanics are absent.',
      'high',
    ],
    [
      3,
      'ينتقل بين وضعيات متعددة بسرعة ودقة وفق تعليمات محددة.',
      2,
      'PARTIAL_OVERLAP',
      'REPLACE_LATER',
      'Speed and control overlap, but coordinated limb action during running is not established.',
      'high',
    ],
    [
      4,
      'ينجز تنقلات متنوعة (أمامية، خلفية، جانبية) مع تغيير الاتجاه.',
      3,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'The approved concept is coherent straight-axis running rather than generic directional travel.',
      'high',
    ],
    [
      6,
      'يتحكم في التنقل داخل مسارات منحنية ومتغيرة الاتجاه.',
      4,
      'PARTIAL_OVERLAP',
      'PRODUCT_DECISION_REQUIRED',
      'A curved path overlaps canonical curve running, but locomotion type and body/limb control are unspecified.',
      'medium',
    ],
    [
      7,
      'ينجز تنقلات مع تغيير السرعة حسب طبيعة الوضعية.',
      6,
      'NARROWER_THAN_CORE_CONCEPT',
      'PRODUCT_DECISION_REQUIRED',
      'Pace adaptation overlaps, but group synchronization is absent.',
      'medium',
    ],
    [
      8,
      'يربط بين التوازن والتنقل في سلسلة حركية مركبة.',
      7,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'The approved synthesis is linked individual/group running, not generic balance-locomotion.',
      'high',
    ],
    [
      9,
      'ينجز مساراً حركياً يجمع بين الوضعيات، التوازن والتنقلات المتنوعة.',
      7,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'The operational path omits individual/group running coherence and pace.',
      'high',
    ],
  ],
  lvl_p5: [
    [
      2,
      'يؤدي وضعيات توازن متنوعة (ثابتة وديناميكية) مع التحكم في وضعية الجسم.',
      3,
      'BROADER_THAN_CORE_CONCEPT',
      'PRODUCT_DECISION_REQUIRED',
      'Balance overlaps the jumping concept, but the operational objective is not specifically a jump and safe landing.',
      'medium',
    ],
    [
      3,
      'ينتقل بين وضعيات مختلفة مع المحافظة على الانسجام والتوازن.',
      1,
      'PARTIAL_OVERLAP',
      'PRODUCT_DECISION_REQUIRED',
      'Body adjustment overlaps, but no sport-specific running/throwing/jumping context is identified.',
      'medium',
    ],
    [
      4,
      'ينجز تنقلات متنوعة في مسارات مستقيمة ومنحنية مع تغيير الاتجاه.',
      1,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'Generic paths do not express sport-specific body positioning across run, jump, and throw.',
      'high',
    ],
    [
      6,
      'يتحكم في التنقل فوق مسارات وعوائق متنوعة مع المحافظة على التوازن.',
      3,
      'PARTIAL_OVERLAP',
      'PRODUCT_DECISION_REQUIRED',
      'Obstacles may imply jumping, but propulsion phases, sequence, and safe landing are not explicit.',
      'medium',
    ],
    [
      7,
      'يربط بين التنقلات والقفزات وتغيير الاتجاه في سلسلة حركية.',
      5,
      'NARROWER_THAN_CORE_CONCEPT',
      'PRODUCT_DECISION_REQUIRED',
      'The canonical transition concept also requires throwing; a one-to-one map would overstate coverage.',
      'medium',
    ],
    [
      8,
      'ينجز تركيباً حركياً يجمع بين التوازن والتنقل والتحكم في الجسم.',
      6,
      'NARROWER_THAN_CORE_CONCEPT',
      'REPLACE_LATER',
      'The canonical synthesis includes individual/team sport and run/jump/throw resources.',
      'high',
    ],
    [
      9,
      'يبتكر ويؤدي مساراً حركياً مركباً وفق شروط محددة.',
      7,
      'DIFFERENT_MEANING',
      'REPLACE_LATER',
      'Inventing a generic path does not prove coherent sport movement with others.',
      'high',
    ],
  ],
};

const conceptFor = (gradeId: DomainOneOperationalGradeId, conceptIndex: number | null) => {
  if (!conceptIndex) return undefined;
  const catalog =
    gradeId === 'lvl_p1'
      ? P1A_GRADE_ONE_DOMAIN_ONE_CATALOG
      : P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG;
  return catalog.objectiveConcepts.find(
    (concept) => concept.id === `objective-concept:${gradeId}:f_locomotion:${conceptIndex}`
  );
};

export const P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION: readonly OperationalObjectiveReconciliation[] =
  deepFreeze(
    (Object.entries(specs) as [DomainOneOperationalGradeId, readonly DecisionSpec[]][]).flatMap(
      ([gradeId, gradeSpecs]) =>
        gradeSpecs.map(
          ([sessionNumber, wording, conceptIndex, classification, decision, evidence, risk]) => {
            const concept = conceptFor(gradeId, conceptIndex);
            return {
              id: `operational-reconciliation:${gradeId}:f_locomotion:${sessionNumber}`,
              gradeId,
              domainId: 'f_locomotion' as const,
              sourcePath: 'src/data/algerianCurriculum.ts' as const,
              sourceReferenceId: `f_locomotion__${sessionNumber}`,
              sessionNumber,
              operationalWording: wording,
              canonicalConceptCandidateId: concept?.id || null,
              canonicalRequirementIds: concept ? [...concept.learningRequirementIds] : [],
              classification,
              decision,
              evidence,
              safeAlias: decision === 'ALIAS',
              safeReviewedMapping: decision === 'REVIEWED_MAP',
              productionReplacementEventuallyRequired: decision === 'REPLACE_LATER',
              risk,
            };
          }
        )
    )
  );

export function operationalReconciliationForGrade(
  gradeId: DomainOneOperationalGradeId
): readonly OperationalObjectiveReconciliation[] {
  return P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter((item) => item.gradeId === gradeId);
}

export function operationalReconciliationDecisionCounts(): Readonly<
  Record<OperationalReconciliationDecision, number>
> {
  const counts: Record<OperationalReconciliationDecision, number> = {
    RETAIN: 0,
    ALIAS: 0,
    REVIEWED_MAP: 0,
    REPLACE_LATER: 0,
    KEEP_UNMAPPED: 0,
    PRODUCT_DECISION_REQUIRED: 0,
  };
  for (const item of P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION) counts[item.decision] += 1;
  return counts;
}

export interface DefaultIntegrationBoundaryAudit {
  integrationAnchorObjectiveIndexes: readonly number[];
  outsideObjectiveIndexes: readonly number[];
  sharedRootCause: 'SECOND_INTEGRATION_FALLBACK_ANCHORED_TO_PENULTIMATE_OBJECTIVE' | 'NONE';
  classification: 'PLACEMENT_DEFECT' | 'COMPLETE';
}

/** Read-only structural audit of the default two-integration Teacher Plan shape. */
export function auditDefaultIntegrationBoundaries(input: {
  objectives: readonly { id: string }[];
  integrationPoints: readonly { afterObjectiveId: string | null }[];
}): DefaultIntegrationBoundaryAudit {
  const indexById = new Map(input.objectives.map((objective, index) => [objective.id, index + 1]));
  const anchors = input.integrationPoints.flatMap((point) => {
    const index = point.afterObjectiveId ? indexById.get(point.afterObjectiveId) : undefined;
    return index ? [index] : [];
  });
  const lastAnchor = anchors.at(-1) || 0;
  const outside = input.objectives
    .map((_, index) => index + 1)
    .filter((index) => index > lastAnchor);
  const usesPenultimateFallback =
    input.objectives.length > 1 &&
    input.integrationPoints.length === 2 &&
    anchors.at(-1) === input.objectives.length - 1;
  return {
    integrationAnchorObjectiveIndexes: anchors,
    outsideObjectiveIndexes: outside,
    sharedRootCause: usesPenultimateFallback
      ? 'SECOND_INTEGRATION_FALLBACK_ANCHORED_TO_PENULTIMATE_OBJECTIVE'
      : 'NONE',
    classification: outside.length > 0 ? 'PLACEMENT_DEFECT' : 'COMPLETE',
  };
}
