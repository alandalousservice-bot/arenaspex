import type { AnnualPlanDomain, AnnualPlanLevel } from '../data/annualPlanReference';

export interface TransversalResourceGroup {
  label: string;
  items: string[];
}

export interface EvaluationCriterion {
  criterion: string;
  indicators: string[];
}

export interface AnnualPlanDomainPresentation {
  domainId: string;
  domainLabel: string;
  competency: string;
  components: string[];
  knowledgeResources: string[];
  transversalResources: TransversalResourceGroup[];
  evaluationCriteria: EvaluationCriterion[];
  time: string;
  allocatedHours?: number;
}

export interface AnnualPlanGradePresentation {
  grade: number;
  gradeLabel: string;
  overallCompetency: string;
  domains: AnnualPlanDomainPresentation[];
}

const GROUP_LABELS = ['فكري', 'منهجي', 'تواصلي', 'شخصي/اجتماعي', 'شخصي / اجتماعي'];

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—]\s*/g, ' ')
    .trim();
}

function splitItems(value: string): string[] {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .split(/\n|(?=\*)|(?=\s-\s)|(?=؛)/)
    .map((item) => cleanText(item.replace(/^\s*[*)•-]\s*/, '')))
    .filter(Boolean);
}

function parseTransversalResources(value: string): TransversalResourceGroup[] {
  const source = value.replace(/<br\s*\/?\s*>/gi, '\n');
  const groups: TransversalResourceGroup[] = [];
  const pattern = new RegExp(`(?:^|[\\n*])\\s*(${GROUP_LABELS.join('|')})\\s*:?`, 'gi');
  const matches = [...source.matchAll(pattern)];
  matches.forEach((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index || source.length;
    const label = match[1].replace(/\s+/g, ' ').trim();
    groups.push({ label, items: splitItems(source.slice(start, end)) });
  });
  return groups.length ? groups : [{ label: 'موارد عرضية', items: splitItems(source) }];
}

function parseEvaluationCriteria(value: string): EvaluationCriterion[] {
  const source = cleanText(value);
  const chunks = source.split(/(?=المعيار\s*\d+)/g).filter(Boolean);
  return chunks.map((chunk, index) => {
    const indicatorIndex = chunk.search(/المؤشرات?\s*:?/);
    const criterion = cleanText(
      (indicatorIndex >= 0 ? chunk.slice(0, indicatorIndex) : chunk).replace(
        /^المعيار\s*\d+\s*:?\s*/,
        ''
      )
    );
    const indicators = indicatorIndex >= 0 ? splitItems(chunk.slice(indicatorIndex)) : [];
    return { criterion: criterion || `المعيار ${index + 1}`, indicators };
  });
}

function parseHours(value: string): number | undefined {
  const match = value.match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : undefined;
}

export function buildAnnualPlanPresentation(
  level: AnnualPlanLevel,
  display: (domain: AnnualPlanDomain) => AnnualPlanDomainPresentation
): AnnualPlanGradePresentation {
  const gradeMatch = level.levelId.match(/(\d+)/);
  return {
    grade: gradeMatch ? Number(gradeMatch[1]) : 0,
    gradeLabel: level.levelName,
    overallCompetency: level.comprehensive,
    domains: level.domains.map(display),
  };
}

export function buildDomainPresentation(domain: AnnualPlanDomain): AnnualPlanDomainPresentation {
  return {
    domainId: domain.fieldId,
    domainLabel: domain.fieldName,
    competency: domain.finalCompetency,
    components: splitItems(domain.components),
    knowledgeResources: splitItems(domain.knowledgeResources),
    transversalResources: parseTransversalResources(domain.transversalResources),
    evaluationCriteria: parseEvaluationCriteria(domain.evaluationCriteria),
    time: domain.time,
    allocatedHours: parseHours(domain.time),
  };
}
