import {
  GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK,
  GRADE_ONE_DOMAIN_ONE_RESOURCES,
  type ObjectiveBankResource,
  type ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import {
  GRADE_TWO_DOMAIN_ONE_OBJECTIVE_BANK,
  GRADE_TWO_DOMAIN_ONE_RESOURCES,
} from './gradeTwoDomainOneObjectiveBank';
import {
  GRADE_THREE_DOMAIN_ONE_OBJECTIVE_BANK,
  GRADE_THREE_DOMAIN_ONE_RESOURCES,
} from './gradeThreeDomainOneObjectiveBank';

export function getObjectiveBank(
  gradeId: string,
  domainId: string
): readonly ReferenceLearningObjective[] {
  if (gradeId === 'lvl_p1' && domainId === 'f_locomotion') {
    return GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_locomotion') {
    return GRADE_TWO_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_locomotion') {
    return GRADE_THREE_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  return [];
}

export function getObjectiveBankResources(
  gradeId: string,
  domainId: string
): readonly ObjectiveBankResource[] {
  if (gradeId === 'lvl_p1' && domainId === 'f_locomotion') {
    return GRADE_ONE_DOMAIN_ONE_RESOURCES;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_locomotion') {
    return GRADE_TWO_DOMAIN_ONE_RESOURCES;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_locomotion') {
    return GRADE_THREE_DOMAIN_ONE_RESOURCES;
  }
  return [];
}

export function getObjectiveBankItem(
  gradeId: string,
  domainId: string,
  objectiveId: string
): ReferenceLearningObjective | undefined {
  return getObjectiveBank(gradeId, domainId).find((item) => item.id === objectiveId);
}
