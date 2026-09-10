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
import {
  GRADE_FOUR_DOMAIN_ONE_OBJECTIVE_BANK,
  GRADE_FOUR_DOMAIN_ONE_RESOURCES,
} from './gradeFourDomainOneObjectiveBank';
import {
  GRADE_FIVE_DOMAIN_ONE_OBJECTIVE_BANK,
  GRADE_FIVE_DOMAIN_ONE_RESOURCES,
} from './gradeFiveDomainOneObjectiveBank';
import {
  GRADE_ONE_DOMAIN_TWO_OBJECTIVE_BANK,
  GRADE_ONE_DOMAIN_TWO_RESOURCES,
} from './gradeOneDomainTwoObjectiveBank';
import {
  GRADE_TWO_DOMAIN_TWO_OBJECTIVE_BANK,
  GRADE_TWO_DOMAIN_TWO_RESOURCES,
} from './gradeTwoDomainTwoObjectiveBank';
import {
  GRADE_THREE_DOMAIN_TWO_OBJECTIVE_BANK,
  GRADE_THREE_DOMAIN_TWO_RESOURCES,
} from './gradeThreeDomainTwoObjectiveBank';
import {
  GRADE_FOUR_DOMAIN_TWO_OBJECTIVE_BANK,
  GRADE_FOUR_DOMAIN_TWO_RESOURCES,
} from './gradeFourDomainTwoObjectiveBank';
import {
  GRADE_FIVE_DOMAIN_TWO_OBJECTIVE_BANK,
  GRADE_FIVE_DOMAIN_TWO_RESOURCES,
} from './gradeFiveDomainTwoObjectiveBank';
import {
  GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK,
  GRADE_ONE_DOMAIN_THREE_RESOURCES,
} from './gradeOneDomainThreeObjectiveBank';
import {
  GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK,
  GRADE_TWO_DOMAIN_THREE_RESOURCES,
} from './gradeTwoDomainThreeObjectiveBank';
import {
  GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK,
  GRADE_THREE_DOMAIN_THREE_RESOURCES,
} from './gradeThreeDomainThreeObjectiveBank';
import {
  GRADE_FOUR_DOMAIN_THREE_OBJECTIVE_BANK,
  GRADE_FOUR_DOMAIN_THREE_RESOURCES,
} from './gradeFourDomainThreeObjectiveBank';

export function getObjectiveBank(
  gradeId: string,
  domainId: string
): readonly ReferenceLearningObjective[] {
  if (gradeId === 'lvl_p1' && domainId === 'f_structuring') {
    return GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_structuring') {
    return GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_structuring') {
    return GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p4' && domainId === 'f_structuring') {
    return GRADE_FOUR_DOMAIN_THREE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p1' && domainId === 'f_fundamentals') {
    return GRADE_ONE_DOMAIN_TWO_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_fundamentals') {
    return GRADE_TWO_DOMAIN_TWO_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_fundamentals') {
    return GRADE_THREE_DOMAIN_TWO_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p4' && domainId === 'f_fundamentals') {
    return GRADE_FOUR_DOMAIN_TWO_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p5' && domainId === 'f_fundamentals') {
    return GRADE_FIVE_DOMAIN_TWO_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p1' && domainId === 'f_locomotion') {
    return GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_locomotion') {
    return GRADE_TWO_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_locomotion') {
    return GRADE_THREE_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p4' && domainId === 'f_locomotion') {
    return GRADE_FOUR_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  if (gradeId === 'lvl_p5' && domainId === 'f_locomotion') {
    return GRADE_FIVE_DOMAIN_ONE_OBJECTIVE_BANK;
  }
  return [];
}

export function getObjectiveBankResources(
  gradeId: string,
  domainId: string
): readonly ObjectiveBankResource[] {
  if (gradeId === 'lvl_p1' && domainId === 'f_structuring') {
    return GRADE_ONE_DOMAIN_THREE_RESOURCES;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_structuring') {
    return GRADE_TWO_DOMAIN_THREE_RESOURCES;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_structuring') {
    return GRADE_THREE_DOMAIN_THREE_RESOURCES;
  }
  if (gradeId === 'lvl_p4' && domainId === 'f_structuring') {
    return GRADE_FOUR_DOMAIN_THREE_RESOURCES;
  }
  if (gradeId === 'lvl_p1' && domainId === 'f_fundamentals') {
    return GRADE_ONE_DOMAIN_TWO_RESOURCES;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_fundamentals') {
    return GRADE_TWO_DOMAIN_TWO_RESOURCES;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_fundamentals') {
    return GRADE_THREE_DOMAIN_TWO_RESOURCES;
  }
  if (gradeId === 'lvl_p4' && domainId === 'f_fundamentals') {
    return GRADE_FOUR_DOMAIN_TWO_RESOURCES;
  }
  if (gradeId === 'lvl_p5' && domainId === 'f_fundamentals') {
    return GRADE_FIVE_DOMAIN_TWO_RESOURCES;
  }
  if (gradeId === 'lvl_p1' && domainId === 'f_locomotion') {
    return GRADE_ONE_DOMAIN_ONE_RESOURCES;
  }
  if (gradeId === 'lvl_p2' && domainId === 'f_locomotion') {
    return GRADE_TWO_DOMAIN_ONE_RESOURCES;
  }
  if (gradeId === 'lvl_p3' && domainId === 'f_locomotion') {
    return GRADE_THREE_DOMAIN_ONE_RESOURCES;
  }
  if (gradeId === 'lvl_p4' && domainId === 'f_locomotion') {
    return GRADE_FOUR_DOMAIN_ONE_RESOURCES;
  }
  if (gradeId === 'lvl_p5' && domainId === 'f_locomotion') {
    return GRADE_FIVE_DOMAIN_ONE_RESOURCES;
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
