import type {
  KnowledgeCoreCell,
  LegacyReferenceSnapshot,
  ShadowComparison,
} from './knowledgeCoreRuntime.types';

const REVIEWED_CORRECTION_CELLS = new Set(
  ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'].flatMap((gradeId) =>
    ['f_locomotion', 'f_fundamentals', 'f_structuring'].map((domainId) => `${gradeId}|${domainId}`)
  )
);

const normalized = (value: string | undefined) =>
  (value || '')
    .normalize('NFKC')
    .replace(/[\s،؛.:!?]+/g, ' ')
    .trim();

export function compareKnowledgeCoreCell(
  legacy: LegacyReferenceSnapshot,
  candidate: KnowledgeCoreCell | null
): Readonly<ShadowComparison> {
  const legacyPresent = Boolean(normalized(legacy.finalCompetency));
  const candidatePresent = Boolean(candidate?.finalCompetency.label);
  const exact =
    legacyPresent &&
    candidatePresent &&
    normalized(legacy.finalCompetency) === normalized(candidate?.finalCompetency.label);
  const key = `${legacy.gradeId}|${legacy.domainId}`;
  const expectedCorrection =
    legacyPresent && candidatePresent && !exact && REVIEWED_CORRECTION_CELLS.has(key);
  const status = exact
    ? 'MATCH'
    : !legacyPresent && candidatePresent
      ? 'CANDIDATE_ONLY'
      : legacyPresent && !candidatePresent
        ? 'LEGACY_ONLY'
        : expectedCorrection
          ? 'EXPECTED_CORRECTION'
          : 'CONFLICT';
  const legacyComponents = legacy.componentLabels || [];
  const componentComparison =
    legacyComponents.length === 0
      ? 'LEGACY_UNSTRUCTURED'
      : legacyComponents.map(normalized).join('|') ===
          (candidate?.components || []).map((item) => normalized(item.label)).join('|')
        ? 'MATCH'
        : 'DIFFERENT';
  return Object.freeze({
    gradeId: legacy.gradeId,
    domainId: legacy.domainId,
    status,
    legacyFinalCompetencyStatus: legacyPresent ? 'PRESENT' : 'MISSING',
    candidateFinalCompetencyStatus: candidatePresent ? 'PRESENT' : 'MISSING',
    componentComparison,
    semanticReferenceComparison: status,
    expectedCorrection,
    risk: status === 'CONFLICT' ? 'BLOCKING' : expectedCorrection ? 'REVIEWED' : 'NONE',
  });
}

export function evaluateRuntimeIntegrationGate(comparisons: readonly ShadowComparison[]): Readonly<{
  result: 'PASS' | 'BLOCK';
  unexpectedCriticalConflicts: number;
}> {
  const unexpectedCriticalConflicts = comparisons.filter(
    (item) => item.status === 'CONFLICT' || item.status === 'AMBIGUOUS'
  ).length;
  return Object.freeze({
    result: unexpectedCriticalConflicts === 0 ? 'PASS' : 'BLOCK',
    unexpectedCriticalConflicts,
  });
}
