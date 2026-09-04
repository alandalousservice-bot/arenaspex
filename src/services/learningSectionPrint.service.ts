import type { CurriculumFieldDetail } from '../data/algerianCurriculum';
import type {
  TeacherLearningIntegrationPoint,
  TeacherLearningObjective,
  TeacherLearningPlanDomain,
  User,
} from '../types/spex';

export type LearningSectionPrintRowKind = 'diagnostic' | 'objective' | 'integration' | 'summative';

export interface LearningSectionPrintRow {
  kind: LearningSectionPrintRowKind;
  label: string;
  objective: string;
  learningContent: string;
  executionContent: string;
  situationsAndResources: string;
  knowledge: string;
  guidance: string;
}

export interface LearningSectionPrintModel {
  header: {
    institution: string;
    teacher: string;
    academicYear: string;
    level: string;
    domain: string;
  };
  overallCompetency: string;
  finalCompetency: string;
  criteria: string[];
  indicators: string[];
  rows: LearningSectionPrintRow[];
  signatures: {
    teacher: string;
    director: string;
    inspector: string;
  };
}

type PrintContext = {
  field: CurriculumFieldDetail;
  domain: TeacherLearningPlanDomain;
  level: string;
  overallCompetency: string;
  currentUser: Pick<User, 'firstName' | 'lastName' | 'schoolName'>;
  academicYearId: string;
};

const EMPTY = '—';

function text(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized || EMPTY;
}

function list(values: string[] | undefined): string {
  const normalized = (values || []).map((value) => value.trim()).filter(Boolean);
  return normalized.length ? normalized.join('؛ ') : EMPTY;
}

function situationsAndResources(
  item: Pick<TeacherLearningObjective | TeacherLearningIntegrationPoint, 'situations' | 'resources'>
): string {
  const situations = (item.situations || [])
    .map((situation) => situation.name.trim())
    .filter(Boolean)
    .map((name) => `موقف: ${name}`);
  const resources = (item.resources || []).map((resource) => resource.trim()).filter(Boolean);
  return list([...situations, ...resources]);
}

function teacherRow(
  kind: 'objective' | 'integration',
  label: string,
  item: TeacherLearningObjective | TeacherLearningIntegrationPoint
): LearningSectionPrintRow {
  return {
    kind,
    label,
    objective: text(
      kind === 'objective'
        ? (item as TeacherLearningObjective).text
        : (item as TeacherLearningIntegrationPoint).objective
    ),
    learningContent: text(item.learningContent),
    executionContent: text(item.executionContent),
    situationsAndResources: situationsAndResources(item),
    knowledge: text(item.pedagogicalKnowledge),
    guidance: text(item.guidance),
  };
}

/**
 * Maps one persisted teacher domain to the official print shape. The mapper
 * owns presentation only: curriculum supplies official values and the plan
 * supplies teacher-authored values and ordering.
 */
export function mapLearningSectionForPrint({
  field,
  domain,
  level,
  overallCompetency,
  currentUser,
  academicYearId,
}: PrintContext): LearningSectionPrintModel {
  const integrationsByAnchor = new Map<string | null, TeacherLearningIntegrationPoint[]>();
  [...domain.integrationPoints]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .forEach((point) => {
      const anchor = domain.objectives.some((objective) => objective.id === point.afterObjectiveId)
        ? point.afterObjectiveId
        : null;
      const bucket = integrationsByAnchor.get(anchor) || [];
      bucket.push(point);
      integrationsByAnchor.set(anchor, bucket);
    });

  const rows: LearningSectionPrintRow[] = [
    {
      kind: 'diagnostic',
      label: 'تقويم تشخيصي',
      objective: text(
        field.sessionsList.find((session) => session.type === 'تقويم تشخيصي')?.objective
      ),
      learningContent: EMPTY,
      executionContent: EMPTY,
      situationsAndResources: EMPTY,
      knowledge: EMPTY,
      guidance: EMPTY,
    },
  ];
  let integrationNumber = 0;
  const appendIntegrations = (anchor: string | null) => {
    (integrationsByAnchor.get(anchor) || []).forEach((point) => {
      integrationNumber += 1;
      rows.push(teacherRow('integration', `حصة إدماجية ${integrationNumber}`, point));
    });
  };

  appendIntegrations(null);
  domain.objectives.forEach((objective, index) => {
    rows.push(teacherRow('objective', `حصة تعلمية ${index + 1}`, objective));
    appendIntegrations(objective.id);
  });

  rows.push({
    kind: 'summative',
    label: 'تقويم تحصيلي',
    objective: text(
      field.sessionsList.find((session) => session.type === 'تقويم تحصيلي')?.objective
    ),
    learningContent: EMPTY,
    executionContent: EMPTY,
    situationsAndResources: EMPTY,
    knowledge: EMPTY,
    guidance: EMPTY,
  });

  return {
    header: {
      institution: text(currentUser.schoolName),
      teacher: text(`${currentUser.firstName} ${currentUser.lastName}`),
      academicYear: academicYearId,
      level: text(level),
      domain: text(field.fieldName),
    },
    overallCompetency: text(overallCompetency),
    finalCompetency: text(field.finalCompetency),
    criteria: field.criteria.map(text),
    indicators: field.indicators.map(text),
    rows,
    signatures: {
      teacher: text(`${currentUser.firstName} ${currentUser.lastName}`),
      director: EMPTY,
      inspector: EMPTY,
    },
  };
}
