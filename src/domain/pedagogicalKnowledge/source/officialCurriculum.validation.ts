import {
  OFFICIAL_CURRICULUM_DOMAIN_IDS,
  OFFICIAL_CURRICULUM_GRADE_IDS,
  type OfficialCurriculumSourceArtifact,
  type OfficialSourceRecord,
} from './officialCurriculum.types';

const EXPECTED_DOMAIN_ONE_COMPONENT_IDS = OFFICIAL_CURRICULUM_GRADE_IDS.flatMap((gradeId) =>
  [1, 2, 3].map((index) => `learning-section:${gradeId}:f_locomotion:component:${index}`)
);

export const OFFICIAL_DOMAIN_ONE_FINAL_COMPETENCY_IDS = OFFICIAL_CURRICULUM_GRADE_IDS.map(
  (gradeId) => `fc_${gradeId}_f_locomotion`
);
export const OFFICIAL_DOMAIN_ONE_COMPONENT_IDS = EXPECTED_DOMAIN_ONE_COMPONENT_IDS;

export function validateOfficialCurriculum2023(
  artifact: OfficialCurriculumSourceArtifact
): string[] {
  const errors: string[] = [];
  const cells = artifact.grades.flatMap((grade) => grade.domains);
  const finalCompetencies = cells.map((cell) => cell.finalCompetency);
  const components = cells.flatMap((cell) => cell.competencyComponents);
  const resources = cells.flatMap((cell) => cell.resourceGroups);
  const records: OfficialSourceRecord[] = [
    ...artifact.grades.map((grade) => grade.overallCompetency),
    ...finalCompetencies,
    ...components,
    ...resources,
  ];

  if (artifact.grades.length !== 5) errors.push('Expected exactly 5 grades.');
  if (new Set(cells.map((cell) => cell.domainId)).size !== 3)
    errors.push('Expected exactly 3 domains.');
  if (cells.length !== 15) errors.push('Expected exactly 15 grade/domain cells.');
  if (artifact.grades.length !== 5) errors.push('Expected exactly 5 overall competencies.');
  if (finalCompetencies.length !== 15) errors.push('Expected exactly 15 final competencies.');
  if (components.length !== 45) errors.push('Expected exactly 45 competency components.');
  if (resources.length !== 52) errors.push('Expected exactly 52 resource groups.');

  const expectedCells = new Set(
    OFFICIAL_CURRICULUM_GRADE_IDS.flatMap((gradeId) =>
      OFFICIAL_CURRICULUM_DOMAIN_IDS.map((domainId) => `${gradeId}|${domainId}`)
    )
  );
  for (const cell of cells) {
    const cellKey = `${cell.gradeId}|${cell.domainId}`;
    if (!expectedCells.delete(cellKey)) errors.push(`Duplicate or unknown cell: ${cellKey}`);
    if (cell.competencyComponents.length !== 3) errors.push(`${cellKey}: expected 3 components.`);
    if (
      cell.finalCompetency.gradeId !== cell.gradeId ||
      cell.finalCompetency.domainId !== cell.domainId
    ) {
      errors.push(`${cell.finalCompetency.id}: final competency escaped its source cell.`);
    }
    for (const component of cell.competencyComponents) {
      if (
        component.finalCompetencyId !== cell.finalCompetency.id ||
        component.gradeId !== cell.gradeId ||
        component.domainId !== cell.domainId
      )
        errors.push(`${component.id}: component escaped its source cell.`);
    }
    for (const resource of cell.resourceGroups) {
      if (
        resource.finalCompetencyId !== cell.finalCompetency.id ||
        resource.gradeId !== cell.gradeId ||
        resource.domainId !== cell.domainId
      )
        errors.push(`${resource.id}: resource escaped its source cell.`);
    }
  }
  if (expectedCells.size) errors.push(`Missing cells: ${[...expectedCells].join(', ')}`);

  const ids = records.map((record) => record.id);
  if (new Set(ids).size !== ids.length) errors.push('All source record IDs must be unique.');
  for (const record of records) {
    if (!record.sourceDocument || !record.sourcePage || !record.sourceHeading) {
      errors.push(`${record.id}: incomplete source provenance.`);
    }
    if (!['official_verbatim', 'official_structured_extraction'].includes(record.provenance)) {
      errors.push(`${record.id}: invalid source-layer provenance.`);
    }
  }

  const finalIds = new Set(finalCompetencies.map((item) => item.id));
  const componentIds = new Set(components.map((item) => item.id));
  for (const id of OFFICIAL_DOMAIN_ONE_FINAL_COMPETENCY_IDS) {
    if (!finalIds.has(id)) errors.push(`Missing preserved Domain 1 final competency ID: ${id}`);
  }
  for (const id of OFFICIAL_DOMAIN_ONE_COMPONENT_IDS) {
    if (!componentIds.has(id)) errors.push(`Missing preserved Domain 1 component ID: ${id}`);
  }
  if (artifact.evaluationFramework.perCellCriteriaAvailable) {
    errors.push('Per-cell criteria must not be invented.');
  }
  if (artifact.evaluationFramework.perCellIndicatorsAvailable) {
    errors.push('Per-cell indicators must not be invented.');
  }
  return errors;
}
