import { COMPLETE_ANNUAL_CURRICULUM, PE_FIELDS, PE_LEVELS } from '../data/algerianCurriculum';
import { referenceSituations } from './educationalSituation.selector.service';
import { KnowledgeItem, EducationalSituation, UserRole } from '../types/spex';

export type CoverageResourceType = 'games' | 'objectives' | 'remedial' | 'situations';
export type CoverageStatus = 'EMPTY' | 'LOW' | 'ADEQUATE';

export interface KnowledgeCoverageCell {
  grade: number;
  levelId: string;
  levelName: string;
  fieldId: string;
  fieldName: string;
  gamesCount: number;
  objectivesCount: number;
  remedialCount: number;
  situationsCount: number;
  statuses: Record<CoverageResourceType, CoverageStatus>;
}

export interface CurriculumObjectiveReference {
  id: string;
  category: 'objective';
  title: string;
  description: string;
  origin: 'CURRICULUM_REFERENCE';
  approvalStatus: 'APPROVED';
  approved: true;
  createdBy: string;
  fieldId: string;
  fieldName: string;
  levelId: string;
  levelIds?: string[];
  levelName: string;
  tags: string[];
  usageCount: number;
  rating: number;
  equipment?: string[];
  rules?: string;
}

const FIELD_NAMES: Record<string, string> = {
  f_locomotion: 'الوضعيات والتنقلات',
  f_fundamentals: 'الحركات القاعدية',
  f_structuring: 'الهيكلة والبناء',
};

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
const levelNumber = (levelId: string) => Number(levelId.replace('lvl_p', ''));

export function coverageStatus(count: number): CoverageStatus {
  if (count === 0) return 'EMPTY';
  if (count <= 2) return 'LOW';
  return 'ADEQUATE';
}

export function canViewCoverageDiagnostics(role: UserRole): boolean {
  return role === 'admin' || role === 'inspector';
}

export function buildCurriculumObjectiveReferences(
  items: KnowledgeItem[] = []
): CurriculumObjectiveReference[] {
  const references: CurriculumObjectiveReference[] = [];
  Object.values(COMPLETE_ANNUAL_CURRICULUM).forEach((level) => {
    Object.values(level.fields).forEach((field) => {
      field.sessionsList.forEach((session) => {
        const key = `${level.levelId}|${field.fieldId}|${normalize(session.objective)}`;
        const matching = items.some(
          (item) =>
            item.category === 'objective' &&
            normalize(item.description || item.title) === normalize(session.objective) &&
            (item.levelIds?.includes(level.levelId) || item.levelId === level.levelId) &&
            item.fieldId === field.fieldId
        );
        if (
          !matching &&
          !references.some(
            (ref) => `${ref.levelId}|${ref.fieldId}|${normalize(ref.description)}` === key
          )
        ) {
          references.push({
            id: `curriculum_objective_${level.levelId}_${field.fieldId}_${session.sessionNumber}`,
            category: 'objective',
            title: session.objective,
            description: session.objective,
            origin: 'CURRICULUM_REFERENCE',
            approvalStatus: 'APPROVED',
            approved: true,
            createdBy: 'مرجع منهجي داخل المنصة',
            fieldId: field.fieldId,
            fieldName:
              FIELD_NAMES[field.fieldId] || field.fieldName.replace(/^الميدان \S+[:：]\s*/, ''),
            levelId: level.levelId,
            levelName: level.levelName,
            tags: ['مرجع منهجي', session.typeLabel],
            usageCount: 0,
            rating: 0,
          });
        }
      });
    });
  });
  return references;
}

export function buildKnowledgeCoverage({
  knowledgeItems,
  educationalSituations = referenceSituations,
}: {
  knowledgeItems: KnowledgeItem[];
  educationalSituations?: EducationalSituation[];
}): KnowledgeCoverageCell[] {
  const objectiveReferences = buildObjectiveReadModel(knowledgeItems);
  return PE_LEVELS.flatMap((level) => {
    const grade = levelNumber(level.id);
    return PE_FIELDS.map((field) => {
      const items = knowledgeItems.filter(
        (item) =>
          item.approved &&
          item.category !== 'situation' &&
          item.fieldId === field.id &&
          (item.levelIds?.includes(level.id) || item.levelId === level.id)
      );
      const objectives = objectiveReferences.filter(
        (item) =>
          item.category === 'objective' &&
          item.fieldId === field.id &&
          (item.levelIds?.includes(level.id) || item.levelId === level.id)
      );
      const gamesCount = items.filter((item) => item.category === 'game').length;
      const remedialCount = items.filter((item) => item.category === 'remedial').length;
      const situationsCount = educationalSituations.filter(
        (s) => s.status === 'APPROVED' && s.grade === grade && s.fieldId === field.id
      ).length;
      const counts = {
        gamesCount,
        objectivesCount: objectives.length,
        remedialCount,
        situationsCount,
      };
      return {
        grade,
        levelId: level.id,
        levelName: level.name,
        fieldId: field.id,
        fieldName: FIELD_NAMES[field.id] || field.name,
        ...counts,
        statuses: {
          games: coverageStatus(gamesCount),
          objectives: coverageStatus(objectives.length),
          remedial: coverageStatus(remedialCount),
          situations: coverageStatus(situationsCount),
        },
      };
    });
  });
}

export function buildObjectiveReadModel(
  knowledgeItems: KnowledgeItem[]
): Array<KnowledgeItem | CurriculumObjectiveReference> {
  const existing = knowledgeItems.filter((item) => item.approved && item.category === 'objective');
  const seen = new Set<string>();
  const deduped = existing.filter((item) => {
    const levels = item.levelIds?.length ? item.levelIds : item.levelId ? [item.levelId] : ['all'];
    const keys = levels.map(
      (levelId) => `${levelId}|${item.fieldId || ''}|${normalize(item.description || item.title)}`
    );
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
  return [...deduped, ...buildCurriculumObjectiveReferences(deduped)];
}
