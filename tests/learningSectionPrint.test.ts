import fs from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { COMPLETE_ANNUAL_CURRICULUM } from '../src/data/algerianCurriculum';
import { getDomainOneLearningSectionReference } from '../src/data/domainOneLearningSectionReference';
import { LearningSectionPrintDocument } from '../src/components/curriculum/LearningSectionPrintDocument';
import {
  addTeacherLearningIntegration,
  addTeacherLearningObjective,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { mapLearningSectionForPrint } from '../src/services/learningSectionPrint.service';

const read = (path: string) => fs.readFileSync(path, 'utf8');

function printModel(objectiveCount = 7) {
  let plan = seedTeacherLearningPlan('lvl_p1');
  while (plan.domains[0].objectives.length < objectiveCount) {
    plan = addTeacherLearningObjective(
      plan,
      'f_locomotion',
      `هدف الأستاذ ${plan.domains[0].objectives.length + 1}`
    );
  }
  const firstObjective = plan.domains[0].objectives[0];
  plan = addTeacherLearningIntegration(plan, 'f_locomotion', firstObjective.id, {
    objective: 'إدماجية مخصصة',
    learningContent: 'محتوى إدماجي',
    resources: ['كرات'],
    situations: [
      {
        situationId: 'S-1',
        name: 'لعبة التوازن',
        organization: 'مجموعات',
        equipment: ['كرات'],
      },
    ],
  });
  const field = COMPLETE_ANNUAL_CURRICULUM.lvl_p1.fields.f_locomotion;
  return mapLearningSectionForPrint({
    field,
    domain: plan.domains[0] as Parameters<typeof mapLearningSectionForPrint>[0]['domain'],
    level: COMPLETE_ANNUAL_CURRICULUM.lvl_p1.levelName,
    levelId: 'lvl_p1',
    currentUser: {
      firstName: 'أستاذ',
      lastName: 'المادة',
      schoolName: 'مدرسة الاختبار',
    },
    academicYearId: '2026-2027',
  });
}

describe('official Learning Section print mapper', () => {
  it('maps the official header and competencies without Annual Plan criteria or indicators', () => {
    const model = printModel();
    expect(model.header).toMatchObject({
      institution: 'مدرسة الاختبار',
      teacher: 'أستاذ المادة',
      academicYear: '2026-2027',
      level: 'السنة الأولى ابتدائي',
      domain: 'الميدان الأول: الوضعيات والتنقلات',
    });
    expect(model).not.toHaveProperty('overallCompetency');
    expect(model.finalCompetency).toBe(
      getDomainOneLearningSectionReference('lvl_p1', 'f_locomotion')?.finalCompetency
    );
    expect(model).not.toHaveProperty('criteria');
    expect(model).not.toHaveProperty('indicators');
    expect(COMPLETE_ANNUAL_CURRICULUM.lvl_p1.fields.f_locomotion.criteria.length).toBeGreaterThan(
      0
    );
    expect(COMPLETE_ANNUAL_CURRICULUM.lvl_p1.fields.f_locomotion.indicators.length).toBeGreaterThan(
      0
    );
  });

  it.each([7, 8, 9, 10])('preserves a dynamic %s-objective plan in order', (count) => {
    const model = printModel(count);
    const learningRows = model.rows.filter((row) => row.kind === 'objective');
    expect(learningRows).toHaveLength(count);
    expect(learningRows.map((row) => row.label)).toEqual(
      Array.from({ length: count }, (_, index) => `حصة تعلمية ${index + 1}`)
    );
  });

  it('keeps diagnostic first, configured integrations in place, and summative last', () => {
    const model = printModel();
    expect(model.rows[0]).toMatchObject({ kind: 'diagnostic', label: 'تقويم تشخيصي' });
    expect(model.rows[2]).toMatchObject({ kind: 'integration', label: 'حصة إدماجية 1' });
    expect(model.rows.at(-1)).toMatchObject({ kind: 'summative', label: 'تقويم تحصيلي' });
    expect(model.rows.some((row) => row.label.includes('1/2'))).toBe(false);
    expect(model.rows.some((row) => row.label.includes('2/2'))).toBe(false);
  });

  it('prints teacher fields and situation titles without IDs or empty sentinels', () => {
    const model = printModel();
    const integration = model.rows.find((row) => row.kind === 'integration');
    expect(integration?.situationsAndResources).toContain('كرات');
    expect(integration?.situationsAndResources).toContain('موقف: لعبة التوازن');
    expect(integration?.situationsAndResources).not.toContain('S-1');
    expect(integration?.objective).toBe('إدماجية مخصصة');
    expect(JSON.stringify(model)).not.toContain('teacher-objective:');
    expect(JSON.stringify(model)).not.toContain('undefined');
    expect(JSON.stringify(model)).not.toContain('null');
    expect(JSON.stringify(model)).not.toContain('[]');
  });

  it('prints seeded Domain 1 pedagogy and keeps genuinely optional cells free of sentinels', () => {
    const model = printModel();
    const objective = model.rows.find((row) => row.kind === 'objective');
    const diagnostic = model.rows.find((row) => row.kind === 'diagnostic');
    expect(objective?.components).toContain('يتعرف على مختلف الوضعيات');
    expect(objective?.learningContent).toContain('الوضعيات الطبيعية');
    expect(objective?.executionContent).toContain('اتخاذ وضعيات جسمية');
    expect(objective?.knowledge).toContain('الوقوف والجلوس');
    expect(objective?.guidance).toContain('السلامة');
    expect(diagnostic?.components).toContain('يتعرف على مختلف الوضعيات');
    expect(diagnostic?.learningContent).toContain('الوضعيات الطبيعية');
  });

  it('uses a dedicated document with no interactive controls or technical columns', () => {
    const document = read('src/components/curriculum/LearningSectionPrintDocument.tsx');
    const css = read('src/index.css');
    const model = printModel();
    const markup = renderToStaticMarkup(createElement(LearningSectionPrintDocument, { model }));
    const learningPrintCss = css.slice(css.lastIndexOf('@media print'));
    expect(document).toContain('learning-section-print-root');
    expect(document).toContain('المواقف التربوية / الموارد');
    expect(document).toContain('مركبات الكفاءة');
    expect(document).toContain('المعارف المجندة');
    expect(document).not.toContain('معايير تحقيق الكفاءة');
    expect(document).not.toContain('مؤشرات تحقيق الكفاءة');
    expect(css).not.toContain('learning-section-print-support');
    expect(document).not.toContain('onClick');
    expect(document).not.toContain('technical');
    expect(css).toContain('@page learning-section');
    expect(css).toContain('size: A4 landscape');
    expect(css).toContain('display: none !important');
    expect(css).toContain('height: auto');
    expect(css).toContain('min-height: 0');
    expect(css).toContain('max-height: none');
    expect(css).toContain('overflow: visible');
    expect(css).toContain('transform: none');
    expect(css).toContain('table-header-group');
    expect(css).toContain('print-color-adjust: exact');
    expect(markup).toContain('learning-section-print-root');
    expect(markup).toContain('المؤسسة');
    expect(markup).toContain('الكفاءة الختامية');
    expect(markup).toContain('نوع الحصة');
    expect(markup).toContain('التوجيهات');
    expect(markup).toContain('الأستاذ: أستاذ المادة');
    expect(markup).not.toContain('الكفاءة الشاملة');
    expect(markup).not.toContain('المعايير');
    expect(markup).not.toContain('المؤشرات');
    expect(learningPrintCss).toContain('position: static');
    expect(learningPrintCss).toContain('width: 297mm');
    expect(learningPrintCss).toContain('min-height: 210mm');
    expect(learningPrintCss).toContain('display: block !important');
    expect(learningPrintCss).not.toContain('position: absolute');
    expect(learningPrintCss).not.toContain('page-break-before: always');
    expect(learningPrintCss).toContain('break-before: auto');
    expect(learningPrintCss).toContain('break-inside: avoid');
  });
});
