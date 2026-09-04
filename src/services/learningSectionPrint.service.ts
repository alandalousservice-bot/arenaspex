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
  finalCompetency: string;
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
  currentUser: Pick<User, 'firstName' | 'lastName' | 'schoolName'>;
  academicYearId: string;
};

const EMPTY = '—';
const EMPTY_CELL = '';

function text(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized || EMPTY;
}

function optionalText(value: string | null | undefined): string {
  return value?.trim() || EMPTY_CELL;
}

function situationsAndResources(
  item: Pick<TeacherLearningObjective | TeacherLearningIntegrationPoint, 'situations' | 'resources'>
): string {
  const situations = (item.situations || [])
    .map((situation) => situation.name.trim())
    .filter(Boolean)
    .map((name) => `موقف: ${name}`);
  const resources = (item.resources || []).map((resource) => resource.trim()).filter(Boolean);
  return [...situations, ...resources].join('؛ ');
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
    learningContent: optionalText(item.learningContent),
    executionContent: optionalText(item.executionContent),
    situationsAndResources: situationsAndResources(item),
    knowledge: optionalText(item.pedagogicalKnowledge),
    guidance: optionalText(item.guidance),
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
      learningContent: EMPTY_CELL,
      executionContent: EMPTY_CELL,
      situationsAndResources: EMPTY_CELL,
      knowledge: EMPTY_CELL,
      guidance: EMPTY_CELL,
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
    learningContent: EMPTY_CELL,
    executionContent: EMPTY_CELL,
    situationsAndResources: EMPTY_CELL,
    knowledge: EMPTY_CELL,
    guidance: EMPTY_CELL,
  });

  return {
    header: {
      institution: text(currentUser.schoolName),
      teacher: text(`${currentUser.firstName} ${currentUser.lastName}`),
      academicYear: academicYearId,
      level: text(level),
      domain: text(field.fieldName),
    },
    finalCompetency: text(field.finalCompetency),
    rows,
    signatures: {
      teacher: text(`${currentUser.firstName} ${currentUser.lastName}`),
      director: EMPTY,
      inspector: EMPTY,
    },
  };
}
