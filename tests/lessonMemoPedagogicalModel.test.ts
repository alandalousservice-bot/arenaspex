import { describe, expect, it } from 'vitest';
import {
  autoGenerateLessonPlan,
  lessonDurationForLevel,
} from '../src/services/lessonPlan.generator.service';
import { referenceSituations } from '../src/services/educationalSituation.selector.service';

const source = {
  fieldId: referenceSituations[0].fieldId,
  fieldName: referenceSituations[0].fieldName,
  finalCompetency: 'ينجز المتعلم تنقلات حركية آمنة ومنظمة.',
  segmentGoal: 'التحكم في التنقل وتغيير الاتجاه.',
  sessionNumber: 1,
  globalNumber: 1,
  weekNumber: 1,
  type: 'تعلمية' as const,
  typeLabel: 'حصة تعلمية رقم 01',
  objective: referenceSituations[0].objectiveTexts[0],
  tools: ['مخاريط', 'أطواق'],
};

describe('pedagogical lesson memo generation', () => {
  it('preserves curriculum objective, competency, and executable phases', () => {
    const plan = autoGenerateLessonPlan(source, { levelName: 'السنة الأولى ابتدائي' });
    const rows = plan.lessonRows || [];

    expect(plan.sessionTitle).toBe(source.objective);
    expect(plan.generalObjective).toBe(source.objective);
    expect(plan.competencyTitle).toBe(source.finalCompetency);
    expect(rows[0].phase).toBe('المرحلة التحضيرية');
    expect(rows.some((row) => row.phase === 'المرحلة الرئيسية')).toBe(true);
    expect(rows.at(-1)?.phase).toBe('المرحلة الختامية');
    expect(rows.find((row) => row.phase === 'المرحلة الرئيسية')?.executionContent).toMatch(
      /ينتشر|ينطلق|يرسم|إشارة|يمشي|يجري|يجلس|الجري/
    );
    expect(rows[0].executionContent).toContain('إحماء');
    expect(rows.at(-1)?.executionContent).toContain('يمشي');
  });

  it('aggregates unique equipment and totals the level duration', () => {
    const plan = autoGenerateLessonPlan(
      { ...source, tools: ['مخاريط', 'مخاريط', 'أطواق'] },
      { levelName: 'السنة الأولى ابتدائي' }
    );

    expect(plan.equipmentNeeded).toEqual([...new Set(plan.equipmentNeeded)]);
    expect(plan.equipmentNeeded).toEqual(expect.arrayContaining(['مخاريط', 'أطواق']));
    expect(plan.lessonRows?.reduce((total, row) => total + row.durationMinutes, 0)).toBe(
      lessonDurationForLevel('السنة الأولى ابتدائي')
    );
  });

  it('supports multiple selected situations and does not fabricate optional profile data', () => {
    const objective = 'يربط سلسلة من التنقلات ويغير الاتجاه.';
    const situations = referenceSituations.slice(0, 2).map((item) => ({
      ...item,
      grade: 1,
      fieldId: source.fieldId,
      objectiveTexts: [objective],
    }));
    const plan = autoGenerateLessonPlan(
      { ...source, objective },
      { levelName: 'السنة الرابعة ابتدائي', situations }
    );
    const mainRows = plan.lessonRows?.filter((row) => row.phase === 'المرحلة الرئيسية') || [];

    expect(mainRows.length).toBeGreaterThan(1);
    expect(plan.institutionName).toBe('');
    expect(plan.teacherName).toBe('');
  });

  it('keeps selected resource content in an isolated memo snapshot', () => {
    const situation = referenceSituations[0];
    const plan = autoGenerateLessonPlan(source, {
      levelName: 'السنة الأولى ابتدائي',
      situations: [situation],
    });
    const row = plan.lessonRows?.find((item) => item.situationSnapshot);

    expect(row?.situationSnapshot).toBeDefined();
    expect(row?.situationSnapshot?.equipment).not.toBe(situation.equipment);
    row!.situationSnapshot!.equipment.push('اختبار');
    row!.situationSnapshot!.organization = 'نسخة المذكرة';
    expect(situation.equipment).not.toContain('اختبار');
    expect(situation.organization).not.toBe('نسخة المذكرة');
    expect(plan.aiGenerated).toBe(false);
  });
});
