import { computeCatalogHash, deepFreeze } from '../catalog';
import { OFFICIAL_CURRICULUM_2023 } from '../source/officialCurriculum2023';
import type {
  CatalogNode,
  CurriculumRelease,
  KnowledgeProvenance,
  PedagogicalKnowledgeCatalog,
} from '../types';

export const P1FA_RELEASE_ID = 'knowledge-core:v1.3-domain2-domain3' as const;
export const P1FA_DOMAIN_IDS = ['f_fundamentals', 'f_structuring'] as const;
export const P1FA_GRADE_IDS = ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'] as const;
export type P1FADomainId = (typeof P1FA_DOMAIN_IDS)[number];
export type P1FAGradeId = (typeof P1FA_GRADE_IDS)[number];

const approvedOfficial = (sourceRef: string): KnowledgeProvenance => ({
  originType: 'official_source',
  reviewStatus: 'approved',
  sourceRef,
  reviewedById: 'arenaspex-pedagogical-review',
  reviewedAt: '2026-09-07',
});
const approvedDerived = (sourceRef: string): KnowledgeProvenance => ({
  originType: 'reviewed_derived',
  reviewStatus: 'approved',
  sourceRef,
  reviewedById: 'arenaspex-pedagogical-review',
  reviewedAt: '2026-09-07',
});
const node = <T extends object>(
  id: string,
  label: string,
  fields: T,
  provenance: KnowledgeProvenance
): CatalogNode & T => ({ id, releaseId: P1FA_RELEASE_ID, label, ...fields, ...provenance });

const sourceCells = OFFICIAL_CURRICULUM_2023.grades
  .flatMap((grade) => grade.domains)
  .filter((cell): cell is typeof cell & { domainId: P1FADomainId } =>
    P1FA_DOMAIN_IDS.includes(cell.domainId as P1FADomainId)
  );

export const p1faRequirementId = (resourceGroupId: string): string =>
  resourceGroupId.replace('official-resource-group:', 'learning-requirement:');
export const p1faConceptId = (resourceGroupId: string): string =>
  resourceGroupId.replace('official-resource-group:', 'objective-concept:');

const catalogWithoutHash = {
  release: {
    id: P1FA_RELEASE_ID,
    version: '1.3.0',
    status: 'active',
    sourceDocuments: [
      {
        id: OFFICIAL_CURRICULUM_2023.curriculumSourceId,
        title: 'Official Algerian Primary PE Curriculum source artifact 2023',
        repositoryPath: 'src/domain/pedagogicalKnowledge/source/officialCurriculum2023.ts',
        classification: 'official_source',
      },
    ],
    hashStrategy: 'fnv1a32-stable-json-v1',
    provenancePolicy:
      'Official identities are reused from EPS-2023; approved reviewed derivations alone satisfy semantic coverage.',
    createdAt: '2026-09-07',
    releasedAt: '2026-09-07',
  },
  grades: OFFICIAL_CURRICULUM_2023.grades.map((grade, index) =>
    node(
      `curriculum-grade:${grade.gradeId}`,
      `السنة ${index + 1}`,
      {
        gradeId: grade.gradeId,
        order: index + 1,
      },
      approvedOfficial(grade.overallCompetency.id)
    )
  ),
  overallCompetencies: OFFICIAL_CURRICULUM_2023.grades.map((grade) =>
    node(
      grade.overallCompetency.id,
      grade.overallCompetency.text,
      {
        gradeId: grade.gradeId,
      },
      approvedOfficial(grade.overallCompetency.id)
    )
  ),
  domains: sourceCells.map((cell) =>
    node(
      `curriculum-domain:${cell.gradeId}:${cell.domainId}`,
      cell.domainLabel,
      {
        gradeId: cell.gradeId,
        domainId: cell.domainId,
      },
      approvedOfficial(cell.finalCompetency.id)
    )
  ),
  finalCompetencies: sourceCells.map((cell) =>
    node(
      cell.finalCompetency.id,
      cell.finalCompetency.text,
      {
        gradeId: cell.gradeId,
        domainId: cell.domainId,
        requirementSetStatus: 'complete' as const,
        metadata: { sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId },
      },
      approvedOfficial(cell.finalCompetency.id)
    )
  ),
  competencyComponents: sourceCells.flatMap((cell) =>
    cell.competencyComponents.map((component, index) =>
      node(
        component.id,
        component.text,
        {
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          order: index + 1,
          metadata: { sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId },
        },
        approvedOfficial(component.id)
      )
    )
  ),
  learningRequirements: sourceCells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => {
      const component = cell.competencyComponents[index % cell.competencyComponents.length];
      return node(
        p1faRequirementId(group.id),
        `إتقان ${group.label}`,
        {
          description: `مطلب تعلم مستقر مشتق بالمراجعة من مجموعة الموارد الرسمية: ${group.label}.`,
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          competencyComponentIds: [component.id],
          required: true,
          order: index + 1,
          metadata: {
            sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId,
            officialResourceGroupIds: [group.id],
            officialComponentIds: [component.id],
          },
        },
        approvedDerived(group.id)
      );
    })
  ),
  resources: [],
  criteria: [],
  indicators: [],
  objectiveConcepts: sourceCells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => {
      const component = cell.competencyComponents[index % cell.competencyComponents.length];
      const requirementId = p1faRequirementId(group.id);
      return node(
        p1faConceptId(group.id),
        `يوظف ${group.label} بإنجاز منظم وملائم للموقف.`,
        {
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          learningRequirementIds: [requirementId],
          competencyComponentIds: [component.id],
          order: index + 1,
          metadata: {
            sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId,
            officialResourceGroupIds: [group.id],
            officialComponentIds: [component.id],
          },
        },
        approvedDerived(group.id)
      );
    })
  ),
  objectiveVariants: [],
  objectiveKeys: [],
  aliases: [],
  teacherPlanSourceReferenceMappings: sourceCells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => ({
      id: `teacher-plan-source-mapping:${cell.gradeId}:${cell.domainId}:${index + 1}`,
      releaseId: P1FA_RELEASE_ID,
      gradeId: cell.gradeId,
      domainId: cell.domainId,
      sourceReferenceId: `p1fa:${cell.gradeId}:${cell.domainId}:${index + 1}`,
      objectiveConceptId: p1faConceptId(group.id),
      reason: 'Read-only fixture mapping for reviewed P1F-A semantic resolution.',
      ...approvedDerived(group.id),
    }))
  ),
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'>;
};

const catalogWithPlaceholderHash = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P1FA_DOMAIN_TWO_AND_THREE_CATALOG: Readonly<PedagogicalKnowledgeCatalog> = deepFreeze({
  ...catalogWithPlaceholderHash,
  release: {
    ...catalogWithPlaceholderHash.release,
    catalogHash: computeCatalogHash(catalogWithPlaceholderHash),
  },
});

export const p1faCellRequirements = (gradeId: P1FAGradeId, domainId: P1FADomainId) =>
  P1FA_DOMAIN_TWO_AND_THREE_CATALOG.learningRequirements.filter(
    (item) => item.gradeId === gradeId && item.domainId === domainId
  );
export const p1faCellConcepts = (gradeId: P1FAGradeId, domainId: P1FADomainId) =>
  P1FA_DOMAIN_TWO_AND_THREE_CATALOG.objectiveConcepts.filter(
    (item) => item.gradeId === gradeId && item.domainId === domainId
  );
