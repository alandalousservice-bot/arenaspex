import type { CatalogNode, KnowledgeProvenance } from './types';

const COVERAGE_ORIGINS = new Set<KnowledgeProvenance['originType']>([
  'official_source',
  'platform_decision',
  'reviewed_derived',
]);

export const isApprovedKnowledge = (value: KnowledgeProvenance): boolean =>
  value.reviewStatus === 'approved' && COVERAGE_ORIGINS.has(value.originType);

export const canSatisfyAuthoritativeCoverage = (value: KnowledgeProvenance): boolean =>
  isApprovedKnowledge(value) &&
  value.originType !== 'unresolved' &&
  value.originType !== 'teacher_owned';

export function validateProvenance(value: KnowledgeProvenance, id = 'knowledge item'): string[] {
  const errors: string[] = [];

  if (value.originType === 'unresolved' && value.reviewStatus === 'approved') {
    errors.push(`${id}: unresolved knowledge cannot be approved`);
  }
  if (value.originType === 'teacher_owned' && value.reviewStatus === 'approved') {
    errors.push(`${id}: teacher-owned knowledge cannot become authoritative catalog knowledge`);
  }
  if (value.reviewStatus === 'reviewed' && !value.reviewedAt) {
    errors.push(`${id}: reviewed knowledge requires reviewedAt metadata`);
  }
  if (value.reviewStatus === 'approved' && (!value.reviewedAt || !value.reviewedById)) {
    errors.push(`${id}: approved knowledge requires reviewedAt and reviewedById metadata`);
  }
  if (value.reviewStatus === 'deprecated' && !value.supersedesId && !value.sourceRef) {
    errors.push(`${id}: deprecated knowledge requires historical resolution metadata`);
  }

  return errors;
}

export const isActiveCatalogNode = (value: CatalogNode): boolean =>
  value.reviewStatus !== 'deprecated';
