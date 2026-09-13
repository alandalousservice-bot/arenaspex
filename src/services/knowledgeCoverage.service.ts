import { COMPLETE_ANNUAL_CURRICULUM, PE_FIELDS, PE_LEVELS } from '../data/algerianCurriculum';
import { getObjectiveBank, getObjectiveBankResources } from '../data/objectiveBankRegistry';
import {
  isAutoGenerationEligible,
  referenceSituations,
} from './educationalSituation.selector.service';
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
  canonicalObjectiveId: string;
  objectiveText: string;
  gradeId: string;
  domainId: string;
  curriculumResourceIds: string[];
  resourceLabels: string[];
  resourceFamilies: string[];
  transversalResourceIds: string[];
  transversalResources: string[];
  competencyComponentIds: string[];
  learningContent: string;
  mobilizedKnowledge: string;
  executionContent: string;
  guidance: string;
  progressionStage: string;
  sequenceWeight: number;
  finalCompetency?: string;
  learningSection?: string;
  adoptedInCurrentSection: boolean;
  usageStatus: 'adopted' | 'alternative' | 'proposed' | 'unused';
  equipment?: string[];
  rules?: string;
}

const FIELD_NAMES: Record<string, string> = {
  f_locomotion: 'الوضعيات والتنقلات',
  f_fundamentals: 'الحركات القاعدية',
  f_structuring: 'الهيكلة والبناء',
};

const TRANSVERSAL_RESOURCE_LABELS: Record<string, string> = {
  attention: 'الانتباه والاستجابة للتوجيه',
  safety: 'السلامة في فضاء الممارسة',
  cooperation: 'التعاون مع الزملاء',
  'rule-respect': 'احترام القواعد',
  'body-awareness': 'الوعي بالجسم',
  'body-control': 'التحكم في الجسم',
  'effective-limb-use': 'الاستخدام الفعال للأطراف',
  'execution-space': 'استغلال فضاء التنفيذ',
  'group-synchronization': 'التزامن داخل المجموعة',
  'instruction-response': 'الاستجابة للتعليمات',
  'limb-coordination': 'تناسق عمل الأطراف',
  'limb-integration': 'تكامل وظائف الأطراف',
  'locomotion-pattern': 'أنماط التنقل',
  'movement-adaptation': 'التكيف الحركي',
  'movement-chaining': 'ربط الحركات',
  'movement-coordination': 'التنسيق الحركي',
  'organization-safety': 'التنظيم والسلامة',
  'path-control': 'التحكم في المسار',
  'posture-by-situation': 'الوضعية المناسبة للموقف',
  'rhythm-adaptation': 'التكيف مع الوتيرة',
  'rhythm-response': 'الاستجابة للوتيرة',
  'self-peer-regulation': 'تنظيم العلاقة مع الزملاء',
  'self-peer-safety': 'السلامة الذاتية وسلامة الزملاء',
  'self-regulation': 'التنظيم الذاتي',
  'situation-adaptation': 'التكيف مع الموقف',
  'situation-response': 'الاستجابة للموقف',
  'space-awareness': 'الوعي بفضاء الممارسة',
  'space-orientation': 'التوجه في الفضاء',
  'space-safety': 'السلامة في الفضاء',
  'speed-adaptation': 'التكيف مع السرعة',
  'stride-awareness': 'الوعي بخطوات الجري',
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
      const bank = getObjectiveBank(level.levelId, field.fieldId);
      const resources = getObjectiveBankResources(level.levelId, field.fieldId);
      const sessionByText = new Map(
        field.sessionsList.map((session) => [normalize(session.objective), session])
      );
      bank.forEach((objective) => {
        const matchingKnowledgeItem = items.find(
          (item) =>
            item.category === 'objective' &&
            (item.objectiveId === objective.id ||
              (normalize(item.description || item.title) === normalize(objective.objectiveText) &&
                (item.levelIds?.includes(level.levelId) || item.levelId === level.levelId) &&
                item.fieldId === field.fieldId))
        );
        const session = sessionByText.get(normalize(objective.objectiveText));
        const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
        const objectiveResourceRows = objective.curriculumResourceIds
          .map((resourceId) => resourceById.get(resourceId))
          .filter((resource): resource is (typeof resources)[number] => Boolean(resource));
        const transversalResources = objective.transversalResourceIds.map((id) => {
          const slug = id.split(':').pop() || id;
          return TRANSVERSAL_RESOURCE_LABELS[slug] || slug.replace(/-/g, ' ');
        });
        references.push({
          id: objective.id,
          canonicalObjectiveId: objective.id,
          category: 'objective',
          title: objective.objectiveText,
          description: objective.objectiveText,
          objectiveText: objective.objectiveText,
          origin: 'CURRICULUM_REFERENCE',
          approvalStatus: 'APPROVED',
          approved: true,
          createdBy: 'بنك الأهداف المعتمد داخل المنصة',
          fieldId: field.fieldId,
          fieldName:
            FIELD_NAMES[field.fieldId] || field.fieldName.replace(/^الميدان \S+[:：]\s*/, ''),
          levelId: level.levelId,
          gradeId: level.levelId,
          domainId: field.fieldId,
          levelName: level.levelName,
          tags: [...objective.tags],
          usageCount: matchingKnowledgeItem?.usageCount || 0,
          rating: matchingKnowledgeItem?.rating || 0,
          curriculumResourceIds: [...objective.curriculumResourceIds],
          resourceLabels: objectiveResourceRows.map((resource) => resource.label),
          resourceFamilies: objectiveResourceRows.map((resource) => resource.family),
          transversalResourceIds: [...objective.transversalResourceIds],
          transversalResources,
          competencyComponentIds: [...objective.competencyComponentIds],
          learningContent: objective.learningContent,
          mobilizedKnowledge: objective.mobilizedKnowledge,
          executionContent: objective.executionContent,
          guidance: objective.guidance,
          progressionStage: objective.progressionStage,
          sequenceWeight: objective.sequenceWeight,
          finalCompetency: field.finalCompetency,
          learningSection: session
            ? `${field.fieldName} — الحصة ${session.sessionNumber}`
            : undefined,
          adoptedInCurrentSection: Boolean(session),
          usageStatus: session ? 'adopted' : 'unused',
        });
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
        (s) => isAutoGenerationEligible(s) && s.grade === grade && s.fieldId === field.id
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
  const canonical = buildCurriculumObjectiveReferences(knowledgeItems);
  const canonicalKeys = new Set(
    canonical.map((item) => `${item.levelId}|${item.fieldId}|${normalize(item.description)}`)
  );
  const alternatives = knowledgeItems.filter((item) => {
    if (!item.approved || item.category !== 'objective') return false;
    const levels = item.levelIds?.length ? item.levelIds : item.levelId ? [item.levelId] : [];
    return !levels.some((levelId) =>
      canonicalKeys.has(
        `${levelId}|${item.fieldId || ''}|${normalize(item.description || item.title)}`
      )
    );
  });
  return [...canonical, ...alternatives];
}
