import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  autoGenerateLessonPlan,
  generateLessonMemoDocument,
} from '../src/services/lessonPlan.generator.service';
import {
  buildLessonPlanDocx,
  renderLessonMemoHtml,
} from '../src/services/lessonPlanExport.service';

const view = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
const exportService = readFileSync('src/services/lessonPlanExport.service.ts', 'utf8');
const objective = 'التعرف على وضعيات الجسم الأساسية والتنقل في اتجاهات مختلفة.';
const situations = [
  {
    id: 'observed-01',
    name: 'المسار المتعرج',
    grade: 1,
    fieldId: 'f_locomotion',
    fieldName: 'الميدان الأول: الوضعيات والتنقلات',
    objectiveIds: ['observed-objective'],
    objectiveTexts: [objective],
    sourceGoal: objective,
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
    objectiveTexts: [objective],
    sourceGoal: objective,
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
  { levelName: 'السنة الأولى ابتدائي', durationMinutes: 60, inspectorName: 'مفتش فعلي' }
);

describe('rebuilt lesson memo pipeline', () => {
  it('builds a typed five-column document with one shared main learning cell', () => {
    const document = generateLessonMemoDocument({
      ...autoGenerateLessonPlan(
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
          objective,
          tools: ['أقماع'],
        },
        { levelName: 'السنة الأولى ابتدائي', durationMinutes: 60, situations }
      ),
      inspectorName: 'مفتش فعلي',
    });

    expect(document.header).toMatchObject({
      grade: 'السنة الأولى ابتدائي',
      field: 'الميدان الأول: الوضعيات والتنقلات',
      competency: 'ينجز تنقلات آمنة ومنظمة.',
      objective,
      sessionNumber: '1',
      durationMinutes: 60,
    });
    expect(document.header.equipment).toEqual(['أقماع', 'أطواق']);
    expect(document.mainPhase.situations).toHaveLength(2);
    expect(document.mainPhase.situations.map((s) => s.number)).toEqual([1, 2]);
    expect(document.mainPhase.learningContent).toBe('المسار المتعرج، تبديل الاتجاه');
    expect(document.mainPhase.totalDurationMinutes).toBe(40);
    expect(document.totalDurationMinutes).toBe(60);
    expect(document.signatures.inspectorName).toBe('مفتش فعلي');
  });

  it('keeps learning, execution, duration, and guidance semantically separate', () => {
    const document = generateLessonMemoDocument(
      autoGenerateLessonPlan(
        {
          fieldId: 'f_locomotion',
          fieldName: 'الميدان البدني',
          finalCompetency: 'كفاءة',
          segmentGoal: 'مقطع',
          sessionNumber: 1,
          globalNumber: 8,
          weekNumber: 4,
          type: 'تعلمية',
          typeLabel: 'تعلمية رقم 01',
          objective,
          tools: ['أقماع'],
        },
        { levelName: 'السنة الأولى ابتدائي', durationMinutes: 60, situations }
      )
    );
    const first = document.mainPhase.situations[0];
    expect(document.header.objective).toBe(objective);
    expect(first.executionContent).not.toContain(objective);
    expect(document.mainPhase.learningContent).not.toContain(objective);
    expect(first.executionContent).not.toBe(document.mainPhase.learningContent);
    expect(first.guidance).not.toBe(first.executionContent);
    expect(first.executionContent).toContain('ينطلق');
  });

  it('feeds the same document into screen, print/PDF HTML, and Word', () => {
    expect(view).toContain('generateLessonMemoDocument');
    expect(view).toContain('محتوى التعلم');
    expect(view).toContain('محتوى الإنجاز');
    expect(exportService).toContain('renderLessonMemoHtml');
    expect(exportService).toContain('A4 landscape');
    expect(exportService).toContain('#1e293b');
    expect(exportService).toContain('#fed7aa');
    expect(exportService).toContain('#dcfce7');
    expect(view).toContain('gap-2 p-3');
    expect(exportService).toContain('compactPrintCss');
    expect(exportService).toContain('.meta{gap:5px;margin:8px 0}');
    const document = generateLessonMemoDocument(plan);
    const html = renderLessonMemoHtml(document);
    expect(html).toContain('مذكرة حصة تعلمية');
    expect(html).toContain('الحصة 8');
    expect(html).toContain('60 دقيقة');
    expect(html).not.toContain('<strong>المدة</strong>');
    expect(html).not.toContain('<strong>الحصة</strong>');
    expect(view).not.toContain("['المدة', memoModel.header.durationMinutes");
    expect(view).not.toContain("['الحصة', memoModel.header.sessionNumber");
    expect(exportService).not.toContain("['المدة', `${model.header.durationMinutes}");
    expect(exportService).not.toContain("['الحصة', model.header.sessionNumber");
    expect(generateLessonMemoDocument(plan).header.durationMinutes).toBe(60);
    expect(generateLessonMemoDocument(plan).header.sessionNumber).toBe('8');
    expect(html).toContain('الموقف 01');
    expect(html).toContain('المفتش: مفتش فعلي');
    expect(JSON.stringify(buildLessonPlanDocx(plan))).toContain('محتوى الإنجاز');
  });
});
