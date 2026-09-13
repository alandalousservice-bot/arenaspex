import { describe, expect, it } from 'vitest';
import {
  autoGenerateLessonPlan,
  generateLessonMemoDocument,
} from '../src/services/lessonPlan.generator.service';
import { renderLessonMemoHtml } from '../src/services/lessonPlanExport.service';
import { buildLessonPlanDocx } from '../src/services/lessonPlanWordExport.service';

const situations = [
  {
    id: 'g4-export-situation-1',
    name: 'مسار التوازن',
    grade: 4,
    fieldId: 'f_locomotion',
    fieldName: 'الميدان الأول',
    objectiveIds: ['g4-export-objective'],
    objectiveTexts: ['ينجز مسارًا حركيًا منظمًا.'],
    sourceGoal: 'ينجز مسارًا حركيًا منظمًا.',
    organization: 'أفواج متوازية.',
    equipment: ['أقماع', 'أطواق'],
    origin: 'REFERENCE_SEED' as const,
    status: 'APPROVED' as const,
    productionEligibility: 'AUTO_GENERATION_ELIGIBLE' as const,
  },
  {
    id: 'g4-export-situation-2',
    name: 'تبديل الاتجاه',
    grade: 4,
    fieldId: 'f_locomotion',
    fieldName: 'الميدان الأول',
    objectiveIds: ['g4-export-objective'],
    objectiveTexts: ['ينجز مسارًا حركيًا منظمًا.'],
    sourceGoal: 'ينجز مسارًا حركيًا منظمًا.',
    organization: 'تبديل منظم عند الإشارة.',
    equipment: ['أقماع'],
    origin: 'REFERENCE_SEED' as const,
    status: 'APPROVED' as const,
    productionEligibility: 'AUTO_GENERATION_ELIGIBLE' as const,
  },
];

function generatedPlan(durationMinutes: number, levelName: string, mode?: 'TWO_45' | 'ONE_90') {
  const grade = levelName.includes('الخامسة') ? 5 : 4;
  const plan = autoGenerateLessonPlan(
    {
      referenceSessionId: `g4-export-${durationMinutes}`,
      fieldId: 'f_locomotion',
      fieldName: 'الميدان الأول: الوضعيات والتنقلات',
      finalCompetency: 'ينجز وضعيات حركية منظمة.',
      segmentGoal: 'ينجز مسارًا حركيًا منظمًا.',
      sessionNumber: 1,
      globalNumber: 8,
      weekNumber: 4,
      type: 'تعلمية',
      typeLabel: 'تعلمية 1',
      objective: 'ينجز مسارًا حركيًا منظمًا.',
      objectiveId: 'g4-export-objective',
      tools: ['أقماع', 'أطواق'],
    },
    {
      levelName,
      durationMinutes,
      grade4WeeklyScheduleMode: mode,
      situations: situations.map((situation) => ({ ...situation, grade })),
      teacher: {
        id: 'g4-export-teacher',
        username: 'g4-export-teacher',
        spexId: 'SPX-G4-EXPORT',
        firstName: 'أستاذ',
        lastName: 'اختبار',
        email: 'g4-export@example.test',
        role: 'teacher',
        directorateId: '',
        districtId: '',
        status: 'active',
      },
    }
  );
  return plan;
}

function exportedHtml(durationMinutes: number, levelName: string, mode?: 'TWO_45' | 'ONE_90') {
  return renderLessonMemoHtml(
    generateLessonMemoDocument(generatedPlan(durationMinutes, levelName, mode))
  );
}

describe('MEMO-G4 existing print/export compatibility', () => {
  it('keeps the existing A4 landscape RTL export contract and all memo content', () => {
    const html = exportedHtml(45, 'السنة الرابعة ابتدائي', 'TWO_45');
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('@page{size:A4 landscape');
    expect(html).toContain('المؤسسة');
    expect(html).toContain('السنة الرابعة ابتدائي');
    expect(html).toContain('ينجز وضعيات حركية منظمة.');
    expect(html).toContain('المرحلة التحضيرية');
    expect(html).toContain('المرحلة الرئيسية');
    expect(html).toContain('المرحلة الختامية');
    expect(html).toContain('محتوى التعلم');
    expect(html).toContain('محتوى الإنجاز');
    expect(html).toContain('45 دقيقة');
    expect(html).toContain('أقماع');
    expect(html).toContain('الموقف 01');
  });

  it('exports one Grade 4 ONE_90 memo without duplicated preparation/final sections', () => {
    const html = exportedHtml(90, 'السنة الرابعة ابتدائي', 'ONE_90');
    expect(html).toContain('90 دقيقة');
    expect((html.match(/المرحلة التحضيرية/g) || []).length).toBe(1);
    expect((html.match(/المرحلة الختامية/g) || []).length).toBe(1);
    expect((html.match(/class="phase-main"/g) || []).length).toBe(1);
  });

  it('exports a Grade 5 60-minute memo and does not duplicate snapshot rows', () => {
    const html = exportedHtml(60, 'السنة الخامسة ابتدائي');
    expect(html).toContain('السنة الخامسة ابتدائي');
    expect(html).toContain('60 دقيقة');
    expect((html.match(/class="execution situation/g) || []).length).toBe(2);
    expect((html.match(/الموقف 01/g) || []).length).toBe(1);
    expect((html.match(/الموقف 02/g) || []).length).toBe(1);
  });

  it('feeds the same 45/90/60-minute normalized model to Word export', () => {
    for (const [durationMinutes, levelName, mode] of [
      [45, 'السنة الرابعة ابتدائي', 'TWO_45'],
      [90, 'السنة الرابعة ابتدائي', 'ONE_90'],
      [60, 'السنة الخامسة ابتدائي', undefined],
    ] as const) {
      const plan = generatedPlan(durationMinutes, levelName, mode);
      expect(generateLessonMemoDocument(plan).header.durationMinutes).toBe(durationMinutes);
      expect(buildLessonPlanDocx(plan)).toBeTruthy();
    }
  });
});
