import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPLETE_ANNUAL_CURRICULUM } from '../src/data/algerianCurriculum';
import {
  P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
  P1C_GRADE_IDS,
  P1C_RELEASE_ID,
  P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION,
  auditDefaultIntegrationBoundaries,
  operationalReconciliationDecisionCounts,
  operationalReconciliationForGrade,
  p1cFinalCompetencyId,
  projectTeacherPlanSemantics,
  type P1CGradeId,
  type TeacherPlanSemanticDomainInput,
} from '../src/domain/pedagogicalKnowledge';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import type { PedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/types';

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

const operationalDomain = (gradeId: P1CGradeId): TeacherPlanSemanticDomainInput => {
  const plan = seedTeacherLearningPlan(gradeId);
  return plan.domains.find(
    (domain) => domain.fieldId === 'f_locomotion'
  ) as TeacherPlanSemanticDomainInput;
};

const project = (
  gradeId: P1CGradeId,
  domain: TeacherPlanSemanticDomainInput = operationalDomain(gradeId),
  catalog: PedagogicalKnowledgeCatalog = P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG
) =>
  projectTeacherPlanSemantics({
    catalog,
    coreReleaseId: P1C_RELEASE_ID,
    gradeId,
    domainId: 'f_locomotion',
    finalCompetencyId: p1cFinalCompetencyId(gradeId),
    domain,
  });

describe('P1D Domain 1 operational reconciliation', () => {
  it('audits all 35 Grade 1–5 operational learning references without changing source wording', () => {
    expect(P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION).toHaveLength(35);
    for (const gradeId of ['lvl_p1', ...P1C_GRADE_IDS] as const) {
      const records = operationalReconciliationForGrade(gradeId);
      const source = COMPLETE_ANNUAL_CURRICULUM[gradeId].fields.f_locomotion.sessionsList.filter(
        (session) => session.type === 'تعلمية'
      );
      expect(records).toHaveLength(7);
      expect(records.map((item) => item.sourceReferenceId)).toEqual(
        source.map((session) => `f_locomotion__${session.sessionNumber}`)
      );
      expect(records.map((item) => item.operationalWording)).toEqual(
        source.map((session) => session.objective)
      );
    }
  });

  it('records deterministic reconciliation decisions and only evidence-backed safe mappings', () => {
    expect(operationalReconciliationDecisionCounts()).toEqual({
      RETAIN: 0,
      ALIAS: 10,
      REVIEWED_MAP: 4,
      REPLACE_LATER: 14,
      KEEP_UNMAPPED: 0,
      PRODUCT_DECISION_REQUIRED: 7,
    });
    const safe = P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter(
      (item) => item.safeAlias || item.safeReviewedMapping
    );
    expect(safe).toHaveLength(14);
    expect(safe.every((item) => item.canonicalConceptCandidateId)).toBe(true);
    expect(safe.every((item) => item.canonicalRequirementIds.length > 0)).toBe(true);
    expect(
      P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter((item) => item.gradeId === 'lvl_p3').every(
        (item) => !item.safeAlias && !item.safeReviewedMapping
      )
    ).toBe(true);
    expect(
      P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter((item) => item.gradeId === 'lvl_p4').every(
        (item) => !item.safeAlias && !item.safeReviewedMapping
      )
    ).toBe(true);
    expect(
      P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter((item) => item.gradeId === 'lvl_p5').every(
        (item) => !item.safeAlias && !item.safeReviewedMapping
      )
    ).toBe(true);
  });

  it('moves Grade 2 from unmapped to complete only through approved catalog mappings', () => {
    const beforeCatalog: PedagogicalKnowledgeCatalog = {
      ...P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
      teacherPlanSourceReferenceMappings: [],
    };
    const before = project('lvl_p2', operationalDomain('lvl_p2'), beforeCatalog);
    const after = project('lvl_p2');
    expect(before.objectiveResolutions.every((item) => item.resolutionStatus === 'unmapped')).toBe(
      true
    );
    expect(before.coverageStatus).toBe('unmapped');
    expect(
      after.objectiveResolutions.every((item) => item.resolutionStatus === 'source_reference')
    ).toBe(true);
    expect(after.coverageStatus).toBe('complete');
    expect(after.coveredRequirements).toHaveLength(4);
  });

  it.each(['lvl_p3', 'lvl_p4', 'lvl_p5'] as const)(
    'keeps unsafe %s mappings unmapped with honest coverage',
    (gradeId) => {
      const result = project(gradeId);
      expect(result.objectiveResolutions).toHaveLength(7);
      expect(
        result.objectiveResolutions.every((item) => item.resolutionStatus === 'unmapped')
      ).toBe(true);
      expect(result.unmappedObjectives).toHaveLength(7);
      expect(result.ambiguousObjectives).toHaveLength(0);
      expect(result.coverageStatus).toBe('unmapped');
    }
  );

  it('isolates identical sourceReferenceIds by grade and domain', () => {
    const gradeTwo = project('lvl_p2', {
      ...operationalDomain('lvl_p2'),
      objectives: [operationalDomain('lvl_p2').objectives[0]],
      integrationPoints: [],
    });
    const gradeThree = project('lvl_p3', {
      ...operationalDomain('lvl_p3'),
      objectives: [operationalDomain('lvl_p3').objectives[0]],
      integrationPoints: [],
    });
    expect(gradeTwo.objectiveResolutions[0].resolutionStatus).toBe('source_reference');
    expect(gradeThree.objectiveResolutions[0].resolutionStatus).toBe('unmapped');
  });

  it('never promotes matching text through fuzzy or wording-only authority', () => {
    const canonicalText = P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveConcepts.find(
      (concept) => concept.id === 'objective-concept:lvl_p3:f_locomotion:1'
    )!.label;
    const result = project('lvl_p3', {
      ...operationalDomain('lvl_p3'),
      objectives: [{ id: 'wording-only', text: canonicalText, orderIndex: 1 }],
      integrationPoints: [],
    });
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('unmapped');
  });

  it('keeps an ambiguous alias ambiguous and chooses no target', () => {
    const catalog: PedagogicalKnowledgeCatalog = {
      ...P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
      aliases: [
        ...P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.aliases,
        {
          legacyId: 'ambiguous-operational-reference',
          canonicalId: 'objective-concept:lvl_p3:f_locomotion:1',
          reason: 'Conflicting reviewed candidate A.',
        },
        {
          legacyId: 'ambiguous-operational-reference',
          canonicalId: 'objective-concept:lvl_p3:f_locomotion:2',
          reason: 'Conflicting reviewed candidate B.',
        },
      ],
    };
    const result = project(
      'lvl_p3',
      {
        ...operationalDomain('lvl_p3'),
        objectives: [
          {
            id: 'ambiguous-objective',
            text: 'صياغة غير حاسمة',
            orderIndex: 1,
            sourceReferenceId: 'ambiguous-operational-reference',
          },
        ],
        integrationPoints: [],
      },
      catalog
    );
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('ambiguous');
    expect(result.objectiveResolutions[0].objectiveConceptId).toBeUndefined();
  });

  it.each(P1C_GRADE_IDS)(
    'identifies the shared %s Objective 7 placement defect without moving anchors',
    (gradeId) => {
      const domain = operationalDomain(gradeId);
      const before = structuredClone(domain);
      const audit = auditDefaultIntegrationBoundaries(domain);
      const projection = project(gradeId, domain);
      expect(audit).toEqual({
        integrationAnchorObjectiveIndexes: [3, 6],
        outsideObjectiveIndexes: [7],
        sharedRootCause: 'SECOND_INTEGRATION_FALLBACK_ANCHORED_TO_PENULTIMATE_OBJECTIVE',
        classification: 'PLACEMENT_DEFECT',
      });
      expect(
        projection.warnings.some((item) => item.code === 'objective_outside_integration_cycles')
      ).toBe(true);
      expect(domain).toEqual(before);
    }
  );

  it('does not mutate the catalog or Teacher Plan input during reconciliation projection', () => {
    const domain = structuredClone(operationalDomain('lvl_p2'));
    const beforeDomain = structuredClone(domain);
    const beforeCatalog = JSON.stringify(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG);
    project('lvl_p2', domain);
    expect(domain).toEqual(beforeDomain);
    expect(JSON.stringify(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG)).toBe(beforeCatalog);
  });

  it('has no production import or runtime activation outside the knowledge-core boundary', () => {
    const forbiddenImports = sourceFiles(join(process.cwd(), 'src'))
      .filter((path) => !path.includes(`${join('domain', 'pedagogicalKnowledge')}`))
      .filter((path) =>
        /operationalReconciliation|P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION/.test(
          readFileSync(path, 'utf8')
        )
      );
    expect(forbiddenImports).toEqual([]);
  });
});
