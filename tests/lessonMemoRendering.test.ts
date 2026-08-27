import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  autoGenerateLessonPlan,
  getLessonMemoDisplayRows,
  getUnifiedLessonRows,
} from '../src/services/lessonPlan.generator.service';
import { buildLessonPlanDocx } from '../src/services/lessonPlanExport.service';

const view = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
const exportService = readFileSync('src/services/lessonPlanExport.service.ts', 'utf8');
const observedObjective = 'التعرف على وضعيات الجسم الأساسية والتنقل في اتجاهات مختلفة.';
const observedSituations = [
  {
    id: 'observed-01',
    name: 'المسار المتعرج',
    grade: 1,
    fieldId: 'f_locomotion',
    fieldName: 'الميدان الأول: الوضعيات والتنقلات',
    objectiveIds: ['observed-objective'],
    objectiveTexts: [observedObjective],
    sourceGoal: observedObjective,
    organization: 'ينطلق متعلم من كل فوج عند إشارة الأستاذ ويمر بين الأقماع ثم يعود إلى مكانه.',
    equipment: ['أقماع'],
    origin: 'TEACHER' as const,
    status: 'APPROVED' as const,
  },
  {
    id: 'observed-02',
    name: 'تبديل الاتجاه',
    grade: 1,
    fieldId: 'f_locomotion',
    fieldName: 'الميدان الأول: الوضعيات والتنقلات',
    objectiveIds: ['observed-objective'],
    objectiveTexts: [observedObjective],
    sourceGoal: observedObjective,
    organization: 'يتنقل المتعلمون في أفواج ويغيرون الاتجاه عند سماع الصافرة مع احترام المسافة.',
    equipment: ['أقماع', 'أطواق'],
    origin: 'TEACHER' as const,
    status: 'APPROVED' as const,
  },
];

const plan = autoGenerateLessonPlan(
  {
    fieldId: 'f_locomotion',
    fieldName: 'الميدان البدني',
    finalCompetency: 'كفاءة ختامية محفوظة',
    segmentGoal: 'هدف المقطع',
    sessionNumber: 1,
    globalNumber: 8,
    weekNumber: 4,
    type: 'تعلمية',
    typeLabel: 'تعلمية رقم 01',
    objective: 'ينطلق ويغير الاتجاه داخل مسار منظم.',
    tools: ['أقماع'],
  },
  { levelName: 'السنة الأولى ابتدائي', durationMinutes: 60 }
);

describe('active lesson memo rendering path', () => {
  it('renders generated lessonRows through the approved four-column model', () => {
    const rows = getLessonMemoDisplayRows(getUnifiedLessonRows(plan));

    expect(view).toContain('getLessonMemoDisplayRows');
    expect(view).toContain('محتوى التعلم والإنجاز');
    expect(rows[0].phaseLabel).toBe('المرحلة التحضيرية');
    expect(rows.filter((row) => row.source.phase === 'المرحلة الرئيسية')).not.toHaveLength(0);
    expect(rows.at(-1)?.phaseLabel).toBe('المرحلة الختامية');
    expect(rows.filter((row) => row.source.phase === 'المرحلة الرئيسية')[0].content).toContain(
      'إشارة الانطلاق'
    );
  });

  it('keeps the observed Grade 1 objective in the header only', () => {
    const observedPlan = autoGenerateLessonPlan(
      {
        fieldId: 'f_locomotion',
        fieldName: 'الميدان الأول: الوضعيات والتنقلات',
        finalCompetency: 'ينجز تنقلات آمنة ومنظمة.',
        segmentGoal: 'تنقلات مختلفة',
        sessionNumber: 1,
        globalNumber: 1,
        weekNumber: 1,
        type: 'تعلمية',
        typeLabel: 'تعلمية رقم 01',
        objective: observedObjective,
        tools: ['أقماع'],
      },
      { levelName: 'السنة الأولى ابتدائي', durationMinutes: 60, situations: observedSituations }
    );
    const rows = getLessonMemoDisplayRows(getUnifiedLessonRows(observedPlan));
    const situationText = rows
      .filter((row) => row.phaseLabel.startsWith('الموقف'))
      .map((row) => row.content)
      .join('\n');

    expect(observedPlan.sessionTitle).toBe(observedObjective);
    expect(situationText).not.toContain(observedObjective);
    expect(rows.map((row) => row.phaseLabel)).toEqual([
      'المرحلة التحضيرية',
      'الموقف 01',
      'الموقف 02',
      'المرحلة الختامية',
    ]);
  });

  it('uses the same snapshot mapper for Word/PDF export with dynamic situation labels', () => {
    expect(exportService).toContain('getLessonMemoDisplayRows(getUnifiedLessonRows(plan))');
    expect(exportService).toContain('محتوى التعلم والإنجاز');
    const rows = getLessonMemoDisplayRows(getUnifiedLessonRows(plan));
    expect(rows.map((row) => row.phaseLabel)).toEqual([
      'المرحلة التحضيرية',
      'الموقف 01',
      'المرحلة الختامية',
    ]);
    expect(rows.map((row) => row.content).join('\n')).toContain('إشارة الانطلاق');
    const documentModel = JSON.stringify(buildLessonPlanDocx(plan));
    expect(documentModel).toContain('كفاءة ختامية محفوظة');
    expect(documentModel).toContain('الموقف 01');
    expect(documentModel).toContain('المرحلة الختامية');
  });
});
