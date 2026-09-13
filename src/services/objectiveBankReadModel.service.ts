import { COMPLETE_ANNUAL_CURRICULUM } from '../data/algerianCurriculum';
import {
  buildCurriculumObjectiveReferences,
  type CurriculumObjectiveReference,
} from './knowledgeCoverage.service';
import type { KnowledgeItem } from '../types/spex';

export type ObjectiveAdoptionStatus = 'ADOPTED' | 'UNUSED';

export interface ObjectiveBankAlternative {
  objectiveId: string;
  wording: string;
  source: string;
}

export interface ObjectiveBankReadModel extends CurriculumObjectiveReference {
  wording: string;
  grade: number;
  domain: string;
  position?: number;
  sessionType?: string;
  adoptionStatus: ObjectiveAdoptionStatus;
  requirements: string[];
  skills: string[];
  criteria: string[];
  indicators: string[];
  progression?: string;
  whyThisObjective: string;
  learnerAcquisition: string;
  alternativeWording: ObjectiveBankAlternative[];
  alternativeObjectives: ObjectiveBankAlternative[];
  sourceProvenance: string[];
}

export interface ObjectiveBankFilters {
  search?: string;
  gradeId?: string;
  domainId?: string;
  finalCompetency?: string;
  learningSection?: string;
  adoptionStatus?: ObjectiveAdoptionStatus;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const PROGRESSION_LABELS: Record<string, string> = {
  foundation: 'مرحلة التأسيس',
  transition: 'مرحلة الانتقال',
  balance: 'مرحلة التوازن',
  'locomotion-basic': 'التنقل الأساسي',
  'locomotion-advanced': 'التنقل المتقدم',
  adaptation: 'مرحلة التكيف',
  'speed-control': 'التحكم في السرعة',
  'path-straight': 'المسار المستقيم',
  'path-zigzag': 'المسار المتعرج',
  'path-circular': 'المسار الدائري',
  organization: 'مرحلة التنظيم',
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function findCurriculumSession(reference: CurriculumObjectiveReference) {
  const level = COMPLETE_ANNUAL_CURRICULUM[reference.levelId];
  const field = level?.fields[reference.fieldId];
  return field?.sessionsList.find(
    (session) => normalize(session.objective) === normalize(reference.objectiveText)
  );
}

function groundedWhy(
  reference: CurriculumObjectiveReference,
  requirements: string[],
  skills: string[],
  progression?: string
): string {
  const parts: string[] = [];
  if (reference.finalCompetency) {
    parts.push(`يخدم الكفاءة الختامية: ${reference.finalCompetency}`);
  }
  const components = unique([...requirements, ...skills]);
  if (components.length > 0) {
    parts.push(`من خلال: ${components.join('، ')}`);
  }
  if (progression) {
    parts.push(`وموقعه في التدرج هو ${progression}`);
  }
  return parts.join(' ') || 'لا تتوفر علاقة تفسيرية إضافية في البيانات الحالية.';
}

function learnerAcquisition(reference: CurriculumObjectiveReference): string {
  return reference.learningContent || reference.objectiveText;
}

export function buildObjectiveBankReadModel(
  knowledgeItems: KnowledgeItem[] = []
): ObjectiveBankReadModel[] {
  const references = buildCurriculumObjectiveReferences(knowledgeItems);

  return references.map((reference) => {
    const adoptedByStableReference = knowledgeItems.some(
      (item) =>
        item.approved &&
        item.category === 'objective' &&
        item.objectiveId === reference.canonicalObjectiveId
    );
    const session = findCurriculumSession(reference);
    const level = COMPLETE_ANNUAL_CURRICULUM[reference.levelId];
    const field = level?.fields[reference.fieldId];
    const position = session?.sessionNumber;
    const progressionParts = [
      PROGRESSION_LABELS[reference.progressionStage],
      position && field
        ? `الحصة ${position} من ${field.sessionsCount}${session.typeLabel ? ` — ${session.typeLabel}` : ''}`
        : undefined,
    ].filter((value): value is string => Boolean(value));
    const progression = progressionParts.length > 0 ? progressionParts.join(' · ') : undefined;
    const requirements = unique(reference.resourceLabels);
    const skills = unique(reference.transversalResources);
    const alternativeWording = knowledgeItems
      .filter(
        (item) =>
          item.approved &&
          item.category === 'objective' &&
          item.objectiveId === reference.canonicalObjectiveId &&
          normalize(item.description || item.title) !== normalize(reference.objectiveText)
      )
      .map((item) => ({
        objectiveId: reference.canonicalObjectiveId,
        wording: item.description || item.title,
        source: item.origin === 'CURRICULUM_REFERENCE' ? 'مرجع المنصة' : item.createdBy,
      }));

    return {
      ...reference,
      wording: reference.objectiveText,
      grade: Number(reference.gradeId.replace('lvl_p', '')),
      domain: reference.fieldName,
      position,
      sessionType: session?.typeLabel,
      adoptionStatus:
        reference.adoptedInCurrentSection || adoptedByStableReference ? 'ADOPTED' : 'UNUSED',
      requirements,
      skills,
      criteria: field ? [...field.criteria] : [],
      indicators: field ? [...field.indicators] : [],
      progression,
      whyThisObjective: groundedWhy(reference, requirements, skills, progression),
      learnerAcquisition: learnerAcquisition(reference),
      alternativeWording,
      alternativeObjectives: [],
      sourceProvenance: [
        ...new Set([...reference.curriculumResourceIds, ...reference.transversalResourceIds]),
      ],
    };
  });
}

export function filterObjectiveBankReadModel(
  objectives: readonly ObjectiveBankReadModel[],
  filters: ObjectiveBankFilters
): ObjectiveBankReadModel[] {
  const query = normalize(filters.search || '');
  return objectives.filter((objective) => {
    if (filters.gradeId && objective.gradeId !== filters.gradeId) return false;
    if (filters.domainId && objective.domainId !== filters.domainId) return false;
    if (
      filters.finalCompetency &&
      normalize(objective.finalCompetency || '') !== normalize(filters.finalCompetency)
    ) {
      return false;
    }
    if (
      filters.learningSection &&
      normalize(objective.learningSection || '') !== normalize(filters.learningSection)
    ) {
      return false;
    }
    if (filters.adoptionStatus && objective.adoptionStatus !== filters.adoptionStatus) {
      return false;
    }
    if (!query) return true;
    return [
      objective.wording,
      objective.domain,
      objective.finalCompetency || '',
      objective.learningSection || '',
      ...objective.requirements,
      ...objective.skills,
    ].some((value) => normalize(value).includes(query));
  });
}

export function objectiveAdoptionLabel(status: ObjectiveAdoptionStatus): string {
  return status === 'ADOPTED' ? 'معتمد في المقطع' : 'غير مستخدم في المقطع الحالي';
}
