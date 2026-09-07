import type { TeacherLearningPlanDomain } from '../../../types/spex';
import { projectTeacherPlanSemantics } from '../teacherPlanSemanticAdapter';
import type { PedagogicalKnowledgeCatalog } from '../types';
import { P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION } from '../operationalReconciliation';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from './domainOneLegacyP1E.manifest';

export type LegacyMigrationClassification =
  | 'SAFE_REFERENCE_ALIAS'
  | 'SAFE_DEFAULT_REFERENCE_REPLACEMENT'
  | 'SAFE_DEFAULT_PLAN_REMAP'
  | 'LEGACY_DEFAULT_INTEGRATION_PLACEMENT'
  | 'TEACHER_MODIFIED_PRESERVE'
  | 'TEACHER_CUSTOM_PRESERVE'
  | 'EXECUTED_HISTORY_PRESERVE'
  | 'AMBIGUOUS_REVIEW_REQUIRED'
  | 'UNSUPPORTED_LEGACY_SHAPE'
  | 'NO_ACTION';

export type DefaultOriginClassification =
  | 'PLATFORM_DEFAULT_UNMODIFIED'
  | 'PLATFORM_DEFAULT_TEXT_EDITED'
  | 'PLATFORM_DEFAULT_STRUCTURALLY_EDITED'
  | 'TEACHER_CREATED'
  | 'UNKNOWN_OR_AMBIGUOUS';

export type FieldOwnership =
  | 'PLATFORM_REFERENCE'
  | 'PLATFORM_DERIVED_DEFAULT'
  | 'TEACHER_OWNED'
  | 'HISTORICAL_SNAPSHOT'
  | 'MIXED_OR_CONTEXTUAL';

export type FutureFieldPolicy =
  'REPLACE' | 'REMAP_ID_ONLY' | 'PRESERVE' | 'MERGE_NON_DESTRUCTIVELY' | 'REVIEW_REQUIRED';

export interface FieldOwnershipRule {
  field: string;
  ownership: FieldOwnership;
  futurePolicy: FutureFieldPolicy;
}

export const DOMAIN_ONE_P1E_FIELD_OWNERSHIP: readonly FieldOwnershipRule[] = Object.freeze([
  { field: 'id', ownership: 'PLATFORM_REFERENCE', futurePolicy: 'PRESERVE' },
  { field: 'sourceReferenceId', ownership: 'PLATFORM_REFERENCE', futurePolicy: 'REMAP_ID_ONLY' },
  { field: 'objective wording', ownership: 'TEACHER_OWNED', futurePolicy: 'PRESERVE' },
  { field: 'order', ownership: 'TEACHER_OWNED', futurePolicy: 'PRESERVE' },
  {
    field: 'competencyComponentIds',
    ownership: 'MIXED_OR_CONTEXTUAL',
    futurePolicy: 'MERGE_NON_DESTRUCTIVELY',
  },
  {
    field: 'learningContent',
    ownership: 'MIXED_OR_CONTEXTUAL',
    futurePolicy: 'PRESERVE',
  },
  {
    field: 'pedagogicalKnowledge / mobilizedKnowledge',
    ownership: 'MIXED_OR_CONTEXTUAL',
    futurePolicy: 'PRESERVE',
  },
  { field: 'executionContent', ownership: 'TEACHER_OWNED', futurePolicy: 'PRESERVE' },
  { field: 'situations', ownership: 'TEACHER_OWNED', futurePolicy: 'PRESERVE' },
  { field: 'resources/equipment', ownership: 'TEACHER_OWNED', futurePolicy: 'PRESERVE' },
  { field: 'guidance', ownership: 'MIXED_OR_CONTEXTUAL', futurePolicy: 'PRESERVE' },
  { field: 'teacherNotes', ownership: 'TEACHER_OWNED', futurePolicy: 'PRESERVE' },
  {
    field: 'integration position',
    ownership: 'MIXED_OR_CONTEXTUAL',
    futurePolicy: 'REVIEW_REQUIRED',
  },
  {
    field: 'executed pedagogical records',
    ownership: 'HISTORICAL_SNAPSHOT',
    futurePolicy: 'PRESERVE',
  },
]);

export interface HistoricalDependencies {
  classPlannedSessionIds?: readonly string[];
  notebookEntryIds?: readonly string[];
  lessonPlanIds?: readonly string[];
  assessmentSessionIds?: readonly string[];
}

export interface DomainOneLegacyDryRunInput {
  gradeId: string;
  domainId: 'f_locomotion';
  coreReleaseId: string;
  finalCompetencyId: string;
  catalog: PedagogicalKnowledgeCatalog;
  domain: TeacherLearningPlanDomain;
  /** Exact historical platform-default snapshot for this generator lineage. */
  historicalDefaultDomain?: TeacherLearningPlanDomain;
  historicalDependencies?: HistoricalDependencies;
}

export interface LegacyMigrationAction {
  subjectId: string;
  classification: LegacyMigrationClassification;
  origin: DefaultOriginClassification;
  reason: string;
  evidence: readonly string[];
  confidenceBasis: string;
  proposedAction: string;
  writeAllowedInFuture: boolean;
  warnings: readonly string[];
  beforeSemanticIdentity: string | null;
  afterSemanticIdentity: string | null;
  preservedFields: readonly string[];
}

export interface DomainOneLegacyDryRunResult {
  migrationId: string;
  planClassification: LegacyMigrationClassification;
  objectiveActions: readonly LegacyMigrationAction[];
  integrationActions: readonly LegacyMigrationAction[];
  referenceActions: readonly LegacyMigrationAction[];
  preservedTeacherFields: readonly string[];
  historicalDependencies: HistoricalDependencies;
  warnings: readonly string[];
  requiresReview: boolean;
  futureWriteCandidate: boolean;
  beforeCoverage: { status: string; percentage?: number };
  afterCoverage: { status: string; percentage?: number };
}

const hasHistory = (history: HistoricalDependencies | undefined) =>
  Boolean(history && Object.values(history).some((ids) => (ids || []).length > 0));

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${key}:${stable(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const same = (left: unknown, right: unknown) => stable(left) === stable(right);

const preservedTeacherFields = [
  'objective wording',
  'objective count',
  'objective order',
  'situations',
  'resources/equipment',
  'learningContent',
  'executionContent',
  'pedagogicalKnowledge',
  'guidance',
  'teacherNotes',
  'custom integration position',
] as const;

const action = (
  partial: Omit<LegacyMigrationAction, 'preservedFields' | 'warnings'> & {
    warnings?: readonly string[];
    preservedFields?: readonly string[];
  }
): LegacyMigrationAction => ({
  ...partial,
  warnings: partial.warnings || [],
  preservedFields: partial.preservedFields || preservedTeacherFields,
});

function project(input: DomainOneLegacyDryRunInput, domain: TeacherLearningPlanDomain) {
  return projectTeacherPlanSemantics({
    catalog: input.catalog,
    coreReleaseId: input.coreReleaseId,
    gradeId: input.gradeId,
    domainId: input.domainId,
    finalCompetencyId: input.finalCompetencyId,
    domain,
  });
}

export function dryRunDomainOneLegacyMigration(
  input: DomainOneLegacyDryRunInput
): DomainOneLegacyDryRunResult {
  const history = input.historicalDependencies || {};
  const executed = hasHistory(history);
  const baseline = input.historicalDefaultDomain;
  const gradeRows = P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter(
    (item) => item.gradeId === input.gradeId
  );
  const unsupportedShape =
    input.domain.fieldId !== input.domainId ||
    gradeRows.length === 0 ||
    input.domain.objectives.length === 0;
  const replacementByReference = new Map(
    [
      ...DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.referenceReplacementTable,
      ...DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.unresolvedProductDecisions,
    ].map((item) => [`${item.gradeId}|${item.legacyReferenceId}`, item])
  );
  const baselineById = new Map((baseline?.objectives || []).map((item) => [item.id, item]));
  const baselineOrder = (baseline?.objectives || []).map((item) => item.id);
  const currentOrder = input.domain.objectives.map((item) => item.id);
  const planStructureChanged = Boolean(baseline && !same(baselineOrder, currentOrder));

  const objectiveActions = input.domain.objectives.map((objective, index) => {
    const source = objective.sourceReferenceId?.trim() || null;
    const reconciliation = gradeRows.find((item) => item.sourceReferenceId === source);
    const replacement = source
      ? replacementByReference.get(`${input.gradeId}|${source}`)
      : undefined;
    const expected = baselineById.get(objective.id);
    const knownIdentity = Boolean(
      reconciliation &&
      objective.id ===
        `teacher-objective:${input.gradeId}:${input.domainId}:${reconciliation.sessionNumber}`
    );
    const textEdited = Boolean(expected && objective.text !== expected.text);
    const detailEdited = Boolean(
      expected &&
      !same(
        { ...objective, text: expected.text, orderIndex: expected.orderIndex },
        { ...expected, text: expected.text, orderIndex: expected.orderIndex }
      )
    );
    const origin: DefaultOriginClassification = !source
      ? 'TEACHER_CREATED'
      : !reconciliation || !knownIdentity
        ? 'UNKNOWN_OR_AMBIGUOUS'
        : planStructureChanged || index !== gradeRows.indexOf(reconciliation)
          ? 'PLATFORM_DEFAULT_STRUCTURALLY_EDITED'
          : textEdited
            ? 'PLATFORM_DEFAULT_TEXT_EDITED'
            : 'PLATFORM_DEFAULT_UNMODIFIED';
    const explicitConceptId = (objective as typeof objective & { objectiveConceptId?: string })
      .objectiveConceptId;

    if (executed) {
      return action({
        subjectId: objective.id,
        classification: 'EXECUTED_HISTORY_PRESERVE',
        origin,
        reason: 'Historical execution dependencies make silent plan/reference rewriting unsafe.',
        evidence: Object.values(history).flatMap((ids) => ids || []),
        confidenceBasis: 'Explicit dependency identifiers supplied to the dry run.',
        proposedAction: 'Preserve plan and historical snapshots; review reference-only options.',
        writeAllowedInFuture: false,
        beforeSemanticIdentity: source,
        afterSemanticIdentity: source,
      });
    }
    if (!source) {
      return action({
        subjectId: objective.id,
        classification: 'TEACHER_CUSTOM_PRESERVE',
        origin,
        reason: 'No platform source lineage is present.',
        evidence: ['sourceReferenceId is absent'],
        confidenceBasis: 'Stable source identity, not wording similarity.',
        proposedAction: 'Preserve unchanged.',
        writeAllowedInFuture: false,
        beforeSemanticIdentity: null,
        afterSemanticIdentity: null,
      });
    }
    if (
      explicitConceptId &&
      (explicitConceptId === replacement?.canonicalObjectiveConceptId ||
        explicitConceptId === reconciliation?.canonicalConceptCandidateId)
    ) {
      return action({
        subjectId: objective.id,
        classification: 'NO_ACTION',
        origin,
        reason: 'The plan already carries the compatible canonical semantic identity.',
        evidence: [source, explicitConceptId],
        confidenceBasis: 'Explicit approved ObjectiveConcept identity.',
        proposedAction: 'No action.',
        writeAllowedInFuture: false,
        beforeSemanticIdentity: explicitConceptId,
        afterSemanticIdentity: explicitConceptId,
      });
    }
    if (!reconciliation || !knownIdentity) {
      return action({
        subjectId: objective.id,
        classification: 'AMBIGUOUS_REVIEW_REQUIRED',
        origin,
        reason: 'Source lineage or stable generator identity is incomplete.',
        evidence: [source, objective.id],
        confidenceBasis: 'Identity evidence conflicts or is missing.',
        proposedAction: 'Preserve and request review.',
        writeAllowedInFuture: false,
        warnings: ['Text equality is not accepted as platform ownership proof.'],
        beforeSemanticIdentity: source,
        afterSemanticIdentity: null,
      });
    }
    if (planStructureChanged || detailEdited || textEdited) {
      return action({
        subjectId: objective.id,
        classification: replacement ? 'SAFE_DEFAULT_PLAN_REMAP' : 'TEACHER_MODIFIED_PRESERVE',
        origin,
        reason: textEdited
          ? 'Stable lineage proves default origin, but teacher wording must be preserved.'
          : 'Teacher-owned fields or structure differ from the historical default.',
        evidence: [
          source,
          objective.id,
          textEdited ? 'wording differs' : 'structure/details differ',
        ],
        confidenceBasis: 'Stable ID and source lineage plus field-level comparison.',
        proposedAction:
          replacement?.decisionStatus === 'APPROVED_REPLACEMENT'
            ? 'Remap semantic identity only; preserve every teacher-owned field.'
            : 'Preserve and review; do not rewrite content.',
        writeAllowedInFuture: replacement?.decisionStatus === 'APPROVED_REPLACEMENT',
        warnings:
          replacement?.decisionStatus === 'PENDING_PRODUCT_DECISION'
            ? ['Product decision remains unresolved.']
            : [],
        beforeSemanticIdentity: source,
        afterSemanticIdentity:
          replacement?.decisionStatus === 'APPROVED_REPLACEMENT'
            ? replacement.canonicalObjectiveConceptId
            : source,
      });
    }
    if (reconciliation.decision === 'ALIAS' || reconciliation.decision === 'REVIEWED_MAP') {
      return action({
        subjectId: objective.id,
        classification: 'SAFE_REFERENCE_ALIAS',
        origin,
        reason: reconciliation.evidence,
        evidence: [reconciliation.id, source],
        confidenceBasis: 'P1D approved alias/reviewed mapping.',
        proposedAction: 'Reference identity remap only.',
        writeAllowedInFuture: true,
        beforeSemanticIdentity: source,
        afterSemanticIdentity: reconciliation.canonicalConceptCandidateId,
      });
    }
    if (replacement?.decisionStatus === 'APPROVED_REPLACEMENT') {
      return action({
        subjectId: objective.id,
        classification: 'SAFE_DEFAULT_REFERENCE_REPLACEMENT',
        origin,
        reason: replacement.sourceEvidence,
        evidence: [reconciliation.id, source],
        confidenceBasis:
          'Untouched generator identity, order, wording, and P1D replacement decision.',
        proposedAction: 'Future reference replacement; preserve persisted teacher wording.',
        writeAllowedInFuture: true,
        beforeSemanticIdentity: source,
        afterSemanticIdentity: replacement.canonicalObjectiveConceptId,
      });
    }
    return action({
      subjectId: objective.id,
      classification: 'AMBIGUOUS_REVIEW_REQUIRED',
      origin,
      reason: replacement?.sourceEvidence || reconciliation.evidence,
      evidence: [reconciliation.id, source],
      confidenceBasis: 'P1D partial-overlap evidence requires a product decision.',
      proposedAction: 'Preserve until product decision.',
      writeAllowedInFuture: false,
      warnings: ['Product decision remains unresolved.'],
      beforeSemanticIdentity: source,
      afterSemanticIdentity: null,
    });
  });

  const baselineIntegrations = baseline?.integrationPoints || [];
  const integrationActions = input.domain.integrationPoints.map((point, index) => {
    const expected = baselineIntegrations[index];
    const finalObjectiveId = input.domain.objectives.at(-1)?.id || null;
    const penultimateObjectiveId = input.domain.objectives.at(-2)?.id || null;
    const isSecond = index === 1;
    const untouchedLegacyBug = Boolean(
      isSecond &&
      baseline &&
      expected?.afterObjectiveId === penultimateObjectiveId &&
      point.afterObjectiveId === expected.afterObjectiveId &&
      same(point, expected) &&
      !planStructureChanged
    );
    if (executed) {
      return action({
        subjectId: point.id,
        classification: 'EXECUTED_HISTORY_PRESERVE',
        origin: 'PLATFORM_DEFAULT_UNMODIFIED',
        reason: 'Integration is linked to materialized execution history.',
        evidence: Object.values(history).flatMap((ids) => ids || []),
        confidenceBasis: 'Explicit historical dependency.',
        proposedAction: 'Preserve.',
        writeAllowedInFuture: false,
        beforeSemanticIdentity: point.afterObjectiveId,
        afterSemanticIdentity: point.afterObjectiveId,
      });
    }
    if (untouchedLegacyBug) {
      return action({
        subjectId: point.id,
        classification: 'LEGACY_DEFAULT_INTEGRATION_PLACEMENT',
        origin: 'PLATFORM_DEFAULT_UNMODIFIED',
        reason:
          'Exact untouched historical fallback anchored Integration 2 to the penultimate objective.',
        evidence: ['second integration', 'penultimate anchor', 'historical default snapshot match'],
        confidenceBasis: 'Stable integration identity and exact historical structure.',
        proposedAction: `Future repair candidate: anchor after ${finalObjectiveId}.`,
        writeAllowedInFuture: true,
        beforeSemanticIdentity: point.afterObjectiveId,
        afterSemanticIdentity: finalObjectiveId,
      });
    }
    if (expected && point.afterObjectiveId !== expected.afterObjectiveId) {
      return action({
        subjectId: point.id,
        classification: 'TEACHER_MODIFIED_PRESERVE',
        origin: 'PLATFORM_DEFAULT_STRUCTURALLY_EDITED',
        reason: 'Teacher-selected integration position differs from the historical default.',
        evidence: [String(expected.afterObjectiveId), String(point.afterObjectiveId)],
        confidenceBasis: 'Direct anchor comparison.',
        proposedAction: 'Preserve teacher placement.',
        writeAllowedInFuture: false,
        beforeSemanticIdentity: point.afterObjectiveId,
        afterSemanticIdentity: point.afterObjectiveId,
      });
    }
    return action({
      subjectId: point.id,
      classification:
        point.afterObjectiveId === finalObjectiveId && isSecond ? 'NO_ACTION' : 'NO_ACTION',
      origin: expected ? 'PLATFORM_DEFAULT_UNMODIFIED' : 'UNKNOWN_OR_AMBIGUOUS',
      reason: 'No safe placement change is proposed.',
      evidence: [String(point.afterObjectiveId)],
      confidenceBasis: 'Current structure and supplied lineage context.',
      proposedAction: 'No action.',
      writeAllowedInFuture: false,
      beforeSemanticIdentity: point.afterObjectiveId,
      afterSemanticIdentity: point.afterObjectiveId,
    });
  });

  const before = project(input, input.domain);
  const proposedConceptByObjective = new Map(
    objectiveActions
      .filter((item) => item.writeAllowedInFuture && item.afterSemanticIdentity)
      .map((item) => [item.subjectId, item.afterSemanticIdentity!])
  );
  const simulatedDomain: TeacherLearningPlanDomain = {
    ...input.domain,
    objectives: input.domain.objectives.map((objective) => ({
      ...objective,
      ...(proposedConceptByObjective.has(objective.id)
        ? { objectiveConceptId: proposedConceptByObjective.get(objective.id) }
        : {}),
    })),
  };
  const after = project(input, simulatedDomain);
  const allActions = [...objectiveActions, ...integrationActions];
  const requiresReview =
    unsupportedShape ||
    allActions.some(
      (item) =>
        item.classification === 'AMBIGUOUS_REVIEW_REQUIRED' ||
        item.classification === 'UNSUPPORTED_LEGACY_SHAPE'
    );
  const planClassification: LegacyMigrationClassification = unsupportedShape
    ? 'UNSUPPORTED_LEGACY_SHAPE'
    : executed
      ? 'EXECUTED_HISTORY_PRESERVE'
      : requiresReview
        ? 'AMBIGUOUS_REVIEW_REQUIRED'
        : allActions.some((item) => item.classification === 'LEGACY_DEFAULT_INTEGRATION_PLACEMENT')
          ? 'LEGACY_DEFAULT_INTEGRATION_PLACEMENT'
          : allActions.some((item) => item.writeAllowedInFuture)
            ? 'SAFE_DEFAULT_PLAN_REMAP'
            : 'NO_ACTION';

  return {
    migrationId: DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.migrationId,
    planClassification,
    objectiveActions,
    integrationActions,
    referenceActions: objectiveActions.filter((item) => item.beforeSemanticIdentity !== null),
    preservedTeacherFields,
    historicalDependencies: history,
    warnings: [
      ...(unsupportedShape
        ? ['The plan does not match the supported Domain 1 historical generator shape.']
        : []),
      ...allActions.flatMap((item) => item.warnings),
    ],
    requiresReview,
    futureWriteCandidate:
      !unsupportedShape && !executed && allActions.some((item) => item.writeAllowedInFuture),
    beforeCoverage: {
      status: before.coverageStatus,
      ...(before.coveragePercentage === undefined ? {} : { percentage: before.coveragePercentage }),
    },
    afterCoverage: {
      status: after.coverageStatus,
      ...(after.coveragePercentage === undefined ? {} : { percentage: after.coveragePercentage }),
    },
  };
}
