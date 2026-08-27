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
      'ينطلق'
    );
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
    expect(rows.map((row) => row.content).join('\n')).toContain('ينطلق');
    const documentModel = JSON.stringify(buildLessonPlanDocx(plan));
    expect(documentModel).toContain('كفاءة ختامية محفوظة');
    expect(documentModel).toContain('الموقف 01');
    expect(documentModel).toContain('المرحلة الختامية');
  });
});
